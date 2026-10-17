import { Events, GatewayIntentBits, Options } from 'discord.js';
import { handleConsoleCourses } from './certification-console-courses.js';
import { createApplicationShutdown } from './certification-application-shutdown.js';

export function createInstructorClientOptions() {
  return { intents: [GatewayIntentBits.Guilds], makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings, UserManager: 0, GuildMemberManager: 0, MessageManager: 0,
    PresenceManager: 0, ReactionManager: 0, VoiceStateManager: 0
  }) };
}

export function createInstructorApplication({ client, guildId, adminId, signals = process,
  exit = code => process.exit(code), log = message => console.error(message), timeoutMs = 15000 } = {}) {
  const id = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
  if (!id(guildId) || !id(adminId)) throw new Error('Explicit valid instructor guild and admin IDs required');
  if (['on', 'off', 'login', 'destroy'].some(name => typeof client?.[name] !== 'function')) throw new Error('Invalid instructor client');
  if (typeof log !== 'function') throw new Error('Invalid instructor logger');
  const active = new Set(); let stopping = false, started = false, failed = false;
  const report = message => { try { log(message); } catch {} };
  const shutdown = createApplicationShutdown({ signals, timeoutMs, exit: code => exit(failed ? 1 : code), log: () => report('Instructor shutdown requires attention.'),
    stopAdmission() { stopping = true; client.off(Events.InteractionCreate, onInteraction); client.off(Events.Error, onError); },
    async drainAcademy() { await Promise.allSettled([...active]); }, async detachCertification() {}, async closeAcademyPool() {},
    destroyClient: () => client.destroy()
  });
  const home = () => ({ content: '', embeds: [{ author: { name: 'NeptuneGuard — Admin Dashboard' }, title: 'NeptuneGuard — Instructor curriculum', color: 0x3498db,
    description: 'Admin-only, read-only teaching material. No learner accounts, registration, permanent student IDs, saved progress, badges, or remembered learner approvals are provided by this mode. Course material is not lab authorization or a certificate award.' }],
    components: [{ type: 1, components: [{ type: 2, style: 1, custom_id: 'cert:admin:courses:0', label: 'Course Overview' }] }] });
  async function handle(interaction) {
    if (!(interaction.isChatInputCommand?.() || interaction.isButton?.() || interaction.isModalSubmit?.() || interaction.isStringSelectMenu?.())) return false;
    const privatePanel = () => interaction.isButton?.() && interaction.message?.flags?.has?.(64) === true;
    const respond = (payload, updatePanel = false) => {
      const safe = { content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } };
      if (interaction.deferred || interaction.replied) return interaction.editReply(safe);
      return updatePanel ? interaction.update(safe) : interaction.reply({ ...safe, flags: 64 });
    };
    try {
      if (interaction.guildId !== guildId || interaction.user?.id !== adminId) {
        await respond({ content: 'This instructor-only curriculum browser is restricted to the configured admin and server. Student self-service is unavailable.' }); return true;
      }
      if ((interaction.isChatInputCommand?.() && ['start', 'catalog'].includes(interaction.commandName)) ||
          (interaction.isButton?.() && interaction.customId === 'cert:admin:overview:0')) {
        await respond(home(), privatePanel()); return true;
      }
      if (interaction.isButton?.() && interaction.customId?.startsWith('cert:admin:courses:')) {
        // Adapt only authorized private panels; preserve the shared renderer's default reply behavior.
        const courseInteraction = privatePanel() ? {
          customId: interaction.customId, user: interaction.user, guildId: interaction.guildId,
          isButton: () => true, deferReply: () => interaction.deferUpdate(),
          editReply: payload => interaction.editReply(payload)
        } : interaction;
        return await handleConsoleCourses(courseInteraction, { enabled: true, ownerId: adminId }, guildId);
      }
      await respond({ content: 'This instructor-only release does not provide student registration, enrollment decisions, saved learner reports, progression, lab authorization, or certificate issuance. Use /start or /catalog to browse teaching material. Existing records have not been deleted.' });
      return true;
    } catch {
      report('Instructor interaction failed.');
      try { await respond({ content: 'Instructor navigation could not be completed. Reopen /catalog. No learner-record action was performed.' }); } catch { report('Instructor reply failed.'); }
      return true;
    }
  }
  function track(work) {
    const task = Promise.resolve().then(work); active.add(task);
    void task.finally(() => active.delete(task)).catch(() => {});
    return task;
  }
  function onInteraction(interaction) { if (!stopping) void track(() => handle(interaction)).catch(() => report('Instructor interaction failed.')); }
  function onError() { report('Instructor connection requires attention.'); }
  return Object.freeze({ handle, shutdown: shutdown.shutdown, get stopping() { return stopping; },
    async start(token) {
      if (started || stopping) throw new Error('Instructor application cannot be started again');
      if (typeof token !== 'string' || !token.trim()) throw new Error('Explicit Discord token required');
      started = true; client.on(Events.InteractionCreate, onInteraction); client.on(Events.Error, onError); shutdown.install();
      try { await track(() => client.login(token)); if (!stopping) report('Instructor curriculum browser connected.'); }
      catch { failed = true; report('Instructor login failed.'); await shutdown.shutdown(); }
    }
  });
}
