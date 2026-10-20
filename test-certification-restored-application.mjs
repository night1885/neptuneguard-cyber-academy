import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
const admin = '111111111111111111', guildId = '333333333333333333', channelId = '444444444444444444';
const environment = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', ACADEMY_OWNER_ID: admin, ACADEMY_ADMIN_CHANNEL_ID: channelId,
  CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'v1', agreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } }) };
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
  const client = new EventEmitter(), signals = new EventEmitter(), calls = [], logs = [], exits = [];
  client.isReady = () => false;
  client.login = options.login || (async () => { calls.push('login'); });
  client.destroy = async () => { calls.push('destroy'); };
  const runtime = { enabled: true, ready: false, async detach() {
    calls.push('detach'); runtime.ready = false; client.off('interactionCreate', onInteraction);
    if (options.drain) await options.drain;
    if (options.failDrain) throw new Error('PRIVATE-DRAIN-DETAIL');
    calls.push('certification-pool-closed');
  } };
  function onInteraction() { calls.push('certification-interaction'); }
  const app = createRestoredCertificationApplication({ client, guildId: options.guildId === undefined ? guildId : options.guildId,
    env: { ...environment, ...options.env }, signals, log: options.log || (message => logs.push(message)), exit: code => exits.push(code),
    attachRuntime(actualClient, academyPool, configuredGuild, env) {
      options.onAttach?.(); assert.equal(actualClient, client); assert.equal(academyPool, undefined); assert.equal(configuredGuild, guildId);
      assert.equal(env.ACADEMY_OWNER_ID, admin); assert.equal(Object.isFrozen(env), true);
      calls.push('attach'); client.on('interactionCreate', onInteraction); return runtime;
    } });
  return { app, client, signals, runtime, calls, logs, exits };
}
for (const options of [{ guildId: null }, { env: { ACADEMY_OWNER_ID: undefined } }, { env: { ACADEMY_ADMIN_CHANNEL_ID: undefined } },
  { env: { CERTIFICATION_ENABLED: 'false' } }, { env: { CERTIFICATION_ENROLLMENT_MANIFEST_JSON: undefined } },
  { env: { CERTIFICATION_ENROLLMENT_MANIFEST_JSON: 'invalid' } }]) {
  test(`invalid restoration configuration fails before runtime attachment ${JSON.stringify(options)}`, () => {
    let attached = 0; assert.throws(() => fixture({ ...options, onAttach() { attached++; } })); assert.equal(attached, 0);
  });
}
test('isolated application attaches certification only and reports readiness separately from login', async () => {
  const f = fixture();
  try {
    assert.deepEqual(f.calls, ['attach']); assert.equal(f.app.enabled, true); assert.equal(f.app.ready, false);
    await f.app.start('fixture-only'); assert.equal(f.app.ready, false);
    f.runtime.ready = true; assert.equal(f.app.ready, true);
    f.client.emit('interactionCreate', {}); assert.deepEqual(f.calls, ['attach', 'login', 'certification-interaction']);
    f.client.emit('error', new Error('PRIVATE-CONNECTION')); assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE-CONNECTION/);
  } finally { await f.app.shutdown(); }
  assert.deepEqual(f.exits, [0]); assert.equal(f.client.eventNames().length, 0); assert.equal(f.signals.eventNames().length, 0);
});
test('shutdown is idempotent and closes the certification pool before destroying the client', async () => {
  const f = fixture(); await f.app.start('fixture-only');
  const first = f.app.shutdown(); assert.equal(f.app.shutdown(), first); await first;
  assert.deepEqual(f.calls, ['attach', 'login', 'detach', 'certification-pool-closed', 'destroy']);
  assert.equal(f.app.stopping, true); assert.equal(f.app.ready, false); assert.deepEqual(f.exits, [0]);
  await assert.rejects(f.app.start('fixture-only'), /cannot be started again/);
});
test('signal stops certification admission immediately and waits for login and runtime drain', async () => {
  let releaseLogin, releaseDrain;
  const login = new Promise(resolve => { releaseLogin = resolve; }), drain = new Promise(resolve => { releaseDrain = resolve; });
  const f = fixture({ login: () => login, drain });
  try {
    const starting = f.app.start('fixture-only'); await tick(); f.signals.emit('SIGTERM');
    const closing = f.app.shutdown(); f.client.emit('interactionCreate', {}); await tick();
    assert.equal(f.app.stopping, true); assert.equal(f.calls.filter(call => call === 'detach').length, 1);
    assert.ok(!f.calls.includes('certification-interaction')); assert.ok(!f.calls.includes('destroy'));
    releaseLogin(); await starting; await tick(); assert.ok(!f.calls.includes('destroy'));
    releaseDrain(); await closing; assert.deepEqual(f.exits, [0]); assert.equal(f.calls.at(-1), 'destroy');
  } finally { releaseLogin(); releaseDrain(); await f.app.shutdown(); }
});
test('login failure closes owned runtime and returns nonzero without raw error details', async () => {
  const f = fixture({ login: async () => { throw new Error('PRIVATE-LOGIN-DETAIL'); } });
  await f.app.start('fixture-only'); await f.app.shutdown();
  assert.deepEqual(f.exits, [1]); assert.deepEqual(f.calls, ['attach', 'detach', 'certification-pool-closed', 'destroy']);
  assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE-LOGIN-DETAIL/);
});
test('runtime drain failure still destroys client and reports nonzero without raw error details', async () => {
  const f = fixture({ failDrain: true }); await f.app.start('fixture-only'); await f.app.shutdown();
  assert.deepEqual(f.exits, [1]); assert.equal(f.calls.at(-1), 'destroy');
  assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE-DRAIN-DETAIL/);
});
test('logger failure cannot prevent restoration cleanup', async () => {
  const f = fixture({ log() { throw new Error('PRIVATE-LOGGER'); } });
  await f.app.start('fixture-only'); await f.app.shutdown();
  assert.deepEqual(f.exits, [0]); assert.equal(f.calls.at(-1), 'destroy');
});
test('empty token is rejected before login and application cannot start twice', async () => {
  const f = fixture();
  try {
    await assert.rejects(f.app.start(''), /Explicit Discord token/); assert.deepEqual(f.calls, ['attach']);
    await f.app.start('fixture-only'); await assert.rejects(f.app.start('fixture-only'), /cannot be started again/);
  } finally { await f.app.shutdown(); }
});
test('default restoration entry does not initialize academy records or publish messages', async () => {
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.main, 'restoration.js'); assert.equal(pkg.scripts.start, 'node restoration.js');
  assert.equal(pkg.scripts['start:instructor'], 'node instructor.js');
  const entry = await readFile(new URL('./restoration.js', import.meta.url), 'utf8');
  const application = await readFile(new URL('./certification-restored-application.js', import.meta.url), 'utf8');
  for (const source of [entry, application]) assert.doesNotMatch(source, /initializeDatabase|createAcademyApplication|academy-handler|updateCertificationEntryPanels|\.send\(/);
  assert.match(entry, /createRestoredCertificationApplication/);
  const syntax = spawnSync(process.execPath, ['--check', 'restoration.js'], { cwd: new URL('.', import.meta.url), encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});

test('default executable selects the restored factory using the configured guild and token', async () => {
  const entry = await readFile(new URL('./restoration.js', import.meta.url), 'utf8');
  const body = entry.replace(/^import [^\n]*\n/gm, '');
  const calls = [], options = Object.freeze({ fixture: true }); let client;
  runInNewContext(body, {
    process: { env: { DISCORD_TOKEN: 'fixture-token', GUILD_ID: guildId } },
    createInstructorClientOptions() { calls.push('options'); return options; },
    Client: class { constructor(value) { assert.equal(value, options); client = this; calls.push('client'); } },
    createRestoredCertificationApplication(value) {
      assert.equal(value.client, client); assert.equal(value.guildId, guildId); calls.push('restored');
      return { start(value) { assert.equal(value, 'fixture-token'); calls.push('start'); } };
    }
  });
  assert.deepEqual(calls, ['options', 'client', 'restored', 'start']);
});
for (const token of [undefined, '', '   ']) test(`default executable rejects missing/blank token before client construction: ${JSON.stringify(token)}`, async () => {
  const entry = await readFile(new URL('./restoration.js', import.meta.url), 'utf8'); let constructed = 0;
  assert.throws(() => runInNewContext(entry.replace(/^import [^\n]*\n/gm, ''), {
    process: { env: { DISCORD_TOKEN: token, GUILD_ID: guildId } },
    createInstructorClientOptions() { constructed++; }, Client: class { constructor() { constructed++; } },
    createRestoredCertificationApplication() { constructed++; }
  }), /Explicit Discord token required/);
  assert.equal(constructed, 0);
});
