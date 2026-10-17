import { Events, PermissionFlagsBits } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';
import { createCertificationService } from './certification-service.js';
import { replyRetentionHold } from './certification-retention-hold.js';

export function attachCertificationRuntime(client, _pool, guildId, env = process.env, { createPool = createCertificationDatabasePool, createRouter = createCertificationRouter } = {}) {
  const config = loadCertificationConfig(env);
  if (!config.enabled) return { enabled: false, detach() {} };
  const database = createPool(loadCertificationDatabaseConnection(env));
  const service = createCertificationService(database, config);
  let route;
  try { route = createRouter(database, config, guildId); }
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
    const respond = content => {
      const payload = { content, embeds: [], components: [], allowedMentions: { parse: [] } };
      return interaction.deferred || interaction.replied ? interaction.editReply(payload) : interaction.reply({ ...payload, flags: 64 });
    };
    try {
      if (!ready || detached) { await replyRetentionHold(interaction); return; }
      if (!await route(interaction)) await respond('This action is unavailable. Reopen the Admin Dashboard or your student panel.');
    } catch {
      console.error('Certification interaction failed.');
      try { await respond('This action could not be completed. Reopen the dashboard or student panel and check the current status before retrying.'); }
      catch { console.error('Certification error reply failed.'); }
    }
  }

  function onInteraction(interaction) {
    if (detached || !(interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu?.()) || !interaction.customId?.startsWith('cert:')) return;
    const task = handleInteraction(interaction); active.add(task);
    void task.finally(() => active.delete(task)).catch(() => {
      console.error('Certification reply failed.');
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
