import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationRouter } from './certification-router.js';

const learner = '1223123544301633568'; const other = '1223123544301633569'; const guild = '1339276399390887956';
const content = 'Routed renewal fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const values = { name: 'Fixture Learner', read: 'READ 16', answer0: 'stop' };
function fixture(status = 'suspended', enabled = true) {
  let connections = 0; const calls = [];
  const config = { enabled: true, enrollmentSubmissionEnabled: enabled, ownerId: '1223123544301633567', activeAgreementVersion: 'fixture-renewal', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture question.' }], correctAnswers: ['stop'] } };
  const row = { discord_user_id: learner, status, student_id: 'NG-PT-fixed', approved_by: config.ownerId, approved_at: 'date', signature_method: 'typed_name', acknowledgment_name: values.name, agreement_version: config.activeAgreementVersion, agreement_content_sha256: hash, comprehension_check_version: 'fixture-check', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date' };
  const query = async (sql, params) => { calls.push({ sql, params });
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ ...row }] };
    return { rows: [] };
  };
  const pool = { query, async connect() { connections++; return { query, release() {} }; } };
  return { config, pool, calls, route: createCertificationRouter(pool, config, guild), get connections() { return connections; } };
}
function click(id, modal = false, actor = learner, server = guild, fields = values) {
  return { customId: id, user: { id: actor }, guildId: server, replies: [], modal: null, deferred: false, replied: false, isButton: () => !modal, isModalSubmit: () => modal,
    fields: { getTextInputValue(key) { if (!(key in fields)) throw new Error('Missing field'); return fields[key]; } },
    async deferReply(options) { this.deferred = true; this.options = options; },
    async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); },
    async showModal(builder) { this.modal = builder.toJSON(); } };
}
async function openForm(f, entry = 'cert:submit:renew') {
  let i = click(entry); await f.route(i); let control = i.replies.at(-1).components[0].components[1].data.custom_id;
  for (let n = 0; control.includes(':next:') && n < 50; n++) { i = click(control); await f.route(i); control = i.replies.at(-1).components[0].components[1].data.custom_id; }
  assert.ok(control.includes(':form:')); const form = click(control); await f.route(form); assert.ok(form.modal);
  return { form, sendId: form.modal.custom_id };
}
test('routed suspended/revoked renewal is private, targets authenticated identity, and does not restore access', async () => {
  for (const status of ['suspended', 'revoked']) {
    const f = fixture(status); const { form, sendId } = await openForm(f); assert.match(form.modal.title, /renewal/);
    const i = click(sendId, true); await f.route(i); assert.equal(i.options.flags, 64);
    assert.match(i.replies.at(-1).content, /Eligibility confirmation recorded/); assert.match(i.replies.at(-1).content, /Owner reinstatement remains separate/);
    assert.deepEqual(i.replies.at(-1).allowedMentions, { parse: [] });
    const update = f.calls.find(c => c.sql.startsWith('UPDATE')); assert.equal(update.params[0], learner);
    assert.ok(!update.sql.includes('status=') && !update.sql.includes('student_id='));
    assert.ok(!f.calls.some(c => c.sql.includes('certification_lab_requests')));
  }
});
test('foreign learner and guild cannot consume a renewal session', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  await f.route(click(sendId, true, other)); await f.route(click(sendId, true, learner, other)); assert.equal(f.connections, 0);
  await f.route(click(sendId, true)); assert.equal(f.connections, 1);
});
test('renewal replay cannot checkout another connection', async () => {
  const f = fixture(); const { sendId } = await openForm(f); await f.route(click(sendId, true));
  const replay = click(sendId, true); await f.route(replay); assert.equal(f.connections, 1); assert.match(replay.replies.at(-1).content, /Session expired/);
});
test('below-16 and missing confirmation are rejected before checkout and consume the token', async () => {
  for (const read of ['READ 15', 'READ', '']) {
    const f = fixture(); const { sendId } = await openForm(f); const i = click(sendId, true, learner, guild, { ...values, read }); await f.route(i);
    assert.equal(f.connections, 0); assert.match(i.replies.at(-1).content, /age 16 or older/);
    const replay = click(sendId, true); await f.route(replay); assert.equal(f.connections, 0); assert.match(replay.replies.at(-1).content, /Session expired/);
  }
});
test('renewal shares the existing start-attempt budget with registration', async () => {
  const f = fixture(); for (const id of ['cert:submit:renew', 'cert:submit:start', 'cert:submit:renew']) await f.route(click(id));
  const blocked = click('cert:submit:renew'); await f.route(blocked);
  assert.match(blocked.replies.at(-1).content, /Too many enrollment attempts/); assert.equal(f.calls.length, 3);
});
test('disabled renewal and unsupported approved status cannot write eligibility', async () => {
  const disabled = fixture('suspended', false); await disabled.route(click('cert:submit:renew')); assert.equal(disabled.calls.length, 0);
  const f = fixture('approved'); const { sendId } = await openForm(f); await f.route(click(sendId, true));
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE')));
});
test('registration session cannot be converted into renewal by extra learner fields', async () => {
  const f = fixture(); const { sendId } = await openForm(f, 'cert:submit:start'); await f.route(click(sendId, true, learner, guild, { ...values, renewal: true }));
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.includes("'age_eligibility_renewed'")));
});
test('restart invalidates the server-bound renewal mode and token', async () => {
  const f = fixture(); const { sendId } = await openForm(f); const restarted = createCertificationRouter(f.pool, f.config, guild);
  const i = click(sendId, true); await restarted(i); assert.equal(f.connections, 0); assert.match(i.replies.at(-1).content, /Session expired/);
});
