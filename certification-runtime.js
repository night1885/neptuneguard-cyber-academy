import { Events, PermissionFlagsBits } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';
import { createCertificationService } from './certification-service.js';
import { replyRetentionHold } from './certification-retention-hold.js';

export function attachCertificationRuntime(client, _pool, guildId, env = process.env, { createPool = createCertificationDatabasePool } = {}) {
  const config = loadCertificationConfig(env);
  if (!config.enabled) return { enabled: false, detach() {} };
  const database = createPool(loadCertificationDatabaseConnection(env));
  const service = createCertificationService(database, config);
  let route;
  try { route = createCertificationRouter(database, config, guildId); }
  catch (error) {
    void database.end().catch(() => {});
    throw error;
  }
  let ready = false; let detached = false; let initializing = null; let closing = null;
  const active = new Set();

  async function initialize() {
    if (detached) return;
    if (initializing) return initializing;
    initializing = (async () => {
      ready = false;
      await validateCertificationSchema(database);
      await validateActiveEnrollmentAgreement(database, config);
      const guild = await client.guilds.fetch(guildId);
      await guild.members.fetch(config.ownerId);
      const channel = await client.channels.fetch(config.adminChannelId);
      if (!channel || channel.guildId !== guildId || !channel.isTextBased() || typeof channel.send !== 'function') {
        throw new Error('Admin channel must be a message-capable channel in the configured guild');
      }
      const me = await guild.members.fetchMe();
      const permissions = channel.permissionsFor(me);
      if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        throw new Error('Bot lacks required admin-channel permissions');
      }
      if (channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)) {
        throw new Error('Admin channel is visible to everyone; restrict channel visibility before enabling');
      }
      if (!detached) {
        ready = true;
        console.log('Certification runtime checks passed; no migration or dashboard publication was performed.');
      }
    })();
    try { await initializing; }
    catch (error) {
      ready = false;
      console.error('Certification startup failed:', { name: error?.name, code: error?.code });
    } finally { initializing = null; }
  }

  async function getCourseAuthorization(studentDiscordId) {
    if (!ready || detached) return null;
    const task = service.getCourseAuthorization(studentDiscordId);
    active.add(task);
    try {
      const authorization = await task;
      return ready && !detached ? authorization : null;
    } finally { active.delete(task); }
  }

  async function handleInteraction(interaction) {
    try {
      await replyRetentionHold(interaction);
    } catch (error) {
      console.error('Certification hold reply failed:', { name: error?.name, code: error?.code });
    }
  }

  function onInteraction(interaction) {
    if (detached || !(interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu?.()) || !interaction.customId?.startsWith('cert:')) return;
    const task = handleInteraction(interaction); active.add(task);
    void task.finally(() => active.delete(task)).catch(error => {
      console.error('Certification reply failed:', { name: error?.name, code: error?.code });
    });
  }

  client.on(Events.InteractionCreate, onInteraction);
  client.once(Events.ClientReady, initialize);
  if (client.isReady()) void initialize();
  return { enabled: true, get ready() { return ready; }, getCourseAuthorization,
    detach() {
      detached = true; ready = false;
      client.off(Events.InteractionCreate, onInteraction);
      client.off(Events.ClientReady, initialize);
      if (!closing) closing = (async () => {
        await Promise.allSettled([...active, ...(initializing ? [initializing] : [])]);
        await database.end();
      })();
      return closing;
    }
  };
}
