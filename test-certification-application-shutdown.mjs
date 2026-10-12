import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createApplicationShutdown } from './certification-application-shutdown.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(overrides = {}) {
  const calls = []; const exits = []; const logs = []; const signals = new EventEmitter();
  const options = { stopAdmission() { calls.push('stop'); }, async drainAcademy() { calls.push('drain'); },
    async detachCertification() { calls.push('detach'); }, async closeAcademyPool() { calls.push('pool'); },
    async destroyClient() { calls.push('discord'); }, signals, exit(code) { exits.push(code); },
    log(...args) { logs.push(args); }, timeoutMs: 1000, ...overrides };
  return { options, calls, exits, logs, signals, controller: createApplicationShutdown(options) };
}

test('construction is inert and shutdown orders cleanup exactly once', async () => {
  const f = fixture(); assert.equal(f.signals.eventNames().length, 0); assert.deepEqual(f.calls, []);
  const first = f.controller.shutdown(); assert.equal(f.controller.shutdown(), first);
  assert.equal(await first, 0); assert.deepEqual(f.calls, ['stop', 'drain', 'detach', 'pool', 'discord']); assert.deepEqual(f.exits, [0]);
});
test('installation is explicit and repeat signals reuse the same shutdown', async () => {
  const f = fixture(); f.controller.install(); f.controller.install();
  assert.equal(f.signals.listenerCount('SIGINT'), 1); assert.equal(f.signals.listenerCount('SIGTERM'), 1);
  f.signals.emit('SIGTERM'); f.signals.emit('SIGINT'); await f.controller.shutdown();
  assert.deepEqual(f.exits, [0]); assert.equal(f.signals.eventNames().length, 0);
  assert.throws(() => f.controller.install(), /already finished/);
});
test('shared pool and Discord wait for academy and certification drains', async () => {
  let releaseAcademy; let releaseCertification;
  const f = fixture({ drainAcademy: () => new Promise(resolve => { releaseAcademy = resolve; }),
    detachCertification: () => new Promise(resolve => { releaseCertification = resolve; }) });
  const closing = f.controller.shutdown(); await tick(); assert.deepEqual(f.calls, ['stop']);
  releaseAcademy(); await tick(); assert.deepEqual(f.calls, ['stop']);
  releaseCertification(); await closing; assert.deepEqual(f.calls, ['stop', 'pool', 'discord']);
});
test('cleanup failure continues other steps and exits nonzero without raw error details', async () => {
  const error = new Error('PRIVATE database credentials'); error.code = 'fixture_code';
  const f = fixture({ async detachCertification() { throw error; } });
  assert.equal(await f.controller.shutdown(), 1); assert.deepEqual(f.calls, ['stop', 'drain', 'pool', 'discord']);
  assert.deepEqual(f.exits, [1]); assert.ok(!JSON.stringify(f.logs).includes('PRIVATE'));
  assert.deepEqual(f.logs[0][1], { name: 'Error', code: 'fixture_code' });
});
test('deadline handles stuck work and late completion cannot cause another exit', async () => {
  let release; const f = fixture({ timeoutMs: 10, drainAcademy: () => new Promise(resolve => { release = resolve; }) });
  f.controller.install(); assert.equal(await f.controller.shutdown(), 1);
  assert.deepEqual(f.exits, [1]); assert.ok(!f.calls.includes('pool')); assert.equal(f.signals.eventNames().length, 0);
  release(); await tick(); assert.deepEqual(f.exits, [1]); assert.ok(!f.calls.includes('discord'));
});
test('logger failure cannot prevent cleanup', async () => {
  const f = fixture({ async detachCertification() { throw new Error('fixture'); }, log() { throw new Error('logger fixture'); } });
  assert.equal(await f.controller.shutdown(), 1); assert.deepEqual(f.exits, [1]); assert.ok(f.calls.includes('discord'));
});
test('callbacks and deadlines must be valid', () => {
  const f = fixture();
  for (const overrides of [{ timeoutMs: 0 }, { timeoutMs: 60001 }, { timeoutMs: 1.5 }, { drainAcademy: null }, { signals: {} }]) {
    assert.throws(() => createApplicationShutdown({ ...f.options, ...overrides }));
  }
});
