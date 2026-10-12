import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';

const applicationUrl = new URL('./certification-academy-application.js', import.meta.url).href;
const childSource = String.raw`
import { EventEmitter } from 'node:events';
import { createAcademyApplication } from ${JSON.stringify(applicationUrl)};
const mode = process.argv[1];
const write = message => new Promise((resolve, reject) => process.stdout.write(message + '\n', error => error ? reject(error) : resolve()));
const keepAlive = setInterval(() => {}, 1000);
const client = new EventEmitter();
client.login = async () => {
  if (mode === 'login-failure') throw new Error('Synthetic login failure');
  client.emit('clientReady', { user: { tag: 'fixture-only' } });
};
client.destroy = async () => { clearInterval(keepAlive); await write('DISCORD_CLOSED'); };
const application = createAcademyApplication({
  client, pool: { end: () => write('POOL_CLOSED') }, guildId: '1339276399390887957', env: {},
  attachRuntime: () => ({ detach: () => write('CERTIFICATION_CLOSED') }),
  async initializeDatabase() {
    if (mode === 'busy') client.emit('interactionCreate', {});
    await write('READY');
  },
  handleInteraction: () => mode === 'busy' ? new Promise(() => {}) : Promise.resolve(),
  timeoutMs: mode === 'busy' ? 100 : 2000,
  log: message => process.stderr.write(String(message) + '\n')
});
void application.start('synthetic-fixture-not-a-token');
`;

test('generated child fixture is valid JavaScript before process execution', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: childSource, encoding: 'utf8', env: { NODE_ENV: 'test' }, timeout: 10000
  });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
});

function launch(t, mode) {
  const child = spawn(process.execPath, ['--input-type=module', '-e', childSource, mode], {
    env: { NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = ''; let stderr = ''; let sawReady = false;
  let resolveReady; let rejectReady; let resolveDone; let rejectDone;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  void ready.catch(() => {});
  const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  void done.catch(() => {});
  const watchdog = setTimeout(() => {
    const error = new Error('Disposable shutdown fixture exceeded its test deadline');
    rejectReady(error); rejectDone(error); child.kill('SIGKILL');
  }, 10000);
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', data => {
    stdout += data;
    if (!sawReady && stdout.split('\n').includes('READY')) { sawReady = true; resolveReady(); }
  });
  child.stderr.on('data', data => { stderr += data; });
  child.on('error', error => { clearTimeout(watchdog); rejectReady(error); rejectDone(error); });
  child.on('close', (code, signal) => {
    clearTimeout(watchdog);
    if (!sawReady) rejectReady(new Error(`Fixture exited before readiness (${code}/${signal}): ${stderr.slice(0, 2000)}`));
    resolveDone({ code, signal, stdout, stderr });
  });
  t.after(() => {
    clearTimeout(watchdog);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  });
  return { child, ready, done };
}
function assertCleanClose(result, code) {
  assert.equal(result.code, code); assert.equal(result.signal, null);
  const markers = ['CERTIFICATION_CLOSED', 'POOL_CLOSED', 'DISCORD_CLOSED'];
  for (const marker of markers) assert.equal(result.stdout.split('\n').filter(line => line === marker).length, 1);
  assert.ok(result.stdout.indexOf(markers[0]) < result.stdout.indexOf(markers[1]));
  assert.ok(result.stdout.indexOf(markers[1]) < result.stdout.indexOf(markers[2]));
}
const unsupported = process.platform === 'win32';
for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`disposable process handles ${signal} and closes resources before clean exit`, { skip: unsupported }, async t => {
    const f = launch(t, 'healthy'); await f.ready; assert.equal(f.child.kill(signal), true);
    assertCleanClose(await f.done, 0);
  });
}
test('disposable process cleans up on login rejection and exits nonzero', { skip: unsupported }, async t => {
  const result = await launch(t, 'login-failure').done; assertCleanClose(result, 1);
  assert.match(result.stderr, /Academy startup or handler failed/);
  assert.ok(!result.stderr.includes('Synthetic login failure'));
});
test('stuck accepted work reaches shutdown watchdog rather than claiming successful drain', { skip: unsupported }, async t => {
  const f = launch(t, 'busy'); await f.ready; assert.equal(f.child.kill('SIGTERM'), true);
  const result = await f.done; assert.equal(result.code, 1); assert.equal(result.signal, null);
  assert.match(result.stderr, /shutdown deadline exceeded/);
  assert.ok(!result.stdout.includes('POOL_CLOSED')); assert.ok(!result.stdout.includes('DISCORD_CLOSED'));
});
