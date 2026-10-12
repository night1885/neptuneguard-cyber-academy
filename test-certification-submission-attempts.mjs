import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionAttemptGuard } from './certification-submission-attempts.js';

const actor = '1223123544301633568';
const other = '1223123544301633569';

test('same learner cannot run concurrent actions; another learner can', async () => {
  const guard = createSubmissionAttemptGuard(); let release;
  const first = guard.run(actor, 'start', () => new Promise(resolve => { release = resolve; }));
  assert.deepEqual(await guard.run(actor, 'send', () => assert.fail('Concurrent operation ran')), { allowed: false, reason: 'busy' });
  assert.deepEqual(await guard.run(other, 'start', async () => 'other'), { allowed: true, value: 'other' });
  release('done'); assert.deepEqual(await first, { allowed: true, value: 'done' });
  assert.equal((await guard.run(actor, 'navigate', async () => true)).allowed, true);
});

test('three starts per fixed minute window, then retry at window expiry', async () => {
  let now = 0; const guard = createSubmissionAttemptGuard({ clock: () => now });
  for (let i = 0; i < 3; i++) assert.equal((await guard.run(actor, 'start', async () => true)).allowed, true);
  assert.deepEqual(await guard.run(actor, 'start', () => assert.fail('Limited operation ran')), { allowed: false, reason: 'rate_limit', retryAfterMs: 60000 });
  now = 60000; assert.equal((await guard.run(actor, 'start', async () => true)).allowed, true);
});

test('five sends per fixed fifteen-minute window', async () => {
  let now = 0; const guard = createSubmissionAttemptGuard({ clock: () => now });
  for (let i = 0; i < 5; i++) await guard.run(actor, 'send', async () => true);
  assert.equal((await guard.run(actor, 'send', () => assert.fail('Limited operation ran'))).reason, 'rate_limit');
  now = 900000; assert.equal((await guard.run(actor, 'send', async () => true)).allowed, true);
});

test('failed operations release the lock but still consume attempt allowance', async () => {
  const guard = createSubmissionAttemptGuard();
  for (let i = 0; i < 3; i++) await assert.rejects(guard.run(actor, 'start', async () => { throw new Error('Failed'); }), /Failed/);
  assert.equal((await guard.run(actor, 'start', () => assert.fail('Allowance reset incorrectly'))).reason, 'rate_limit');
  assert.equal((await guard.run(actor, 'cancel', async () => true)).allowed, true);
});

test('actor storage is bounded and inactive actors expire after thirty minutes', async () => {
  let now = 0; const guard = createSubmissionAttemptGuard({ clock: () => now, maxActors: 1 });
  await guard.run(actor, 'start', async () => true);
  assert.equal((await guard.run(other, 'start', () => assert.fail('Capacity bypass'))).reason, 'capacity');
  now = 1800000; assert.equal((await guard.run(other, 'start', async () => true)).allowed, true);
});

test('busy actors are not expired or evicted while their operation runs', async () => {
  let now = 0; let release; const guard = createSubmissionAttemptGuard({ clock: () => now, maxActors: 1 });
  const active = guard.run(actor, 'start', () => new Promise(resolve => { release = resolve; }));
  now = 1800000; assert.equal((await guard.run(other, 'start', () => assert.fail('Busy actor evicted'))).reason, 'capacity');
  release(true); await active;
});

test('invalid actors, actions, and backward clocks fail safely', async () => {
  let now = 10; const guard = createSubmissionAttemptGuard({ clock: () => now });
  assert.equal((await guard.run('invalid', 'start', () => assert.fail('Invalid actor ran'))).reason, 'invalid_actor');
  await assert.rejects(guard.run(actor, '__proto__', async () => true), /Invalid guarded action/);
  await guard.run(actor, 'start', async () => true); now = 9;
  await assert.rejects(guard.run(actor, 'start', async () => true), /monotonic clock/);
});
