import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

const actor = '1223123544301633568';
const other = '1223123544301633569';
const guildId = '1339276399390887956';
const settings = () => ({ enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture',
  activeAgreementSha256: '0'.repeat(64), comprehensionCheck: { version: 'fixture',
    questions: [{ prompt: 'Test prompt.' }], correctAnswers: ['stop'] } });
function interaction(userId = actor) {
  return { customId: 'cert:submit:start', user: { id: userId }, guildId, replies: [], deferred: false,
    isButton: () => true, isModalSubmit: () => false,
    async deferReply() { this.deferred = true; },
    async editReply(payload) { this.replies.push(payload); },
    async reply(payload) { this.replies.push(payload); } };
}

test('guarded starts enforce three-attempt limit before querying agreement again', async () => {
  let calls = 0; const pool = { async query() { calls++; return { rows: [] }; } };
  const handle = createGuardedSubmissionHandler(pool, settings(), guildId);
  for (let i = 0; i < 3; i++) await handle(interaction());
  const blocked = interaction(); await handle(blocked);
  assert.equal(calls, 3); assert.match(blocked.replies[0].content, /Too many enrollment attempts/);
  assert.equal(blocked.replies[0].flags, 64); assert.deepEqual(blocked.replies[0].allowedMentions, { parse: [] });
});

test('same-user overlapping starts are blocked while another user can proceed', async () => {
  let release; let calls = 0;
  const pool = { query() { calls++; if (calls === 1) return new Promise(resolve => { release = resolve; }); return Promise.resolve({ rows: [] }); } };
  const handle = createGuardedSubmissionHandler(pool, settings(), guildId);
  const first = handle(interaction()); await Promise.resolve();
  const blocked = interaction(); await handle(blocked);
  assert.match(blocked.replies[0].content, /still processing/); assert.equal(calls, 1);
  await handle(interaction(other)); assert.equal(calls, 2);
  release({ rows: [] }); await first;
});

test('disabled submission remains unavailable without database access', async () => {
  const config = settings(); config.enrollmentSubmissionEnabled = false;
  const pool = { async query() { assert.fail('Database accessed while disabled'); } };
  const handle = createGuardedSubmissionHandler(pool, config, guildId);
  const i = interaction(); await handle(i); assert.match(i.replies[0].content, /unavailable/);
});
