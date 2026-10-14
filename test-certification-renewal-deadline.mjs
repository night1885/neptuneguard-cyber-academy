import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

const learner = '1223123544301633568'; const guild = '1339276399390887956';
const content = 'Renewal deadline fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
function fixture(failCommit) {
  let unblock; let finish; let connections = 0; let committed = false; let rolledBack = false;
  const gate = new Promise(resolve => { unblock = resolve; });
  const finished = new Promise(resolve => { finish = resolve; }); const calls = [];
  const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: '1223123544301633567', activeAgreementVersion: 'deadline-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture question.' }], correctAnswers: ['stop'] } };
  const row = { status: 'suspended', student_id: 'NG-PT-fixture', approved_by: config.ownerId, approved_at: 'date', signature_method: 'typed_name', acknowledgment_name: 'Fixture Learner', agreement_version: config.activeAgreementVersion, agreement_content_sha256: hash, comprehension_check_version: 'fixture-check', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date' };
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ ...row }] };
    if (sql === 'COMMIT') { await gate; if (failCommit) throw new Error('Synthetic private database failure'); committed = true; }
    if (sql === 'ROLLBACK') rolledBack = true;
    return { rows: [] };
  };
  const pool = { query, async connect() { connections++; return { query, release() { finish(); } }; } };
  return { handle: createGuardedSubmissionHandler(pool, config, guild, { responseTimeoutMs: 50 }), calls, unblock, finished, get connections() { return connections; }, get committed() { return committed; }, get rolledBack() { return rolledBack; } };
}
function interaction(customId, modal = false) {
  const values = { name: 'Fixture Learner', read: 'READ 16', answer0: 'stop' };
  return { customId, user: { id: learner }, guildId: guild, deferred: false, replied: false, replies: [], modal: null, isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: key => values[key] }, async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); }, async showModal(builder) { this.modal = builder.toJSON(); } };
}
async function form(f) {
  let i = interaction('cert:submit:renew'); await f.handle(i); let control = i.replies.at(-1).components[0].components[1].data.custom_id;
  for (let n = 0; control.includes(':next:') && n < 50; n++) { i = interaction(control); await f.handle(i); control = i.replies.at(-1).components[0].components[1].data.custom_id; }
  assert.ok(control.includes(':form:')); i = interaction(control); await f.handle(i); assert.ok(i.modal); return i.modal.custom_id;
}
for (const failCommit of [false, true]) test(`renewal timeout suppresses late ${failCommit ? 'failure' : 'success'} and keeps active work guarded`, { timeout: 5000 }, async () => {
  const f = fixture(failCommit);
  try {
    const id = await form(f); const i = interaction(id, true); await f.handle(i);
    assert.equal(f.connections, 1); assert.equal(f.committed, false); assert.equal(i.options.flags, 64); assert.equal(i.replies.length, 1);
    const reply = i.replies[0]; assert.match(reply.content, /outcome is not confirmed/); assert.match(reply.content, /does not cancel database work or grant access/); assert.deepEqual(reply.allowedMentions, { parse: [] });
    assert.ok(f.calls.some(c => c.sql === 'COMMIT'));
    const overlap = interaction('cert:submit:renew'); await f.handle(overlap); assert.match(overlap.replies.at(-1).content, /still processing/); assert.equal(f.connections, 1);
    f.unblock(); await f.finished; await nextTurn();
    assert.equal(f.committed, !failCommit); assert.equal(f.rolledBack, failCommit); assert.equal(i.replies.length, 1); assert.deepEqual(i.replies[0], reply); assert.ok(!i.replies[0].content.includes('Synthetic private database failure'));
    const replay = interaction(id, true); await f.handle(replay); assert.match(replay.replies.at(-1).content, /Session expired/); assert.equal(f.connections, 1);
    const updates = f.calls.filter(c => c.sql.startsWith('UPDATE')); assert.equal(updates.length, 1); assert.equal(updates[0].params[0], learner); assert.ok(!updates[0].sql.includes('status=') && !updates[0].sql.includes('student_id=')); assert.ok(!f.calls.some(c => c.sql.includes('certification_lab_requests')));
  } finally { f.unblock(); }
});
