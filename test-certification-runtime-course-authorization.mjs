import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createAcademyCourseGate } from './certification-academy-course-gate.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', role = '444444444444444444', channelId = '555555555555555555';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
  const content = 'Disposable runtime authorization agreement.', hash = createHash('sha256').update(content).digest('hex');
  const complete = { discord_user_id: student, status: 'approved', student_id: 'NG-PT-fixture', approved_by: admin, approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: hash, acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
  let record = { ...complete }, ended = 0, received;
  const queries = [], bot = {}, everyone = {};
  const client = new EventEmitter(); client.isReady = () => false;
  const guild = { id: guildId, roles: { everyone }, members: {
    async fetch(id) { assert.ok([admin, student].includes(id)); return { id, roles: { cache: { has: value => value === role } } }; },
    async fetchMe() { return bot; }
  } };
  client.guilds = { async fetch(id) { assert.equal(id, guildId); return guild; } };
  client.channels = { async fetch(id) { assert.equal(id, channelId); return { guildId, isTextBased: () => true,
    send() { assert.fail('Startup must not publish a dashboard'); }, permissionsFor: member => ({ has: () => member === bot }) }; } };
  const pool = { async query(sql, params) {
    assert.match(sql.trim(), /^SELECT\b/); queries.push({ sql, params });
    if (sql.includes("to_regclass('certification_agreements')")) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('FROM pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('FROM pg_constraint')) return { rows: [{ conname: 'certification_account_acknowledgment_required', convalidated: true }] };
    if (sql.includes('FROM pg_trigger')) return { rows: (params[0] === 'certification_enrollments' ? ['certification_student_id_immutable'] : ['certification_agreement_immutable', 'certification_agreement_no_truncate']).map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.startsWith('SELECT * FROM certification_enrollments')) {
      assert.deepEqual(params, [student]);
      return options.authorizationQuery ? options.authorizationQuery() : { rows: record ? [{ ...record }] : [] };
    }
    assert.fail(`Unexpected SQL: ${sql}`);
  }, connect() { assert.fail('Authorization cannot write'); }, async end() { ended++; } };
  const academy = { query() { assert.fail('Must use certification database'); }, end() { assert.fail('Runtime must not close academy database'); } };
  const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', ACADEMY_OWNER_ID: admin, ACADEMY_ADMIN_CHANNEL_ID: channelId,
    CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'v1', agreementSha256: hash, comprehensionCheck: { version: 'check1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } }) };
  const runtime = attachCertificationRuntime(client, academy, guildId, env, { createPool(connection) { received = connection; return pool; } });
  return { runtime, guild, complete, queries, received, ended: () => ended,
    reads: () => queries.filter(query => query.sql.startsWith('SELECT * FROM certification_enrollments')).length,
    setRecord(value) { record = value; },
    async start() { client.emit('clientReady'); for (let i = 0; i < 20 && !runtime.ready; i++) await tick(); assert.equal(runtime.ready, true); }
  };
}
test('real runtime performs no authorization read before readiness or after detach', async () => {
  const f = fixture();
  assert.equal(await f.runtime.getCourseAuthorization(student), null); assert.equal(f.reads(), 0);
  await f.start(); assert.deepEqual(await f.runtime.getCourseAuthorization(student), { student_id: 'NG-PT-fixture' });
  assert.deepEqual(f.received, { connectionString: 'postgresql://fixture:fixture@localhost/certification_test', ssl: false });
  await f.runtime.detach(); assert.equal(await f.runtime.getCourseAuthorization(student), null);
  assert.equal(f.reads(), 1); assert.equal(f.ended(), 1);
});
test('ready runtime delegates current-record and agreement validation to the real service', async () => {
  const f = fixture();
  try {
    await f.start();
    for (const change of [null, ...['pending', 'denied', 'suspended', 'revoked'].map(status => ({ status })), { student_id: ' ' }, { agreement_version: 'old' }, { agreement_content_sha256: 'b'.repeat(64) }, { comprehension_check_version: 'old' }, { age_eligible: false }]) {
      f.setRecord(change === null ? null : { ...f.complete, ...change });
      assert.equal(await f.runtime.getCourseAuthorization(student), null);
    }
    f.setRecord({ ...f.complete }); assert.deepEqual(await f.runtime.getCourseAuthorization(student), { student_id: 'NG-PT-fixture' });
  } finally { await f.runtime.detach(); }
});
test('authorization lookup failure propagates without leaking credentials into a success result', async () => {
  const f = fixture({ authorizationQuery() { throw new Error('fixture lookup failure'); } });
  try { await f.start(); await assert.rejects(f.runtime.getCourseAuthorization(student), /fixture lookup failure/); }
  finally { await f.runtime.detach(); }
  assert.equal(f.ended(), 1);
});
test('detach waits for an in-flight authorization read and discards its late authorization', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const f = fixture({ authorizationQuery: () => pending });
  await f.start(); const read = f.runtime.getCourseAuthorization(student); assert.equal(f.reads(), 1);
  const closing = f.runtime.detach(); await tick(); assert.equal(f.ended(), 0);
  assert.equal(await f.runtime.getCourseAuthorization(student), null); assert.equal(f.reads(), 1);
  release({ rows: [{ ...f.complete }] }); assert.equal(await read, null); await closing;
  assert.equal(f.ended(), 1); assert.equal(f.runtime.ready, false);
});
test('detach also drains a rejected authorization read and closes its pool once', async () => {
  let reject; const pending = new Promise((_, fail) => { reject = fail; });
  const f = fixture({ authorizationQuery: () => pending });
  await f.start(); const observed = assert.rejects(f.runtime.getCourseAuthorization(student), /fixture late failure/);
  const closing = f.runtime.detach(); assert.equal(f.runtime.detach(), closing); await tick(); assert.equal(f.ended(), 0);
  reject(new Error('fixture late failure')); await observed; await closing; assert.equal(f.ended(), 1);
});
test('course gate uses a real ready runtime and denies after runtime shutdown', async () => {
  const f = fixture(), gate = createAcademyCourseGate({ certification: f.runtime, guildId, verifiedRoleId: role });
  const make = () => ({ user: { id: student }, guildId, guild: f.guild, commandName: 'continue', deferred: false, replies: [],
    isChatInputCommand: () => true, isButton: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; }, async editReply(payload) { this.replies.push(payload); } });
  try { await f.start(); assert.ok(await gate(make())); }
  finally { await f.runtime.detach(); }
  const denied = make(); assert.equal(await gate(denied), null); assert.match(denied.replies[0].content, /unavailable/);
  assert.equal(f.reads(), 1); assert.equal(f.ended(), 1);
});
