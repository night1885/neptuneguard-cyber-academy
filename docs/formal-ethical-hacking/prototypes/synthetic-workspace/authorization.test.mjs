import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoundedDemoAuthorizer } from './authorization.mjs';
import { createSyntheticReviewStore } from './review.mjs';
const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const flush = () => new Promise(resolve => setImmediate(resolve));

test('only explicit true grants the synthetic check', async () => {
  const guard = createBoundedDemoAuthorizer({ check: async () => true });
  assert.equal(await guard.authorize(learner), true); assert.equal(guard.pendingCount(), 0);
});

test('other values fail closed without coercion', async () => {
  for (const value of [false, null, undefined, 1, 0, 'true', {}]) {
    const guard = createBoundedDemoAuthorizer({ check: async () => value });
    assert.equal(await guard.authorize(learner), false);
  }
});

test('synchronous throws and asynchronous rejection return false', async () => {
  for (const check of [() => { throw new Error('private diagnostic'); }, async () => { throw new Error('private diagnostic'); }]) {
    const guard = createBoundedDemoAuthorizer({ check });
    assert.equal(await guard.authorize(learner), false); assert.equal(guard.pendingCount(), 0);
  }
});

test('timeout denies but retains outstanding-work accounting', async () => {
  let release;
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 5, check: () => new Promise(resolve => { release = resolve; }) });
  const result = await guard.authorize(learner);
  assert.equal(result, false); assert.equal(guard.pendingCount(), 1);
  release(true); await flush();
  assert.equal(result, false); assert.equal(guard.pendingCount(), 0);
});

test('capacity denies extra work without starting another backend check', async () => {
  let calls = 0, release;
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 5, maxPending: 1, check: () => {
    calls++; return new Promise(resolve => { release = resolve; });
  } });
  const first = guard.authorize(learner);
  assert.equal(await guard.authorize(learner), false);
  assert.equal(await first, false); assert.equal(calls, 1);
  release(false); await flush(); assert.equal(guard.pendingCount(), 0);
});

test('dispose denies pending and future checks', async () => {
  let release;
  const guard = createBoundedDemoAuthorizer({ check: () => new Promise(resolve => { release = resolve; }) });
  const waiting = guard.authorize(learner); await flush(); guard.dispose();
  assert.equal(await waiting, false); assert.equal(await guard.authorize(learner), false);
  release(true); await flush(); assert.equal(guard.pendingCount(), 0);
});

test('invalid limits and missing dependencies are rejected', () => {
  assert.throws(() => createBoundedDemoAuthorizer());
  assert.throws(() => createBoundedDemoAuthorizer({ check: () => true, timeoutMs: 0 }));
  assert.throws(() => createBoundedDemoAuthorizer({ check: () => true, maxPending: 101 }));
});

test('late authorization cannot create a draft after a timed-out call', async () => {
  let first = true, release;
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 5, check: () => {
    if (first) { first = false; return new Promise(resolve => { release = resolve; }); }
    return true;
  } });
  const store = createSyntheticReviewStore({ authorize: guard.authorize });
  assert.deepEqual(await store.create(learner), { ok: false, reason: 'unavailable' });
  release(true); await flush();
  for (let i = 0; i < 20; i++) assert.equal((await store.create(learner)).ok, true);
  assert.equal((await store.create(learner)).ok, false);
});

test('timed-out submit releases the queue and never changes the revision later', async () => {
  let release;
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 5, check: q => q.action === 'submit'
    ? new Promise(resolve => { release = resolve; }) : true });
  const store = createSyntheticReviewStore({ authorize: guard.authorize });
  const id = (await store.create(learner)).record.id;
  const [result, queuedRead] = await Promise.all([
    store.submit(learner, { recordId: id, expectedRevision: 0, requestId: 'demo-request-a', evidenceRef: 'demo-evidence-a' }),
    store.read(learner, id)
  ]);
  assert.equal(result.ok, false); assert.equal(queuedRead.record.revision, 0);
  release(true); await flush(); assert.equal((await store.read(learner, id)).record.revision, 0);
});

test('disposal during the second create check prevents the model commit', async () => {
  let calls = 0, release, started;
  const ready = new Promise(resolve => { started = resolve; });
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 1000, check: () => {
    calls++; if (calls === 2) { started(); return new Promise(resolve => { release = resolve; }); } return true;
  } });
  const store = createSyntheticReviewStore({ authorize: guard.authorize });
  const waiting = store.create(learner); await ready; guard.dispose();
  assert.equal((await waiting).ok, false); release(true); await flush(); assert.equal(guard.pendingCount(), 0);
});

test('late synchronous completion is denied when execution resumes', async () => {
  const guard = createBoundedDemoAuthorizer({ timeoutMs: 2, check: () => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    return true;
  } });
  assert.equal(await guard.authorize(learner), false);
  assert.equal(guard.pendingCount(), 0);
});
