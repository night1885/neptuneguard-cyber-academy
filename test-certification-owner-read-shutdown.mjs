import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { setImmediate as tick } from 'node:timers/promises';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
const owner = '1223123544301633567'; const guildId = '1339276399390887957';
const content = 'Timed-out read shutdown fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'fixture-shutdown', agreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture question.' }], correctAnswers: ['stop'] } }) };
function fixture(failLate) {
  let release; let pendingRead; let endCalls = 0; let ended = 0; let reads = 0; const gate = new Promise(resolve => { release = resolve; });
  const everyone = {}; const me = {}; const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { return { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return me; } } }; } };
  client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('Tests cannot publish'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
  const pool = { async end() { endCalls++; await Promise.allSettled(pendingRead ? [pendingRead] : []); ended++; }, async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('COUNT(*)')) { reads++; pendingRead = (async () => { await gate; if (failLate) throw new Error('Synthetic late shutdown read failure'); return { rows: [{ pending_enrollments: '0', approved_enrollments: '0', suspended_enrollments: '0', revoked_enrollments: '0', awaiting_acknowledgment: '0', pending_labs: '0' }] }; })(); return pendingRead; }
    assert.fail('Unexpected shutdown fixture query');
  } };
  const runtime = attachCertificationRuntime(client, {}, guildId, env, { createPool: () => pool });
  return { client, runtime, release, get reads() { return reads; }, get ended() { return ended; }, get endCalls() { return endCalls; } };
}
function selection() {
  let finish; const done = new Promise(resolve => { finish = resolve; });
  const i = { customId: 'cert:console:section', values: ['overview'], user: { id: owner }, guildId, deferred: false, replied: false, replies: [], isButton: () => false, isModalSubmit: () => false, isStringSelectMenu: () => true,
    async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); finish(); }, async editReply(payload) { this.replies.push(payload); finish(); } };
  return { i, done };
}
test('runtime detach after the default owner deadline waits for pool close and suppresses late success/failure', { timeout: 30000 }, async t => {
  for (const failLate of [false, true]) {
    const f = fixture(failLate); t.after(async () => { f.release(); await f.runtime.detach(); });
    f.client.emit('clientReady'); for (let n = 0; n < 3; n++) await tick(); assert.equal(f.runtime.ready, true);
    const first = selection(); f.client.emit('interactionCreate', first.i); await first.done; await tick();
    assert.equal(f.reads, 1); assert.equal(first.i.options.flags, 64); assert.equal(first.i.replies.length, 1); assert.match(first.i.replies[0].content, /result is not confirmed/); assert.deepEqual(first.i.replies[0].allowedMentions, { parse: [] });
    let closed = false; const closing = f.runtime.detach(); assert.equal(f.runtime.detach(), closing); void closing.then(() => { closed = true; }); await tick();
    assert.equal(f.runtime.ready, false); assert.equal(f.client.listenerCount('interactionCreate'), 0); assert.equal(f.client.listenerCount('clientReady'), 0); assert.equal(f.endCalls, 1); assert.equal(f.ended, 0); assert.equal(closed, false);
    const second = selection(); f.client.emit('interactionCreate', second.i); await tick(); assert.equal(f.reads, 1); assert.equal(second.i.replies.length, 0);
    f.release(); await closing; await tick(); assert.equal(f.ended, 1); assert.equal(closed, true); assert.equal(first.i.replies.length, 1); assert.equal(first.i.replies[0].embeds.length, 0); assert.equal(first.i.replies[0].components.length, 0);
  }
});
