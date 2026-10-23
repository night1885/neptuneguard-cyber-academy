import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { manualReviewDecisionCapabilitiesSql } from './certification-manual-review-decision-capabilities.mjs';
import { createManualReviewDecisionPilotHandler, decisionConnectionBindingSql } from './certification-manual-review-decision-pilot-handler.mjs';

const owner = '222222222222222222', student = '111111111111111111', guild = '333333333333333333', channel = '444444444444444444';
function fixture({ bindingMismatch = false, capabilities = true, readRecord } = {}) {
  const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'true',
    CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'false', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: channel,
    GUILD_ID: guild, CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: student,
    CERTIFICATION_DATABASE_URL: 'postgresql://pilot_fixture:pilot_fixture_secret@127.0.0.1/academy_fixture', CERTIFICATION_DATABASE_TLS: 'disable',
    CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL: 'postgresql://decision_fixture:decision_fixture_secret@127.0.0.1/academy_fixture',
    CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS: 'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'handler-v1', agreementSha256: 'a'.repeat(64),
      comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['Synthetic guide'] } }) };
  const config = loadCertificationConfig(env), at = new Date();
  const record = { discord_user_id: student, student_id: null, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: config.activeAgreementVersion, agreement_content_sha256: config.activeAgreementSha256,
    acknowledged_at: at, learner_confirmed_read_at: at, comprehension_check_version: 'check-v1', comprehension_submitted_at: at, comprehension_passed_at: null,
    comprehension_review_snapshot: createManualReviewSnapshot(config, ['Synthetic response']), age_eligible: true, age_declared_at: at,
    age_declaration_version: 'adult-18-v1', approved_by: null, approved_at: null, updated_at: at };
  const state = { creates: 0, ends: 0, reads: 0, connects: 0 }, diagnostics = [];
  const metadata = role => ({ login_role: role, session_role: role, database_name: 'academy_fixture', database_oid: '12345', server_address: '127.0.0.1', server_port: 5432 });
  const readPool = { async query(sql) {
    if (sql === decisionConnectionBindingSql) return { rows: [metadata('pilot_fixture')] };
    assert.match(sql, /^SELECT \* FROM public.certification_enrollments/);
    state.reads++; return readRecord ? readRecord() : { rows: [record] };
  } };
  const pool = {
    async query(sql) {
      if (sql === decisionConnectionBindingSql) return { rows: [{ ...metadata('decision_fixture'), ...(bindingMismatch ? { database_oid: '54321' } : {}) }] };
      assert.equal(sql, manualReviewDecisionCapabilitiesSql);
      const row = Object.fromEntries(['identity','restricted_login','ownership_limits','relation_shapes','relation_bindings','enrollment_capabilities',
        'agreement_capabilities','audit_capabilities','sequence_capabilities','unrelated_relations_blocked','definer_functions_blocked'].map(key => [key, true]));
      row.ownership_limits = capabilities; return { rows: [row] };
    },
    async connect() { state.connects++; throw new Error('Unexpected synthetic transaction'); },
    async end() { state.ends++; }
  };
  const handler = createManualReviewDecisionPilotHandler(config, guild, { env, readPool,
    createPool(connection, limits) { state.creates++; assert.equal(connection.ssl, false); assert.equal(limits.max, 2); return pool; },
    onDiagnostic: value => diagnostics.push(value) });
  return { handler, state, record, diagnostics };
}
function request({ actor = owner, target = student } = {}) {
  const outputs = [];
  const item = { customId: `cert:review:open:${target}`, user: { id: actor }, guildId: guild, channelId: channel, deferred: false, replied: false,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    message: { flags: { has: () => false } },
    async reply(payload) { outputs.push(payload); item.replied = true; },
    async followUp(payload) { outputs.push(payload); },
    async deferReply(payload) { assert.equal(payload.flags, 64); item.deferred = true; },
    async editReply(payload) { outputs.push(payload); } };
  return { item, outputs };
}
test('construction opens no pool and readiness initializes once before a private owner review', async () => {
  const f = fixture(); assert.equal(f.state.creates, 0); assert.equal(f.handler.ready, false);
  const before = request(); await f.handler(before.item); assert.equal(f.state.reads, 0);
  const first = f.handler.initialize(); assert.equal(first, f.handler.initialize());
  assert.deepEqual(await first, { ready: true }); assert.equal(f.handler.ready, true);
  const opened = request(); await f.handler(opened.item);
  assert.equal(f.state.creates, 1); assert.equal(f.state.reads, 1);
  assert.equal(opened.outputs[0].embeds[1].fields[1].value, 'Synthetic response');
  await f.handler.dispose(); assert.equal(f.state.ends, 1);
});
for (const options of [{ bindingMismatch: true }, { capabilities: false }]) test(`startup fails closed and closes its pool: ${JSON.stringify(options)}`, async () => {
  const f = fixture(options);
  await assert.rejects(f.handler.initialize(), error => error.code === 'MANUAL_REVIEW_DECISION_STARTUP_FAILED');
  assert.equal(f.handler.ready, false); assert.equal(f.state.ends, 1);
  await f.handler(request().item); assert.equal(f.state.reads, 0); assert.equal(f.state.connects, 0);
  await f.handler.dispose(); assert.equal(f.state.ends, 1);
});
test('owner and allowlist checks run before record reads', async () => {
  const f = fixture(); await f.handler.initialize();
  await f.handler(request({ actor: student }).item);
  await f.handler(request({ target: '555555555555555555' }).item);
  assert.equal(f.state.reads, 0); assert.equal(f.state.connects, 0);
  await f.handler.dispose();
});
test('shutdown invalidates sessions, drains an in-flight read, and closes only the owned pool once', async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const pendingRead = new Promise(resolve => { release = resolve; });
  const f = fixture({ readRecord: () => { entered(); return pendingRead; } });
  await f.handler.initialize();
  const work = f.handler(request().item); await started;
  const closing = f.handler.dispose(); assert.equal(closing, f.handler.dispose());
  assert.equal(f.handler.ready, false); assert.equal(f.state.ends, 0);
  release({ rows: [f.record] }); await work; await closing;
  assert.equal(f.state.ends, 1);
  await assert.rejects(f.handler.initialize());
  const previous = f.state.reads; await f.handler(request().item); assert.equal(f.state.reads, previous);
});
