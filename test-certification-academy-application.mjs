import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createAcademyApplication } from './certification-academy-application.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(overrides = {}) {
  const calls = []; const logs = []; const client = new EventEmitter(); const signals = new EventEmitter();
  client.login = async () => { calls.push('login'); }; client.destroy = () => { calls.push('discord'); };
  const pool = { async end() { calls.push('pool'); } };
  const options = { client, pool, signals, guildId: '1339276399390887957', env: {},
    async initializeDatabase() { calls.push('initialize'); }, async handleInteraction() { calls.push('interaction'); },
    attachRuntime() { calls.push('attach'); return { detach() { calls.push('detach'); } }; },
    exit(code) { calls.push(`exit:${code}`); }, log(...args) { logs.push(args); }, ...overrides };
  return { client, signals, calls, logs, options, application: createAcademyApplication(options) };
}
test('start installs lifecycle and shutdown detaches both listeners and closes resources once', async () => {
  const f = fixture(); assert.deepEqual(f.calls, ['attach']); assert.equal(f.signals.eventNames().length, 0);
  await f.application.start('fixture-only'); f.client.emit('clientReady', { user: { tag: 'fixture' } });
  f.client.emit('interactionCreate', {}); await tick();
  const first = f.application.shutdown(); assert.equal(f.application.shutdown(), first); await first;
  assert.deepEqual(f.calls, ['attach', 'login', 'initialize', 'interaction', 'detach', 'pool', 'discord', 'exit:0']);
  assert.equal(f.client.eventNames().length, 0); assert.equal(f.signals.eventNames().length, 0);
  assert.throws(() => f.application.start('fixture-only'), /cannot be started again/);
});
test('shutdown waits for accepted interaction and blocks new work immediately', async () => {
  let release; let handled = 0; const f = fixture({ handleInteraction() { handled++; return new Promise(resolve => { release = resolve; }); } });
  await f.application.start('fixture-only'); f.client.emit('interactionCreate', {}); await tick();
  const closing = f.application.shutdown(); f.client.emit('interactionCreate', {}); await tick();
  assert.equal(handled, 1); assert.equal(f.application.stopping, true); assert.ok(!f.calls.includes('pool'));
  release(); await closing; assert.ok(f.calls.includes('exit:0'));
});
test('shutdown waits for accepted database initialization', async () => {
  let release; const f = fixture({ initializeDatabase: () => new Promise(resolve => { release = resolve; }) });
  await f.application.start('fixture-only'); f.client.emit('clientReady', { user: { tag: 'fixture' } }); await tick();
  const closing = f.application.shutdown(); await tick(); assert.ok(!f.calls.includes('pool')); release(); await closing;
  assert.ok(!JSON.stringify(f.logs).includes('online'));
});
test('database initialization failure triggers sanitized nonzero cleanup without self-deadlock', async () => {
  const f = fixture({ async initializeDatabase() { throw new Error('PRIVATE connection details'); } });
  await f.application.start('fixture-only'); f.client.emit('clientReady', { user: { tag: 'fixture' } }); await tick();
  await f.application.shutdown(); assert.ok(f.calls.includes('pool')); assert.ok(f.calls.includes('discord'));
  assert.ok(f.calls.includes('exit:1')); assert.ok(!JSON.stringify(f.logs).includes('PRIVATE'));
});
test('login failure uses cleanup rather than unhandled rejection', async () => {
  const f = fixture(); f.client.login = async () => { throw new Error('PRIVATE login fixture'); };
  await f.application.start('fixture-only'); await f.application.shutdown();
  assert.ok(f.calls.includes('exit:1')); assert.ok(!JSON.stringify(f.logs).includes('PRIVATE'));
});
test('signals stop work during pending login and wait for the tracked login', async () => {
  let release; const f = fixture(); f.client.login = () => new Promise(resolve => { release = resolve; });
  const login = f.application.start('fixture-only'); await tick(); f.signals.emit('SIGTERM'); f.signals.emit('SIGINT');
  const closing = f.application.shutdown(); await tick(); assert.ok(!f.calls.includes('pool'));
  release(); await login; await closing; assert.equal(f.calls.filter(value => value === 'exit:0').length, 1);
});
test('invalid callbacks are rejected before runtime attachment', () => {
  const f = fixture(); let attached = 0;
  assert.throws(() => createAcademyApplication({ ...f.options, initializeDatabase: null, attachRuntime() { attached++; } }));
  assert.equal(attached, 0);
});
test('entry point delegates lifecycle while retaining academy handler', async () => {
  const source = await readFile(new URL('./index.js', import.meta.url), 'utf8');
  assert.match(source, /async function handleAcademyInteraction\(interaction\)/);
  assert.match(source, /handleInteraction: handleAcademyInteraction/);
  assert.match(source, /void application\.start\(process\.env\.DISCORD_TOKEN\)/);
  assert.ok(!source.includes('process.exit(1)')); assert.ok(!source.includes('client.login(process.env.DISCORD_TOKEN)'));
});
