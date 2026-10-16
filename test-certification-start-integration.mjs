import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { withStudentEntry } from './certification-student-entry.js';

const source = await readFile(new URL('./index.js', import.meta.url), 'utf8');
const start = source.indexOf('async function handleAcademyInteraction(interaction)');
const end = source.indexOf('\nconst application =', start);
assert.ok(start >= 0 && end > start, 'Locate the real handler without starting the bot');
const handlerSource = source.slice(start, end);
const guildId = '100000000000000003';

async function exercise({ ready = true, verified = true, wrongGuild = false, profileFails = false } = {}) {
  const replies = [];
  let profiles = 0;
  const interaction = {
    commandName: 'start', guildId: wrongGuild ? '100000000000000004' : guildId,
    user: { id: '100000000000000005' }, deferred: false, replied: false,
    isButton: () => false, isChatInputCommand: () => true, isRepliable: () => true,
    async deferReply() { this.deferred = true; },
    async editReply(payload) { this.replied = true; replies.push(payload); },
    async reply(payload) { this.replied = true; replies.push(payload); },
    async followUp(payload) { replies.push(payload); }
  };
  const handler = runInNewContext('(' + handlerSource + ')', {
    config: { guildId }, MessageFlags: { Ephemeral: 64 },
    userHasVerifiedRole: async () => verified,
    ensureProfile: async () => { profiles++; if (profileFails) throw new Error('fixture profile failure'); },
    console: { error() {} }
  });
  await handler(withStudentEntry(interaction, guildId, ready));
  return { replies, profiles };
}

const controls = result => result.replies.flatMap(payload => payload.components || []);
test('real successful start exposes both student navigation buttons when ready', async () => {
  const result = await exercise();
  assert.equal(result.profiles, 1);
  assert.equal(result.replies.length, 1);
  assert.deepEqual(controls(result).flatMap(row => row.toJSON().components.map(button => button.custom_id)), ['cert:initial:home', 'cert:learner:home']);
});
test('real successful start has no student navigation when unready', async () => {
  const result = await exercise({ ready: false });
  assert.equal(result.profiles, 1);
  assert.equal(result.replies.length, 1);
  assert.equal(controls(result).length, 0);
});
test('wrong server is rejected before profile creation', async () => {
  const result = await exercise({ wrongGuild: true });
  assert.equal(result.profiles, 0);
  assert.equal(controls(result).length, 0);
  assert.match(result.replies[0].content, /not configured/);
});
test('unverified student is rejected before profile creation', async () => {
  const result = await exercise({ verified: false });
  assert.equal(result.profiles, 0);
  assert.equal(controls(result).length, 0);
  assert.match(result.replies[0].content, /Verified role/);
});
test('profile creation failure returns an error without navigation', async () => {
  const result = await exercise({ profileFails: true });
  assert.equal(result.profiles, 1);
  assert.equal(controls(result).length, 0);
  assert.match(result.replies[0].content, /encountered an error/);
});
