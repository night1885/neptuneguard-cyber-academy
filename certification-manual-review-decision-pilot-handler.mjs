import { loadCertificationConfig } from './certification-config.js';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy } from './certification-registration-pilot-guard.js';
import { createCertificationDatabasePool } from './certification-database-pool.js';
import { loadManualReviewDecisionConnection } from './certification-manual-review-decision-connection.mjs';
import { validateManualReviewDecisionCapabilities } from './certification-manual-review-decision-capabilities.mjs';
import { createManualReviewDecisionService } from './certification-manual-review-decisions.mjs';
import { createManualReviewDecisionFlow } from './certification-manual-review-decision-flow.mjs';
import { createManualReviewDecisionInteractionHandler } from './certification-manual-review-decision-interactions.mjs';

export const decisionConnectionBindingSql = `SELECT current_user::pg_catalog.text AS login_role, session_user::pg_catalog.text AS session_role,
  pg_catalog.current_database() AS database_name,
  (SELECT oid::pg_catalog.text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()) AS database_oid,
  pg_catalog.inet_server_addr()::pg_catalog.text AS server_address, pg_catalog.inet_server_port() AS server_port`;

// Uninstalled factory. Call initialize only after the primary pilot schema/agreement checks pass.
// env, readPool, createPool, and onDiagnostic are trusted server dependencies, not interaction input.
export function createManualReviewDecisionPilotHandler(config, guildId, { env = {}, readPool, createPool = createCertificationDatabasePool,
  onDiagnostic = detail => console.error('Owner manual-review interaction failed.', detail) } = {}) {
  const checked = loadCertificationConfig(env), pilot = readRegistrationPilotOptions(env);
  if (config?.enabled !== true || config.manualReviewEnabled !== true || config.manualReviewDecisionsEnabled !== true ||
      config.enrollmentSubmissionEnabled !== false || checked.manualReviewDecisionsEnabled !== true || pilot.guildId !== guildId ||
      ['ownerId','adminChannelId','activeAgreementVersion','activeAgreementSha256'].some(key => config[key] !== checked[key]) ||
      JSON.stringify(config.comprehensionCheck) !== JSON.stringify(checked.comprehensionCheck) ||
      typeof readPool?.query !== 'function' || typeof createPool !== 'function' || typeof onDiagnostic !== 'function') {
    throw new Error('Explicit matching pilot owner-decision configuration required');
  }
  const descriptor = loadManualReviewDecisionConnection(env);
  const policy = createRegistrationPilotPolicy(pilot, { ownerDecisionsEnabled: true });
  const active = new Set();
  let pool, flow, adapter, initializing, closing, poolClosing, disposed = false, ready = false;
  const closePool = () => {
    if (!poolClosing) poolClosing = Promise.resolve().then(() => pool?.end()).catch(() => { throw new Error('Owner-decision pool shutdown failed'); });
    return poolClosing;
  };
  const hold = async interaction => {
    const payload = { content: 'Owner decisions are unavailable. Inspect current status before starting another review.', flags: 64,
      allowedMentions: { parse: [] }, embeds: [], components: [] };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload); else await interaction.reply(payload);
    return true;
  };
  const handler = async interaction => {
    if (typeof interaction?.customId !== 'string' || !interaction.customId.startsWith('cert:review:')) return false;
    if (disposed || !ready || policy.classify(interaction) !== 'decision') return hold(interaction);
    const task = Promise.resolve().then(() => disposed ? hold(interaction) : adapter(interaction));
    active.add(task);
    try { return await task; } finally { active.delete(task); }
  };
  handler.initialize = () => {
    if (disposed) return Promise.reject(new Error('Owner-decision handler disposed'));
    if (!initializing) initializing = Promise.resolve().then(async () => {
      if (disposed) throw new Error('Owner-decision initialization stopped');
      pool = createPool(descriptor.connection, { max: 2, readOnly: false, statementTimeoutMs: 15000, lockTimeoutMs: 5000, idleTransactionTimeoutMs: 20000 });
      if (typeof pool?.query !== 'function' || typeof pool.connect !== 'function' || typeof pool.end !== 'function') throw new Error('Dedicated decision pool required');
      const results = await Promise.all([readPool.query(decisionConnectionBindingSql), pool.query(decisionConnectionBindingSql)]);
      const rows = results.map((result, index) => {
        if (!Array.isArray(result?.rows) || result.rows.length !== 1) throw new Error('Connection identity unavailable');
        const row = result.rows[0], target = index === 0 ? descriptor.primaryTarget : descriptor.target;
        if (row.login_role !== target.expectedRole || row.session_role !== target.expectedRole || row.database_name !== target.expectedDatabase ||
            typeof row.database_oid !== 'string' || !/^[0-9]+$/.test(row.database_oid) || typeof row.server_address !== 'string' || !row.server_address ||
            !Number.isInteger(row.server_port) || row.server_port < 1 || row.server_port > 65535) throw new Error('Connection identity mismatch');
        return row;
      });
      if (['database_name','database_oid','server_address','server_port'].some(key => rows[0][key] !== rows[1][key])) throw new Error('Pilot and decision database binding mismatch');
      await validateManualReviewDecisionCapabilities(pool, descriptor.target);
      if (disposed) throw new Error('Owner-decision initialization stopped');
      const real = createManualReviewDecisionService(pool, checked, { guildId });
      const service = Object.freeze({
        prepare(input) { policy.assertTarget(input?.record?.discord_user_id); return real.prepare(input); },
        cancel: input => real.cancel(input),
        confirm(input) { policy.assertTarget(input?.studentDiscordId); return real.confirm(input); }
      });
      flow = createManualReviewDecisionFlow(checked, { guildId, service,
        loadRecord: async id => { policy.assertTarget(id); return (await readPool.query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1', [id])).rows[0]; } });
      adapter = createManualReviewDecisionInteractionHandler(checked, { guildId, flow, onDiagnostic });
      ready = true;
      return Object.freeze({ ready: true });
    }).catch(async () => {
      ready = false; flow?.close();
      try { await closePool(); } catch {}
      throw Object.assign(new Error('Owner-decision startup checks failed; verify dedicated credentials, database binding, and privileges.'),
        { code: 'MANUAL_REVIEW_DECISION_STARTUP_FAILED' });
    });
    return initializing;
  };
  handler.dispose = () => {
    if (closing) return closing;
    disposed = true; ready = false; flow?.close();
    closing = (async () => {
      await Promise.allSettled([...active, ...(initializing ? [initializing] : [])]);
      await closePool();
    })();
    return closing;
  };
  Object.defineProperty(handler, 'ready', { get: () => ready && !disposed });
  return handler;
}
