import test from 'node:test';
import assert from 'node:assert/strict';
import { withStudentEntry } from './certification-student-entry.js';
const guild = '100000000000000003';
const welcome = { content: '## Welcome to NeptuneGuard Cyber Academy\n\nYour learner profile is ready.' };
function fixture(overrides = {}) {
  const replies = [];
  const interaction = { commandName: 'start', guildId: guild, isChatInputCommand: () => true, async editReply(payload) { assert.equal(this, interaction); replies.push(payload); }, ...overrides };
  return { interaction, replies };
}
test('successful start gets a panel entry without modifying its text or input', async () => {
  const f = fixture(); await withStudentEntry(f.interaction, guild, true).editReply(welcome);
  assert.equal(f.replies[0].content, welcome.content); assert.equal(welcome.components, undefined);
  assert.equal(f.replies[0].components[0].toJSON().components[0].custom_id, 'cert:learner:home');
  assert.deepEqual(f.replies[0].allowedMentions, { parse: [] });
});
test('errors and existing controls remain unchanged', async () => {
  const f = fixture(); const adapter = withStudentEntry(f.interaction, guild, true);
  for (const payload of [{ content: 'Complete server verification first.' }, { ...welcome, components: [{ type: 1 }] }]) {
    await adapter.editReply(payload); assert.equal(f.replies.at(-1), payload);
  }
});
test('disabled, unready, wrong-guild and unrelated interactions are untouched', () => {
  const f = fixture(); assert.equal(withStudentEntry(f.interaction, guild, false), f.interaction);
  for (const options of [{ guildId: null }, { commandName: 'catalog' }, { isChatInputCommand: () => false }]) {
    const other = fixture(options); assert.equal(withStudentEntry(other.interaction, guild, true), other.interaction);
  }
});
