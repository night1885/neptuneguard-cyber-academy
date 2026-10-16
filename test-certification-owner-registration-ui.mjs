import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerRegistrationHandler } from './certification-owner-registration-ui.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
function fixture() {
  let time = 0;
  const queries = [];
  const pool = { async connect() { return { async query(sql, values) { queries.push({ sql, values }); return { rows: sql.includes('INSERT INTO certification_enrollments') ? [{ discord_user_id: student, status: 'awaiting_acknowledgment', student_id: null }] : [] }; }, release() {} }; } };
  const handle = createOwnerRegistrationHandler(pool, { enabled: true, ownerId: owner }, guild, { now: () => time });
  return { handle, queries, advance: () => { time = 300000; } };
}
function interaction(id, { modal = false, actor = owner, server = guild, value = student } = {}) {
  const replies = [];
  return { customId: id, user: { id: actor }, guildId: server, replies, isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: () => value }, async reply(payload) { replies.push(payload); }, async deferReply(payload) { replies.push(payload); }, async editReply(payload) { replies.push(payload); }, async showModal(payload) { replies.push(payload.toJSON()); } };
}
async function prepare(f) {
  const i = interaction('cert:register:submit', { modal: true });
  await f.handle(i);
  assert.equal(i.replies[0].flags, 64);
  return i.replies[0].components[0].toJSON().components[0].custom_id;
}

test('unauthorized actor and wrong server never connect or open a modal', async () => {
  const f = fixture();
  for (const options of [{ actor: student }, { server: '444444444444444444' }]) {
    const i = interaction('cert:register:open', options);
    await f.handle(i);
    assert.match(i.replies[0].content, /Admin authorization/);
  }
  assert.equal(f.queries.length, 0);
});

test('form opening and submission do not write records', async () => {
  const f = fixture();
  const i = interaction('cert:register:open');
  await f.handle(i);
  assert.equal(i.replies[0].custom_id, 'cert:register:submit');
  await prepare(f);
  assert.equal(f.queries.length, 0);
});

test('invalid student ID does not create confirmation or query database', async () => {
  const f = fixture();
  const i = interaction('cert:register:submit', { modal: true, value: 'invalid' });
  await f.handle(i);
  assert.match(i.replies[0].content, /numeric Discord/);
  assert.equal(f.queries.length, 0);
});

test('cancellation consumes the confirmation without writes', async () => {
  const f = fixture();
  const id = await prepare(f);
  await f.handle(interaction(id.replace(':confirm:', ':cancel:')));
  const replay = interaction(id);
  await f.handle(replay);
  assert.match(replay.replies[0].content, /expired/);
  assert.equal(f.queries.length, 0);
});

test('confirmation expires at five minutes', async () => {
  const f = fixture();
  const id = await prepare(f);
  f.advance();
  const i = interaction(id);
  await f.handle(i);
  assert.match(i.replies[0].content, /expired/);
  assert.equal(f.queries.length, 0);
});

test('confirmation uses bound student ID and cannot be replayed', async () => {
  const f = fixture();
  const id = await prepare(f);
  const denied = interaction(id, { actor: student });
  await f.handle(denied);
  assert.equal(f.queries.length, 0);
  const confirmed = interaction(id);
  await f.handle(confirmed);
  const insert = f.queries.find(q => q.sql.includes('INSERT INTO certification_enrollments'));
  assert.deepEqual(insert.values, [student]);
  assert.match(confirmed.replies.at(-1).content, /Course access is not active/);
  const count = f.queries.length;
  const replay = interaction(id);
  await f.handle(replay);
  assert.match(replay.replies[0].content, /expired/);
  assert.equal(f.queries.length, count);
});

test('successful registration explains the learner next step without sending a DM or granting access', async () => {
  const f = fixture(), id = await prepare(f), confirmed = interaction(id);
  confirmed.client = { users: { fetch() { assert.fail('Registration must not send learner messages'); } } };
  await f.handle(confirmed);
  const payload = confirmed.replies.at(-1);
  assert.match(payload.content, /run \/start in this server/);
  assert.match(payload.content, /Registration \/ application console/);
  assert.match(payload.content, /With the agreement manifest configured/);
  assert.match(payload.content, /separate admin decision/);
  assert.match(payload.content, /No DM was sent/);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.equal(payload.components[0].toJSON().components[0].custom_id, `cert:students:detail:${student}`);
  const audit = f.queries.find(query => query.sql.includes('INSERT INTO certification_audit_events'));
  assert.match(audit.sql, /student_registered_by_owner/);
  assert.equal(JSON.parse(audit.values[2]).accessGranted, false);
  assert.ok(!f.queries.some(query => /^UPDATE/.test(query.sql)));
});
