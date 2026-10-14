import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';

const learner = '1223123544301633568'; const guild = '1339276399390887956';
const content = 'Renewal expiry fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
function fixture(t) {
  let clock = 1800000000000; let connections = 0; const calls = [];
  t.mock.method(Date, 'now', () => clock);
  const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: '1223123544301633567', activeAgreementVersion: 'expiry-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture question.' }], correctAnswers: ['stop'] } };
  const row = { status: 'suspended', student_id: 'NG-PT-fixture', approved_by: config.ownerId, approved_at: 'date', signature_method: 'typed_name', acknowledgment_name: 'Fixture Learner', agreement_version: config.activeAgreementVersion, agreement_content_sha256: hash, comprehension_check_version: 'fixture-check', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date' };
  const query = async (sql, params) => { calls.push({ sql, params }); if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] }; if (sql.includes('FOR UPDATE')) return { rows: [{ ...row }] }; return { rows: [] }; };
  const pool = { query, async connect() { connections++; return { query, release() {} }; } };
  return { handle: createCertificationSubmissionHandler(pool, config, guild), calls, advance(ms) { clock += ms; }, get connections() { return connections; } };
}
function interaction(customId, modal = false) {
  const values = { name: 'Fixture Learner', read: 'READ 16', answer0: 'stop' };
  return { customId, user: { id: learner }, guildId: guild, deferred: false, replied: false, replies: [], modal: null, isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: key => values[key] }, async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); }, async showModal(builder) { this.modal = builder.toJSON(); } };
}
async function reading(f) {
  let i = interaction('cert:submit:renew'); await f.handle(i);
  let control = i.replies.at(-1).components[0].components[1].data.custom_id;
  for (let n = 0; control.includes(':next:') && n < 50; n++) { i = interaction(control); await f.handle(i); control = i.replies.at(-1).components[0].components[1].data.custom_id; }
  assert.ok(control.includes(':form:')); return control;
}
async function form(f) { const i = interaction(await reading(f)); await f.handle(i); assert.ok(i.modal); return i.modal.custom_id; }
function assertExpired(i, f) { assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(i.replies.at(-1).flags, 64); assert.deepEqual(i.replies.at(-1).allowedMentions, { parse: [] }); assert.equal(f.connections, 0); assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.startsWith('INSERT'))); }

test('renewal modal expires at the exact 15-minute session boundary before checkout', async t => {
  const f = fixture(t); const id = await form(f); f.advance(900000);
  const i = interaction(id, true); await f.handle(i); assertExpired(i, f);
  const replay = interaction(id, true); await f.handle(replay); assertExpired(replay, f);
});
test('renewal reading session cannot open a form after its deadline', async t => {
  const f = fixture(t); const id = await reading(f); f.advance(900001);
  const i = interaction(id); await f.handle(i); assertExpired(i, f); assert.equal(i.modal, null);
});
test('renewal just before expiry completes once and cannot replay after expiry', async t => {
  const f = fixture(t); const id = await form(f); f.advance(899999);
  const i = interaction(id, true); await f.handle(i); assert.equal(f.connections, 1); assert.equal(i.options.flags, 64); assert.match(i.replies.at(-1).content, /Eligibility confirmation recorded/);
  const updates = f.calls.filter(c => c.sql.startsWith('UPDATE')); assert.equal(updates.length, 1); assert.equal(updates[0].params[0], learner); assert.ok(!updates[0].sql.includes('status=') && !updates[0].sql.includes('student_id='));
  f.advance(1); const replay = interaction(id, true); await f.handle(replay); assert.match(replay.replies.at(-1).content, /Session expired/); assert.equal(f.connections, 1); assert.equal(f.calls.filter(c => c.sql.startsWith('UPDATE')).length, 1);
});
