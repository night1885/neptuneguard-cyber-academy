import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';

const student = '1223123544301633568';
const other = '1223123544301633569';
const guild = '1339276399390887956';
const fields = { name: 'Example Learner', read: 'READ', answer0: 'stop' };

function fixture(content = 'Fixture agreement only.') {
  const hash = createHash('sha256').update(content).digest('hex');
  const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2',
    activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check',
      questions: [{ prompt: 'For this test, enter stop.' }], correctAnswers: ['stop'] } };
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ status: 'awaiting_acknowledgment' }] };
    return { rows: [] };
  };
  const pool = { query, async connect() { return { query, release() {} }; } };
  return { config, pool, calls, handle: createCertificationSubmissionHandler(pool, config, guild) };
}

function interaction(customId, kind = 'button', userId = student, guildId = guild, values = fields) {
  const result = { customId, user: { id: userId }, guildId, replies: [], modal: null,
    deferred: false, replied: false, isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal',
    fields: { getTextInputValue(key) { if (!(key in values)) throw new Error('Missing field'); return values[key]; } },
    async deferReply(options) { this.deferred = true; this.deferOptions = options; },
    async reply(payload) { this.replied = true; this.capture(payload); },
    async editReply(payload) { this.capture(payload); },
    async showModal(builder) { this.modal = builder.toJSON(); }
  };
  result.capture = payload => {
    assert.ok(!payload.content || payload.content.length <= 2000);
    const serialized = { ...payload, components: payload.components?.map(row => row.toJSON()) };
    result.replies.push(serialized);
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
    i = interaction(control); await f.handle(i);
    control = i.replies.at(-1).components[0].components[1].custom_id;
  }
  assert.ok(control.includes(':form:'));
  const form = interaction(control); await f.handle(form); assert.ok(form.modal);
  return { token, form, sendId: form.modal.custom_id };
}
const wrote = f => f.calls.some(c => c.sql.includes('UPDATE certification_enrollments'));

test('successful private flow serializes builders and submits the authenticated learner only', async () => {
  const f = fixture(); const { form, sendId } = await openForm(f);
  assert.equal(form.modal.components.length, 3);
  const i = interaction(sendId, 'modal'); await f.handle(i);
  assert.equal(i.deferOptions.flags, 64);
  assert.match(i.replies.at(-1).content, /submitted for owner review/);
  assert.deepEqual(i.replies.at(-1).allowedMentions, { parse: [] });
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.equal(update.params[0], student);
  assert.ok(!i.replies.at(-1).content.includes(fields.name));
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
});

test('foreign user and foreign guild cannot use a session or submit', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  for (const [user, server] of [[other, guild], [student, other]]) {
    const i = interaction(sendId, 'modal', user, server); await f.handle(i);
    assert.equal(wrote(f), false);
  }
  const valid = interaction(sendId, 'modal'); await f.handle(valid); assert.equal(wrote(f), true);
});

test('modal token is one-use and replay does not duplicate database writes', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  await f.handle(interaction(sendId, 'modal'));
  const count = f.calls.length; const replay = interaction(sendId, 'modal'); await f.handle(replay);
  assert.equal(f.calls.length, count); assert.match(replay.replies.at(-1).content, /Session expired/);
});

test('expired session cannot open the form', async () => {
  const f = fixture(); const { control } = await start(f); const original = Date.now;
  try {
    const now = original(); Date.now = () => now + 900001;
    const i = interaction(control); await f.handle(i);
    assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
  } finally { Date.now = original; }
});

test('restart invalidates process-local session tokens', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  const restarted = createCertificationSubmissionHandler(f.pool, f.config, guild);
  const i = interaction(sendId, 'modal'); await restarted(i);
  assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
});

test('configuration changes block an existing submission session', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  f.config.activeAgreementVersion = 'changed';
  const i = interaction(sendId, 'modal'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /unavailable/); assert.equal(wrote(f), false);
});

test('failed comprehension consumes token and never updates enrollment', async () => {
  const f = fixture(); const { sendId } = await openForm(f);
  const i = interaction(sendId, 'modal', student, guild, { ...fields, answer0: 'wrong' }); await f.handle(i);
  assert.equal(wrote(f), false);
  const replay = interaction(sendId, 'modal'); await f.handle(replay);
  assert.match(replay.replies.at(-1).content, /Session expired/);
});

test('pagination prevents opening a form before the last page', async () => {
  const f = fixture('Fixture text. '.repeat(300)); const { token, i } = await start(f);
  assert.equal(i.deferOptions.flags, 64);
  const skip = interaction(`cert:submit:form:${token}`); await f.handle(skip);
  assert.equal(skip.modal, null); assert.equal(wrote(f), false);
  const complete = await openForm(f); assert.ok(complete.form.modal);
});

test('disabled submission and direct modal attempts perform no writes', async () => {
  const f = fixture(); f.config.enrollmentSubmissionEnabled = false;
  const i = interaction('cert:submit:start'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /unavailable/); assert.equal(f.calls.length, 0);
  const active = fixture();
  await active.handle(interaction('cert:submit:send:00000000-0000-0000-0000-000000000000', 'modal'));
  assert.equal(active.calls.length, 0);
});

test('cancellation invalidates the session without database writes', async () => {
  const f = fixture(); const { token, control } = await start(f);
  await f.handle(interaction(`cert:submit:cancel:${token}`));
  const i = interaction(control); await f.handle(i);
  assert.match(i.replies.at(-1).content, /Session expired/); assert.equal(wrote(f), false);
});

test('agreement database errors return a generic response without leaking details', async () => {
  const f = fixture(); f.pool.query = async () => { throw new Error('PRIVATE database details'); };
  const i = interaction('cert:submit:start'); await f.handle(i);
  assert.match(i.replies.at(-1).content, /could not be completed/);
  assert.ok(!i.replies.at(-1).content.includes('PRIVATE')); assert.equal(wrote(f), false);
});
