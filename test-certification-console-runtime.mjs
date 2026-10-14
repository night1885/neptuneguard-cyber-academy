import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';

const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guildId = '1339276399390887957';
const content = 'Runtime dropdown fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'fixture-console', agreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture question.' }], correctAnswers: ['stop'] } }) };
function fixture(holdRead = false) {
  let ended = 0; let release; const calls = []; const gate = new Promise(resolve => { release = resolve; });
  const everyone = {}; const me = {}; const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { return { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return me; } } }; } };
  client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('Tests cannot publish'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
  const pool = { async end() { ended++; }, async query(sql) {
    calls.push(sql);
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('COUNT(*)')) { if (holdRead) await gate; return { rows: [{ pending_enrollments: '2', approved_enrollments: '1', suspended_enrollments: '0', revoked_enrollments: '0', awaiting_acknowledgment: '0', pending_labs: '0' }] }; }
    assert.fail('Unexpected runtime query');
  } };
  const runtime = attachCertificationRuntime(client, {}, guildId, env, { createPool: () => pool });
  return { client, calls, runtime, release, get ended() { return ended; } };
}
function select(actor = owner, customId = 'cert:console:section') {
  let finish; const done = new Promise(resolve => { finish = resolve; });
  const i = { customId, values: ['overview'], user: { id: actor }, guildId, isButton: () => false, isModalSubmit: () => false, isStringSelectMenu: () => true, replies: [], async deferReply(options) { this.options = options; }, async reply(payload) { this.replies.push(payload); finish(); }, async editReply(payload) { this.replies.push(payload); finish(); } };
  return { i, done };
}
async function ready(f) { f.client.emit('clientReady'); for (let n = 0; n < 3; n++) await tick(); assert.equal(f.runtime.ready, true); }

test('ready runtime dispatches owner dropdown to private database-backed overview', { timeout: 5000 }, async t => {
  const f = fixture(); t.after(() => f.runtime.detach()); await ready(f); const s = select(); f.client.emit('interactionCreate', s.i); await s.done;
  assert.equal(s.i.options.flags, 64); const payload = s.i.replies[0]; assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.equal(payload.components[0].toJSON().components[0].type, 3); assert.equal(payload.embeds[0].toJSON().fields[0].value, '2');
});
test('runtime non-owner selection is denied before dashboard query', { timeout: 5000 }, async t => {
  const f = fixture(); t.after(() => f.runtime.detach()); await ready(f); const before = f.calls.length; const s = select(learner); f.client.emit('interactionCreate', s.i); await s.done; assert.equal(f.calls.length, before); assert.match(s.i.replies[0].content, /restricted/); assert.equal(s.i.options.flags, 64);
});
test('startup-pending console dropdown fails closed while unrelated menus are ignored', async t => {
  const f = fixture(); t.after(() => f.runtime.detach()); const s = select(); f.client.emit('interactionCreate', s.i); await s.done; assert.equal(s.i.replies[0].flags, 64); assert.match(s.i.replies[0].content, /unavailable/); assert.equal(f.calls.length, 0);
  const unrelated = select(owner, 'academy:menu'); f.client.emit('interactionCreate', unrelated.i); await tick(); assert.equal(unrelated.i.replies.length, 0);
});
test('detach stops dropdown admission and waits for in-flight overview before closing pool', { timeout: 5000 }, async t => {
  const f = fixture(true); t.after(async () => { f.release(); await f.runtime.detach(); }); await ready(f); const first = select(); f.client.emit('interactionCreate', first.i); await tick(); assert.ok(f.calls.some(sql => sql.includes('COUNT(*)')));
  const closing = f.runtime.detach(); const second = select(); f.client.emit('interactionCreate', second.i); await tick(); assert.equal(f.ended, 0); assert.equal(second.i.replies.length, 0); assert.equal(f.client.listenerCount('interactionCreate'), 0);
  f.release(); await first.done; await closing; assert.equal(f.ended, 1); assert.equal(f.runtime.ready, false);
});
