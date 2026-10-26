import { isGeneralChatUiReviewOptions } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/general-chat-ui-review.mjs';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { createProvenancePilotHandlers as createRegistrationPilotHandlers } from './certification-provenance-pilot-handlers.js';
import { createProvenanceOwnerRegistrationHandler as createOwnerRegistrationHandler } from './certification-provenance-pilot-handlers.js';
import { createProvenanceInvitationHandler as createInvitationInteractionHandler } from './certification-provenance-pilot-handlers.js';
import { createManualReviewDecisionPilotHandler } from './certification-manual-review-decision-pilot-handler.mjs';
import { Events, PermissionFlagsBits } from 'discord.js';
import { readReadOnlyPreviewFlag, createReadOnlyPreviewPool, createReadOnlyPreviewRouter } from './certification-read-only-preview.js';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { validateRuntimeCertificationSchema as validateCertificationSchema } from './certification-pilot-runtime-readiness.js';
import { validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';
import { createCertificationService } from './certification-service.js';
import { replyRetentionHold } from './certification-retention-hold.js';
import { createClosureRuntimeRouter, readApplicationClosureFlag } from './certification-application-closure-runtime.js';
import { createCourseRuntimeRouter, readCourseRuntimeOptions } from './certification-course-runtime.js';

export function attachCertificationRuntime(client, _pool, guildId, env = process.env, { createPool = createCertificationDatabasePool, createRouter = createCertificationRouter, createClosureRouter = createClosureRuntimeRouter, createCourseRouter = createCourseRuntimeRouter, createDecisionHandler, formalReview } = {}) {
  const config = loadCertificationConfig(env);
  const readOnlyPreview = readReadOnlyPreviewFlag(env);
  const pilot = env.CERTIFICATION_REGISTRATION_PILOT === undefined ? Object.freeze({ enabled: false }) : readRegistrationPilotOptions(env);
  const closureEnabled = readApplicationClosureFlag(env);
  const courses = readCourseRuntimeOptions(env);
  if (closureEnabled && !config.enabled) throw new Error('Application closure requires enabled certification');
  if (courses.enabled && (!config.enabled || !config.activeAgreementVersion)) throw new Error('Course runtime requires enabled certification and an explicit current agreement manifest');
  if (readOnlyPreview && (!config.enabled || config.enrollmentSubmissionEnabled || closureEnabled || courses.enabled || env.ACADEMY_OWNER_ID !== config.ownerId || env.ACADEMY_ADMIN_CHANNEL_ID !== config.adminChannelId || env.GUILD_ID !== guildId || !/^[0-9]{17,20}$/.test(guildId || ''))) throw new Error('Read-only preview requires explicit owner/server/channel and disabled enrollment, closure and course mutation features');
  if (pilot.enabled && (readOnlyPreview || closureEnabled || courses.enabled || !config.enabled || config.enrollmentSubmissionEnabled ||
      !config.activeAgreementVersion || typeof config.activeAgreementSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(config.activeAgreementSha256) ||
      pilot.guildId !== guildId || pilot.ownerId !== config.ownerId || pilot.adminChannelId !== config.adminChannelId)) {
    throw new Error('Pilot identity, agreement and disabled-feature requirements are not satisfied');
  }
  if (formalReview !== undefined && (!formalReview || typeof formalReview !== 'object' || Array.isArray(formalReview) ||
      typeof formalReview.enabled !== 'boolean')) throw new Error('Explicit formal review options required');
  const formal = formalReview?.enabled === true ? Object.freeze({ ...formalReview }) : null;
  if (formal && (formal.reviewOnly !== true || formal.mode !== 'review' || typeof formal.createRoute !== 'function' ||
      !config.enabled || !config.activeAgreementVersion || readOnlyPreview ||
      (pilot.enabled && !isGeneralChatUiReviewOptions(formalReview, guildId)) || closureEnabled || courses.enabled)) {
    throw new Error('Formal review requires isolated explicit review mode and current certification readiness');
  }
  if (!config.enabled) return { enabled: false, detach() {} };
  const connection = loadCertificationDatabaseConnection(env);
  const backing = readOnlyPreview ? createPool(connection, { readOnly: true }) : createPool(connection);
  let database, service, route, ownerDecisions, formalRoute;
  let ready = false; let detached = false; let initializing = null; let closing = null;
  try {
    database = readOnlyPreview || pilot.enabled ? createReadOnlyPreviewPool(backing) : backing;
    service = createCertificationService(database, config);
    const baseFactory = closureEnabled ? (pool, settings, guild) => createClosureRouter(pool, settings, guild, { createBaseRouter: createRouter }) : createRouter;
    route = courses.enabled ? createCourseRouter(database, config, guildId, { verifiedRoleId: courses.verifiedRoleId, createBaseRouter: baseFactory }) : baseFactory(database, config, guildId);
    if (typeof route !== 'function' || ((closureEnabled || courses.enabled) && typeof route.initialize !== 'function')) throw new Error('Certification router and required initialization hook unavailable');
    if (readOnlyPreview) route = createReadOnlyPreviewRouter(route, config, guildId);
    if (pilot.enabled) {
      const policy = createRegistrationPilotPolicy(pilot);
      const pilotConfig = Object.freeze({ ...config, registrationPilotEnabled: true, registrationPilotPolicy: policy });
      const handlers = createRegistrationPilotHandlers({ readPool: database, writePool: backing, config: pilotConfig, guildId,
        createRegistration: createOwnerRegistrationHandler, createInvitation: createInvitationInteractionHandler });
      if (config.manualReviewDecisionsEnabled === true) {
        const factory = createDecisionHandler ?? createManualReviewDecisionPilotHandler;
        if (typeof factory !== 'function') throw new Error('Trusted owner-decision handler factory required');
        ownerDecisions = factory(config, guildId, { env: { ...env }, readPool: database, createPool });
        route = createRegistrationPilotRouter({ settings: pilot, readViews: route, ...handlers, ownerDecisionsEnabled: true, ownerDecisions });
      } else route = createRegistrationPilotRouter({ settings: pilot, readViews: route, ...handlers });
    }
    if (formal) {
      const candidate = formal.createRoute({ client, guildId, config: Object.freeze({ ...config }), isReady: () => ready && !detached });
      if (candidate && typeof candidate.then === 'function') {
        void Promise.resolve(candidate).then(value => value?.dispose?.()).catch(() => {});
        throw new Error('Synchronous formal review factory required');
      }
      formalRoute = candidate;
      if (formalRoute?.enabled !== true || typeof formalRoute.handle !== 'function' || typeof formalRoute.dispose !== 'function') {
        throw new Error('Enabled disposable formal review route required');
      }
    }
  } catch (error) {
    try { void Promise.resolve(formalRoute?.dispose?.()).catch(() => {}); } catch {}
    try { if (typeof ownerDecisions?.dispose === 'function') void Promise.resolve(ownerDecisions.dispose()).catch(() => { console.error('Owner-decision construction cleanup requires attention.'); }); }
    catch { console.error('Owner-decision construction cleanup requires attention.'); }
    void backing.end().catch(() => {});
    throw error;
  }
  const active = new Set();

  async function initialize() {
    if (detached) return;
    if (initializing) return initializing;
    initializing = (async () => {
      ready = false;
      await validateCertificationSchema(database, pilot.enabled ? { pilotConnection: connection } : undefined);
      if (pilot.enabled && detached) return;
      await validateActiveEnrollmentAgreement(database, config);
      if (detached) return;
      if (typeof route.initialize === 'function') await route.initialize();
      if (detached) return;
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
    if (readOnlyPreview || pilot.enabled || !ready || detached) return null;
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
      if (formal && interaction.customId?.startsWith('fws:')) {
        if (!ready || detached || !formalRoute || interaction.isButton?.() !== true) {
          if (!interaction.deferred && !interaction.replied) await respond('Formal review workspace is unavailable.');
          return;
        }
        if (await formalRoute.handle(interaction) !== true && !interaction.deferred && !interaction.replied) await respond('Formal review workspace is unavailable.');
        return;
      }
      if (!ready || detached) { await replyRetentionHold(interaction); return; }
      if (!await route(interaction)) await respond('This action is unavailable. Reopen the Admin Dashboard or your student panel.');
    } catch {
      console.error('Certification interaction failed.');
      try {
        if (formal && interaction.customId?.startsWith('fws:')) {
          if (!interaction.deferred && !interaction.replied) await respond('Formal review workspace is unavailable.');
        } else await respond('This action could not be completed. Reopen the dashboard or student panel and check the current status before retrying.');
      } catch { console.error('Certification error reply failed.'); }
    }
  }

  function onInteraction(interaction) {
    if (detached || !(interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu?.()) ||
        !(interaction.customId?.startsWith('cert:') || (formal && interaction.customId?.startsWith('fws:')))) return;
    const task = handleInteraction(interaction); active.add(task);
    void task.finally(() => active.delete(task)).catch(() => {
      console.error('Certification reply failed.');
    });
  }

  client.on(Events.InteractionCreate, onInteraction);
  client.once(Events.ClientReady, initialize);
  if (client.isReady()) void initialize();
  return { enabled: true, readOnlyPreview, registrationPilot: pilot.enabled, get ready() { return ready; },
    get formalReviewReady() { return ready && !detached && formalRoute?.enabled === true; },
    get manualReviewDecisionsReady() { return ready && !detached && ownerDecisions?.ready === true; }, getCourseAuthorization,
    detach() {
      detached = true; ready = false;
      client.off(Events.InteractionCreate, onInteraction);
      client.off(Events.ClientReady, initialize);
      if (!closing) {
        let disposal = Promise.resolve();
        try { if (typeof route.dispose === 'function') disposal = Promise.resolve(route.dispose()).catch(() => { console.error('Certification route shutdown requires attention.'); }); }
        catch { console.error('Certification route shutdown requires attention.'); }
        let formalDisposal = Promise.resolve();
        if (formalRoute) {
          try { formalDisposal = Promise.resolve(formalRoute.dispose()).then(result => {
            if (result?.drained !== true) throw new Error('Formal review drain incomplete');
          }); } catch { formalDisposal = Promise.reject(new Error('Formal review disposal failed')); }
        }
        closing = (async () => {
          const results = await Promise.allSettled([...active, ...(initializing ? [initializing] : []), disposal, formalDisposal]);
          await database.end();
          if (results.at(-1).status === 'rejected') throw new Error('Formal review shutdown requires attention');
        })();
      }
      return closing;
    }
  };
}
