import test from 'node:test';
import assert from 'node:assert/strict';
import { withStudentEntry, replyStudentStart } from './certification-student-entry.js';
const guild = '100000000000000003';
function fixture(overrides = {}) {
  const replies = [];
  const interaction = { commandName: 'start', guildId: guild, isChatInputCommand: () => true,
    async editReply(payload) { assert.equal(this, interaction); replies.push(payload); }, ...overrides };
  return { interaction, replies };
}
function assertNavigation(payload) {
  assert.equal(payload.components.length, 1);
  assert.deepEqual(payload.components[0].toJSON().components.map(c => c.custom_id), ['cert:initial:home', 'cert:learner:home']);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
}
test('explicit successful start supports revised wording without input mutation', async () => {
  const f = fixture(), payload = { content: 'A completely revised welcome.' };
  await replyStudentStart(withStudentEntry(f.interaction, guild, true), payload);
  assert.equal(payload.components, undefined);
  assert.equal(f.replies[0].content, payload.content);
  assertNavigation(f.replies[0]);
});
test('explicit success with legacy welcome adds navigation only once', async () => {
  const f = fixture();
  await replyStudentStart(withStudentEntry(f.interaction, guild, true), { content: '## Welcome to NeptuneGuard Cyber Academy\nYour learner profile is ready.' });
  assert.equal(f.replies.length, 1);
  assertNavigation(f.replies[0]);
});
test('explicit helper preserves existing controls', async () => {
  const f = fixture(), payload = { content: 'Ready', components: [{ type: 1 }] };
  await replyStudentStart(withStudentEntry(f.interaction, guild, true), payload);
  assert.equal(f.replies[0], payload);
});
test('unready, wrong-server and unrelated interactions do not gain controls', async () => {
  for (const [overrides, ready] of [[{}, false], [{ guildId: null }, true], [{ commandName: 'catalog' }, true], [{ isChatInputCommand: () => false }, true]]) {
    const f = fixture(overrides), payload = { content: 'Ready' };
    const wrapped = withStudentEntry(f.interaction, guild, ready);
    assert.equal(wrapped, f.interaction);
    await replyStudentStart(wrapped, payload);
    assert.equal(f.replies[0], payload);
  }
});
test('ordinary legacy welcome is not decorated without explicit success', async () => {
  const f = fixture(), payload = { content: '## Welcome to NeptuneGuard Cyber Academy\nYour learner profile is ready.' };
  await withStudentEntry(f.interaction, guild, true).editReply(payload);
  assert.equal(f.replies[0], payload);
  assert.equal(f.replies[0].components, undefined);
});
