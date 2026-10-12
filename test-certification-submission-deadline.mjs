import test from 'node:test';
import assert from 'node:assert/strict';
import { observeSubmissionOperation } from './certification-submission-deadline.js';
import { createSubmissionAttemptGuard } from './certification-submission-attempts.js';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

const actor = '1223123544301633568';
const guildId = '1339276399390887956';

test('completed operation returns normally without timeout notification', async () => {
  assert.deepEqual(await observeSubmissionOperation(Promise.resolve('done'), () => assert.fail('Unexpected timeout'), 20), { timedOut: false, value: 'done' });
});

test('operation failure before deadline is propagated', async () => {
  await assert.rejects(observeSubmissionOperation(Promise.reject(new Error('Failed')), () => assert.fail('Unexpected timeout'), 20), /Failed/);
});

test('response timeout never releases a busy learner lock before underlying work settles', async () => {
  const guard = createSubmissionAttemptGuard(); let release; let notices = 0;
  const processing = guard.run(actor, 'send', () => new Promise(resolve => { release = resolve; }));
  assert.deepEqual(await observeSubmissionOperation(processing, () => { notices++; }, 5), { timedOut: true });
  assert.equal(notices, 1);
  assert.equal((await guard.run(actor, 'start', () => assert.fail('Lock released early'))).reason, 'busy');
  release('finished'); await processing;
  assert.equal((await guard.run(actor, 'navigate', async () => true)).allowed, true);
});

test('late operation rejection settles the original lock without a second timeout notification', async () => {
  const guard = createSubmissionAttemptGuard(); let reject; let notices = 0;
  const processing = guard.run(actor, 'send', () => new Promise((_, fail) => { reject = fail; }));
  await observeSubmissionOperation(processing, () => { notices++; }, 5);
  reject(new Error('Late failure')); await assert.rejects(processing, /Late failure/);
  assert.equal(notices, 1);
  assert.equal((await guard.run(actor, 'cancel', async () => true)).allowed, true);
});

test('integrated timeout warns privately, blocks overlap, and suppresses later handler replies', async () => {
  const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture',
    activeAgreementSha256: '0'.repeat(64), comprehensionCheck: { version: 'fixture',
      questions: [{ prompt: 'Test question.' }], correctAnswers: ['stop'] } };
  let release; let calls = 0;
  const pool = { query() { calls++; return calls === 1
    ? new Promise(resolve => { release = resolve; }) : Promise.resolve({ rows: [] }); } };
  const handle = createGuardedSubmissionHandler(pool, config, guildId, { responseTimeoutMs: 5 });
  const make = () => ({ customId: 'cert:submit:start', user: { id: actor }, guildId, replies: [], deferred: false,
    isButton: () => true, isModalSubmit: () => false,
    async deferReply(options) { this.deferred = true; this.deferOptions = options; },
    async editReply(payload) { this.replies.push(payload); }, async reply(payload) { this.replies.push(payload); } });
  const first = make(); await handle(first);
  assert.equal(first.deferOptions.flags, 64);
  assert.match(first.replies[0].content, /outcome is not confirmed/);
  assert.deepEqual(first.replies[0].allowedMentions, { parse: [] });
  const blocked = make(); await handle(blocked);
  assert.match(blocked.replies[0].content, /still processing/); assert.equal(calls, 1);
  release({ rows: [] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(first.replies.length, 1);
  await handle(make()); assert.equal(calls, 2);
});
