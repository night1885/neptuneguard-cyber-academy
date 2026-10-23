import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachCommunityLifecycle } from './community-learning-runtime.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({ fail = false, pending } = {}) {
  const client = new EventEmitter(); client.isReady = () => false;
  const state = { closed: 0, calls: 0, observations: [], logs: [] };
  const runtime = attachCommunityLifecycle({ client, enabled: true, log: message => state.logs.push(message),
    createRoute: ready => async () => { state.calls++; state.observations.push(ready()); if (pending) await pending; },
    initialize: async () => { if (fail) throw new Error('private connection detail'); return { ready: true }; }, close: async () => { state.closed++; } });
  return { client, state, runtime };
}
test('default-off lifecycle installs no handlers or storage callbacks', async () => {
  const client = new EventEmitter(); const runtime = attachCommunityLifecycle({ client, enabled: false });
  assert.equal(client.eventNames().length, 0); assert.equal(runtime.ready, false); await runtime.detach();
});
test('readiness opens only after successful initialization', async () => {
  const f = fixture(); assert.equal(f.runtime.ready, false); f.client.emit('clientReady'); await tick(); assert.equal(f.runtime.ready, true);
  f.client.emit('interactionCreate', {}); await tick(); assert.deepEqual(f.state.observations, [true]); await f.runtime.detach();
});
test('failed startup stays closed and logs no connection details', async () => {
  const f = fixture({ fail: true }); f.client.emit('clientReady'); await tick(); assert.equal(f.runtime.ready, false);
  assert.ok(!f.state.logs.join('').includes('private connection detail')); await f.runtime.detach();
});
test('shutdown stops admission immediately, drains work, and closes once', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }); const f = fixture({ pending });
  f.client.emit('clientReady'); await tick(); f.client.emit('interactionCreate', {}); await tick();
  const closing = f.runtime.detach(); assert.equal(f.runtime.ready, false); assert.equal(f.state.closed, 0);
  f.client.emit('interactionCreate', {}); assert.equal(f.state.calls, 1); release(); await closing; await f.runtime.detach(); assert.equal(f.state.closed, 1);
});
test('shutdown during initialization cannot reopen readiness', async () => {
  let release; const client = new EventEmitter(); client.isReady = () => false;
  const runtime = attachCommunityLifecycle({ client, enabled: true, createRoute: () => async () => {}, initialize: () => new Promise(resolve => { release = resolve; }), close: async () => {} });
  client.emit('clientReady'); await tick(); const closing = runtime.detach(); release({ ready: true }); await closing; assert.equal(runtime.ready, false);
});
