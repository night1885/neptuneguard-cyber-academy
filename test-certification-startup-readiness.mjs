import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';

const guildId = '1339276399390887957';
const content = 'Startup fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const environment = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true',
  CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable',
  CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'fixture-v2', agreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Test question.' }], correctAnswers: ['stop'] } }) };
function fixture(options = {}) {
  let guildLookups = 0; let ended = 0; const everyone = {}; const me = {};
  const guild = { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return me; } } };
  const channel = { guildId, isTextBased: () => true, async send() { assert.fail('Startup must not publish'); }, permissionsFor(member) { return { has: () => member === everyone ? Boolean(options.publicChannel) : !options.missingBotPermissions }; } };
  const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { guildLookups++; return guild; } }; client.channels = { async fetch() { return channel; } };
  const pool = { async end() { ended++; }, async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('pg_attribute')) return { rows: (options.missingColumns ? requiredEnrollmentColumns.slice(1) : requiredEnrollmentColumns).map(attname => ({ attname })) };
    if (sql.includes('pg_constraint')) return { rows: options.missingConstraint ? [] : [{ conname: 'certification_account_acknowledgment_required', convalidated: !options.unvalidatedConstraint }] };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: options.disabledTrigger ? 'D' : 'O' })) };
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content: options.changedAgreement ? 'changed' : content, content_sha256: hash }] };
    throw new Error('Unexpected startup query');
  } };
  return { client, pool, get guildLookups() { return guildLookups; }, get ended() { return ended; } };
}
async function start(f, t) {
  const source = { async query() { assert.fail('Shared pool must not perform certification queries'); }, async end() { assert.fail('Shared pool must not be closed'); } };
  const runtime = attachCertificationRuntime(f.client, source, guildId, environment, { createPool: () => f.pool });
  t.after(async () => { await runtime.detach(); assert.equal(f.ended, 1); });
  f.client.emit('clientReady'); for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve));
  return runtime;
}
test('complete schema, matching agreement and restricted channel reach ready without publication', async t => {
  const f = fixture(); const runtime = await start(f, t); assert.equal(runtime.ready, true); assert.equal(f.guildLookups, 1);
});
for (const [label, options] of [
  ['missing columns', { missingColumns: true }], ['missing constraint', { missingConstraint: true }],
  ['unvalidated constraint', { unvalidatedConstraint: true }], ['disabled safeguard', { disabledTrigger: true }],
  ['changed agreement', { changedAgreement: true }]
]) {
  test(`${label} blocks startup before Discord lookups`, async t => {
    const f = fixture(options); const runtime = await start(f, t); assert.equal(runtime.ready, false); assert.equal(f.guildLookups, 0);
  });
}
test('everyone-visible admin channel blocks readiness', async t => {
  const f = fixture({ publicChannel: true }); const runtime = await start(f, t); assert.equal(runtime.ready, false);
});
test('missing bot permissions block readiness', async t => {
  const f = fixture({ missingBotPermissions: true }); const runtime = await start(f, t); assert.equal(runtime.ready, false);
});
