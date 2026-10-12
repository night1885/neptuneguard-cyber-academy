import test from 'node:test';
import assert from 'node:assert/strict';
import { createStatusReadGuard, StatusReadLimitError } from './certification-status-read-guard.js';
import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

const actor = '1223123544301633568'; const other = '1223123544301633567'; const guild = '1339276399390887956';
const limited = reason => error => error instanceof StatusReadLimitError && error.reason === reason;
function interaction(user = actor, target) {
  return { user: { id: user }, guildId: guild, customId: target ? `cert:submit:status:${target}` : 'cert:submit:status', replies: [],
    isButton: () => true, isModalSubmit: () => false,
    async deferReply(options) { this.options = options; this.deferred = true; },
    async editReply(payload) { this.replies.push(payload); } };
}

test('fixed-window actor limit rejects without work and expires', async () => {
  let time = 0; let calls = 0; const guard = createStatusReadGuard({ now: () => time, limit: 2 });
  const work = async () => ++calls;
  await guard.run(actor, work); await guard.run(actor, work);
  await assert.rejects(guard.run(actor, work), limited('rate_limit')); assert.equal(calls, 2);
  time = 60000; await guard.run(actor, work); assert.equal(calls, 3);
});
test('pending query remains busy across window expiry and globally bounds work', async () => {
  let time = 0; let release; const guard = createStatusReadGuard({ now: () => time, maxInFlight: 1 });
  const pending = guard.run(actor, () => new Promise(resolve => { release = resolve; }));
  time = 60001;
  await assert.rejects(guard.run(actor, async () => {}), limited('busy'));
  await assert.rejects(guard.run(other, async () => {}), limited('capacity'));
  release('done'); assert.equal(await pending, 'done');
  await guard.run(other, async () => {});
});
test('actor storage is bounded and expired entries are reclaimed', async () => {
  let time = 0; const guard = createStatusReadGuard({ now: () => time, maxEntries: 1, maxInFlight: 1 });
  await guard.run(actor, async () => {});
  await assert.rejects(guard.run(other, async () => {}), limited('capacity'));
  time = 60000; await guard.run(other, async () => {});
});
test('failed work releases concurrency but still consumes an attempt', async () => {
  const guard = createStatusReadGuard({ limit: 1 });
  await assert.rejects(guard.run(actor, async () => { throw new Error('fixture'); }), /fixture/);
  await assert.rejects(guard.run(actor, async () => {}), limited('rate_limit'));
  await guard.run(other, async () => {});
});
test('invalid limit configuration is rejected', () => {
  for (const options of [{ limit: 0 }, { windowMs: -1 }, { now: null }, { maxEntries: 1, maxInFlight: 2 }]) assert.throws(() => createStatusReadGuard(options));
});
test('routed owner reads share actor budget across target changes and remain private', async () => {
  let calls = 0; const pool = { async query() { calls++; return { rows: [] }; } };
  const route = createGuardedSubmissionHandler(pool, { enabled: true, ownerId: actor }, guild);
  for (let index = 0; index < 5; index++) await route(interaction(actor, index % 2 ? other : actor));
  const blocked = interaction(actor, other); await route(blocked);
  assert.equal(calls, 5); assert.equal(blocked.options.flags, 64);
  assert.match(blocked.replies[0].content, /Too many status lookups/);
  assert.deepEqual(blocked.replies[0].allowedMentions, { parse: [] });
});
test('response timeout does not release query guard or send a late reply', async () => {
  let release; let calls = 0;
  const pool = { query() { calls++; return new Promise(resolve => { release = resolve; }); } };
  const route = createGuardedSubmissionHandler(pool, { enabled: true, ownerId: other }, guild, { responseTimeoutMs: 5 });
  const first = interaction(); await route(first);
  assert.match(first.replies[0].content, /could not be confirmed in time/);
  const second = interaction(); await route(second);
  assert.equal(calls, 1); assert.match(second.replies[0].content, /still processing/);
  release({ rows: [] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(first.replies.length, 1);
});
