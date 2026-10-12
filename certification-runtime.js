import { Events, PermissionFlagsBits } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationRouter } from './certification-router.js';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';

export function attachCertificationRuntime(client, _pool, guildId, env = process.env, { createPool = createCertificationDatabasePool } = {}) {
  const config = loadCertificationConfig(env);
  if (!config.enabled) return { enabled: false, detach() {} };
  const database = createPool(loadCertificationDatabaseConnection(env));
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

  async function handleInteraction(interaction) {
    try {
      if (!ready) {
        await interaction.reply({ content: 'Certification is temporarily unavailable pending startup checks.', flags: 64 });
        return;
      }
      await route(interaction);
    } catch (error) {
      console.error('Certification interaction failed:', { name: error?.name, code: error?.code });
      const payload = { content: 'Certification action failed. Refresh the dashboard before retrying.', components: [], embeds: [], allowedMentions: { parse: [] } };
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload).catch(() => {});
      else await interaction.reply({ ...payload, flags: 64 }).catch(() => {});
    }
  }

  function onInteraction(interaction) {
    if (detached || !(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId?.startsWith('cert:')) return;
    const task = handleInteraction(interaction); active.add(task);
    void task.finally(() => active.delete(task)).catch(error => {
      console.error('Certification reply failed:', { name: error?.name, code: error?.code });
    });
  }

  client.on(Events.InteractionCreate, onInteraction);
  client.once(Events.ClientReady, initialize);
  if (client.isReady()) void initialize();
  return { enabled: true, get ready() { return ready; },
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
