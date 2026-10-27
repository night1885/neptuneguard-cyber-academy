// Maintainer-only composition. Import has no side effects; construction uses explicit trusted factories.
const id = v => typeof v === 'string' && /^[0-9]{17,20}$/.test(v);
const off = ['CERTIFICATION_REGISTRATION_PILOT', 'CERTIFICATION_READ_ONLY_PREVIEW',
  'CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED', 'CERTIFICATION_APPLICATION_CLOSURE_ENABLED',
  'CERTIFICATION_COURSES_ENABLED', 'CERTIFICATION_MANUAL_REVIEW_ENABLED',
  'CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED'];
function snapshot(value) {
  if (!value || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('Invalid staging input');
  const descriptors = Object.getOwnPropertyDescriptors(value), copy = Object.create(null);
  for (const field of Reflect.ownKeys(descriptors)) {
    const d = descriptors[field];
    if (typeof field !== 'string' || !Object.hasOwn(d, 'value') || typeof d.value !== 'string') throw new Error('Invalid staging input');
    copy[field] = d.value;
  }
  return Object.freeze(copy);
}
function inspect(env, boundary, loadConfig) {
  const e = snapshot(env), b = snapshot(boundary);
  const require = condition => { if (!condition) throw new Error('Invalid isolated staging profile'); };
  require(typeof loadConfig === 'function' && e.FORMAL_STAGING_ENABLED === 'true' && e.CERTIFICATION_ENABLED === 'true');
  require(off.every(k => e[k] === 'false'));
  require(['TOKEN', 'BOT_TOKEN', 'DISCORD_TOKEN'].every(k => !Object.hasOwn(e, k)));
  require(['GUILD_ID', 'ACADEMY_OWNER_ID', 'ACADEMY_ADMIN_CHANNEL_ID', 'VERIFIED_ROLE_ID',
    'FORMAL_STAGING_BOT_ID', 'FORMAL_STAGING_ENTRY_CHANNEL_ID'].every(k => id(e[k])));
  require(id(b.guildId) && id(b.botId) && e.GUILD_ID !== b.guildId && e.FORMAL_STAGING_BOT_ID !== b.botId);
  require(e.ACADEMY_ADMIN_CHANNEL_ID !== e.FORMAL_STAGING_ENTRY_CHANNEL_ID);
  const url = new URL(e.CERTIFICATION_DATABASE_URL);
  require(['postgres:', 'postgresql:'].includes(url.protocol) && !!url.hostname && url.pathname.length > 1 && !url.search && !url.hash);
  require(/^[a-z0-9.-]+$/.test(b.databaseHost) && /^[0-9]{1,5}$/.test(b.databasePort) && !!b.databaseName);
  const database = decodeURIComponent(url.pathname.slice(1));
  require(!(url.hostname === b.databaseHost.toLowerCase() && (url.port || '5432') === b.databasePort && database === b.databaseName));
  const config = loadConfig(e);
  require(config?.enabled === true && config.ownerId === e.ACADEMY_OWNER_ID && config.adminChannelId === e.ACADEMY_ADMIN_CHANNEL_ID &&
    typeof config.activeAgreementVersion === 'string' && !!config.activeAgreementVersion.trim() &&
    typeof config.activeAgreementSha256 === 'string' && /^[a-f0-9]{64}$/.test(config.activeAgreementSha256) &&
    typeof config.comprehensionCheck?.version === 'string' && !!config.comprehensionCheck.version.trim() &&
    config.enrollmentSubmissionEnabled === false && config.manualReviewEnabled !== true && config.manualReviewDecisionsEnabled !== true);
  return e;
}
export function inspectFormalStagingProfile(env, boundary, loadConfig) {
  try { inspect(env, boundary, loadConfig); return Object.freeze({ ok: true, scope: 'staging-local-only', operationalReady: false }); }
  catch { return Object.freeze({ ok: false, scope: 'staging-local-only', operationalReady: false, issue: 'Invalid isolated staging configuration' }); }
}
export function createIsolatedFormalStagingApplication({ client, env, productionBoundary, bundle, lifecycle = {} } = {}, deps = {}) {
  const { loadConfig, createApplication, attachRuntime, createPool, createRoute } = deps;
  if ([loadConfig, createApplication, attachRuntime, createPool, createRoute].some(f => typeof f !== 'function')) throw new Error('Explicit trusted staging dependencies required');
  let environment;
  try { environment = inspect(env, productionBoundary, loadConfig); }
  catch { throw new Error('Invalid isolated staging configuration'); }
  let attached = false;
  const application = createApplication({ ...lifecycle, client, env: environment, guildId: environment.GUILD_ID,
    attachCommunity: () => Object.freeze({ enabled: false, ready: false, detach: async () => {} }),
    attachRuntime(actualClient, ignored, guildId, actualEnv) {
      if (attached || actualClient !== client || guildId !== environment.GUILD_ID ||
          JSON.stringify(Object.entries(actualEnv).sort()) !== JSON.stringify(Object.entries(environment).sort())) throw new Error('Unexpected staging runtime context');
      attached = true;
      let pool;
      return attachRuntime(client, undefined, guildId, environment, {
        createPool(connection) {
          if (pool) throw new Error('Staging pool already constructed');
          pool = createPool(connection, { readOnly: true, max: 2, connectionTimeoutMs: 1000,
            statementTimeoutMs: 1000, lockTimeoutMs: 500, idleTransactionTimeoutMs: 2000 });
          if (typeof pool?.query !== 'function' || typeof pool.end !== 'function') throw new Error('Owned staging reader pool required');
          return pool;
        },
        createRouter: () => async interaction => {
          const payload = { content: 'Only isolated formal review is available here.', embeds: [], components: [], allowedMentions: { parse: [] } };
          if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
          else await interaction.reply({ ...payload, flags: 64 });
          return true;
        },
        formalReview: { enabled: true, reviewOnly: true, mode: 'review', createRoute(context) {
          if (!pool || context.client !== client || context.guildId !== guildId || typeof context.isReady !== 'function') throw new Error('Explicit staging route context required');
          return createRoute({ enabled: true, reviewOnly: true, mode: 'review', client, guildId,
            config: context.config, entryChannelId: environment.FORMAL_STAGING_ENTRY_CHANNEL_ID,
            verifiedRoleId: environment.VERIFIED_ROLE_ID, readPool: pool, bundle,
            isReady: () => { try { return client.user?.id === environment.FORMAL_STAGING_BOT_ID && context.isReady() === true; } catch { return false; } } });
        } }
      });
    }
  });
  if (!application || typeof application.start !== 'function' || typeof application.shutdown !== 'function') throw new Error('Staging application lifecycle required');
  return Object.freeze({ get enabled() { return application.enabled === true; },
    get ready() { return application.ready === true && client.user?.id === environment.FORMAL_STAGING_BOT_ID; },
    get stopping() { return application.stopping === true; }, get communityReady() { return false; },
    start: token => application.start(token), shutdown: () => application.shutdown() });
}
