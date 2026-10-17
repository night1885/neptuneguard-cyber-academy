import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';

const student = '1223123544301633568';
const other = '1223123544301633569';
const guild = '1339276399390887956';
const fields = { age: 'Yes', read: 'AGREE', answer0: 'stop' };
function fixture(content = 'Fixture agreement only.') {
  const hash = createHash('sha256').update(content).digest('hex');
  const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'For this test, enter stop.' }], correctAnswers: ['stop'] } };
  const calls = []; let connections = 0;
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ discord_user_id: student, status: 'awaiting_acknowledgment' }] };
    return { rows: [] };
  };
  const pool = { query, async connect() { connections++; return { query, release() {} }; } };
  return { config, pool, calls, get connections() { return connections; }, handle: createCertificationSubmissionHandler(pool, config, guild) };
}
function interaction(customId, kind = 'button', userId = student, guildId = guild, values = fields) {
  const result = { customId, user: { id: userId }, guildId, replies: [], modal: null, deferred: false, replied: false,
    isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal',
    fields: { getTextInputValue(key) { if (!Object.hasOwn(values, key)) throw new Error('Missing field'); return values[key]; } },
    async deferReply(options) { this.deferred = true; this.deferOptions = options; },
    async reply(payload) { this.replied = true; this.capture(payload); },
    async editReply(payload) { this.capture(payload); },
    async showModal(builder) { this.modal = builder.toJSON(); } };
  result.capture = payload => {
    assert.ok(!payload.content || payload.content.length <= 2000);
    result.replies.push({ ...payload, components: payload.components?.map(row => row.toJSON()) });
  };
  return result;
}
async function start(f) {
  const i = interaction('cert:submit:start'); await f.handle(i);
  const control = i.replies.at(-1).components[0].components[1].custom_id;
  return { i, token: control.split(':').at(-1), control };
}
async function openForm(f) {
  let { i, token, control } = await start(f);
  for (let n = 0; control.includes(':next:') && n < 50; n++) {
    i = interaction(control); await f.handle(i); control = i.replies.at(-1).components[0].components[1].custom_id;
  }
  assert.ok(control.includes(':form:'));
  const form = interaction(control); await f.handle(form); assert.ok(form.modal);
  return { token, form, sendId: form.modal.custom_id };
}
const wrote = f => f.calls.some(c => c.sql.includes('UPDATE certification_enrollments'));

test('private account acknowledgment has age and agreement fields but no name input', async () => {
  const f = fixture(); const { form, sendId } = await openForm(f);
  assert.deepEqual(form.modal.components.map(row => row.components[0].custom_id), ['age', 'read', 'answer0']);
  const i = interaction(sendId, 'modal'); await f.handle(i);
  assert.equal(i.deferOptions.flags, 64);
  assert.match(i.replies.at(-1).content, /submitted for admin review/);
  assert.deepEqual(i.replies.at(-1).allowedMentions, { parse: [] });
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.equal(update.params[0], student);
  assert.match(update.sql, /signature_method='discord_account'/);
  assert.match(update.sql, /age_eligible=TRUE/);
  assert.ok(!update.params.includes('Yes'));
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
});

for (const age of ['No', 'no', '', '18', 'y', ' yes ', undefined]) {
  test(`ineligible or invalid age answer never opens a database transaction: ${JSON.stringify(age)}`, async () => {
    const f = fixture(); const { sendId } = await openForm(f);
    const values = { ...fields, age }; if (age === undefined) delete values.age;
    const i = interaction(sendId, 'modal', student, guild, values); await f.handle(i);
    assert.equal(f.connections, 0); assert.equal(wrote(f), false);
    if (age === 'No' || age === 'no') assert.match(i.replies.at(-1).content, /requires age 18/);
    const replay = interaction(sendId, 'modal'); await f.handle(replay);
    assert.match(replay.replies.at(-1).content, /Session expired/);
  });
}

test('reading token alone is not an agreement acknowledgment', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  await f.handle(interaction(sendId, 'modal', student, guild, { ...fields, read: 'READ' }));
  assert.equal(f.connections, 0); assert.equal(wrote(f), false);
});

test('foreign user and guild cannot consume another learner session', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  for (const [user, server] of [[other, guild], [student, other]]) {
    await f.handle(interaction(sendId, 'modal', user, server)); assert.equal(wrote(f), false);
  }
  await f.handle(interaction(sendId, 'modal')); assert.equal(wrote(f), true);
});

test('modal token is one-use and replay does not duplicate writes', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  await f.handle(interaction(sendId, 'modal'));
  const count = f.calls.length; const replay = interaction(sendId, 'modal'); await f.handle(replay);
  assert.equal(f.calls.length, count); assert.match(replay.replies.at(-1).content, /Session expired/);
});

test('expired session cannot open a form', async () => {
  const f = fixture(); const { control } = await start(f); const original = Date.now;
  try {
    const now = original(); Date.now = () => now + 900001;
    const i = interaction(control); await f.handle(i);
    assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
  } finally { Date.now = original; }
});

test('restart invalidates process-local sessions', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  const restarted = createCertificationSubmissionHandler(f.pool, f.config, guild);
  const i = interaction(sendId, 'modal'); await restarted(i);
  assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
});

test('configuration changes block existing sessions', async () => {
  const f = fixture(); const { sendId } = await openForm(f); f.config.activeAgreementVersion = 'changed';
  const i = interaction(sendId, 'modal'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /unavailable/); assert.equal(wrote(f), false);
});

test('failed comprehension consumes token without updating enrollment', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  await f.handle(interaction(sendId, 'modal', student, guild, { ...fields, answer0: 'wrong' }));
  assert.equal(wrote(f), false);
  const replay = interaction(sendId, 'modal'); await f.handle(replay);
  assert.match(replay.replies.at(-1).content, /Session expired/);
});

test('pagination prevents opening a form before the last page', async () => {
  const f = fixture('Fixture text. '.repeat(300)); const { token, i } = await start(f);
  assert.equal(i.deferOptions.flags, 64);
  const skip = interaction(`cert:submit:form:${token}`); await f.handle(skip);
  assert.equal(skip.modal, null); assert.equal(wrote(f), false);
  assert.ok((await openForm(f)).form.modal);
});

test('disabled submission and direct modal attempts perform no queries', async () => {
  const f = fixture(); f.config.enrollmentSubmissionEnabled = false;
  const i = interaction('cert:submit:start'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /unavailable/); assert.equal(f.calls.length, 0);
  const active = fixture();
  await active.handle(interaction('cert:submit:send:00000000-0000-0000-0000-000000000000', 'modal'));
  assert.equal(active.calls.length, 0);
});

test('cancellation invalidates sessions without enrollment writes', async () => {
  const f = fixture(); const { token, control } = await start(f);
  await f.handle(interaction(`cert:submit:cancel:${token}`));
  const i = interaction(control); await f.handle(i);
  assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
});

test('database errors return generic responses without leaking details', async () => {
  const f = fixture(); f.pool.query = async () => { throw new Error('PRIVATE database details'); };
  const i = interaction('cert:submit:start'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /could not be completed/);
  assert.match(i.replies.at(-1).content, /check with the admin before retrying/);
  assert.ok(!i.replies.at(-1).content.includes('PRIVATE')); assert.equal(wrote(f), false);
});

test('agreement instructions request admin approval without promising access', async () => {
  const f = fixture(); const { i } = await start(f);
  assert.match(i.replies.at(-1).content, /Submission requests admin approval only; it grants no course or lab access/);
  assert.equal(f.connections, 0); assert.equal(wrote(f), false);
});
