import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runFormalStagingCli } from './formal-isolated-staging-entry.mjs';
function fixture(patch = {}) {
  const state = { reads: 0, checks: 0, tokens: 0, creates: 0, starts: 0, shuts: 0, out: [], errors: [] };
  const profile = { env: {}, productionBoundary: {}, bundle: {} };
  const deps = {
    async readProfile(path) { state.reads++; assert.equal(path, 'private.json'); return profile; },
    inspect(value) { state.checks++; assert.equal(value, profile); return { ok: true, operationalReady: false }; },
    readToken() { state.tokens++; return 'FICTIONAL-STAGING-TOKEN'; },
    async createApplication(value) {
      state.creates++; assert.equal(value, profile);
      return { async start(token) { state.starts++; assert.equal(token, 'FICTIONAL-STAGING-TOKEN'); },
        async shutdown() { state.shuts++; } };
    },
    write: value => state.out.push(value), error: value => state.errors.push(value), ...patch
  };
  return { state, deps };
}
for (const args of [[], ['--start'], ['--profile'], ['--profile', ''], ['--profile', '--start'],
  ['--profile', 'private.json', '--publish'], ['--profile', 'private.json', '--start', '--force']]) {
  test('invalid CLI arguments stop before file access: ' + JSON.stringify(args), async () => {
    const f = fixture(); assert.equal(await runFormalStagingCli(args, f.deps), 1);
    assert.equal(f.state.reads, 0); assert.equal(f.state.creates, 0);
  });
}
test('default preflight touches no token, client, pool or start factory', async () => {
  const f = fixture(); assert.equal(await runFormalStagingCli(['--profile', 'private.json'], f.deps), 0);
  assert.equal(f.state.checks, 1); assert.equal(f.state.tokens, 0); assert.equal(f.state.creates, 0);
  assert.deepEqual(JSON.parse(f.state.out[0]), { ok: true, mode: 'offline-preflight', operationalReady: false });
});
for (const profile of [null, [], {}, { env: {}, productionBoundary: {}, bundle: {}, token: 'SECRET' }]) {
  test('profile envelope rejected: ' + JSON.stringify(profile), async () => {
    const f = fixture({ readProfile: async () => profile });
    assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
    assert.equal(f.state.checks, 0); assert.equal(f.state.tokens, 0); assert.equal(f.state.creates, 0);
  });
}
for (const result of [{ ok: false }, { ok: true, operationalReady: true }, null]) {
  test('rejected or readiness-overclaiming preflight cannot start: ' + JSON.stringify(result), async () => {
    const f = fixture({ inspect: () => result });
    assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
    assert.equal(f.state.tokens, 0); assert.equal(f.state.creates, 0);
  });
}
test('explicit start supplies token out of band and does not claim readiness', async () => {
  const f = fixture(); assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 0);
  assert.equal(f.state.creates, 1); assert.equal(f.state.starts, 1); assert.equal(f.state.shuts, 0);
  assert.equal(JSON.parse(f.state.out[0]).operationalReady, false);
  assert.equal(JSON.stringify(f.state.out).includes('TOKEN'), false);
});
test('missing token stops before application construction', async () => {
  const f = fixture({ readToken: () => '' });
  assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
  assert.equal(f.state.creates, 0);
});
test('start rejection attempts shutdown and never echoes raw errors', async () => {
  let shuts = 0;
  const f = fixture({ createApplication: async () => ({ start: async () => { throw Error('SECRET URL'); }, shutdown: async () => { shuts++; } }) });
  assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
  assert.equal(shuts, 1); assert.equal(f.state.errors.join('').includes('SECRET'), false);
});
test('construction failure awaits observable cleanup', async () => {
  let cleaned = false;
  const f = fixture({ createApplication: async () => { const e = Error('SECRET'); e.cleanup = Promise.resolve().then(() => { cleaned = true; }); throw e; } });
  assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
  assert.equal(cleaned, true); assert.equal(f.state.errors.join('').includes('SECRET'), false);
});
test('profile and validator errors are redacted before resource construction', async () => {
  for (const patch of [{ readProfile: async () => { throw Error('SECRET'); } }, { inspect: () => { throw Error('SECRET'); } }]) {
    const f = fixture(patch); assert.equal(await runFormalStagingCli(['--profile', 'private.json', '--start'], f.deps), 1);
    assert.equal(f.state.creates, 0); assert.equal(f.state.errors.join('').includes('SECRET'), false);
  }
});
test('source wiring retains real factories and has no publication or mutation command', async () => {
  const text = await readFile(new URL('./formal-isolated-staging-entry.mjs', import.meta.url), 'utf8');
  for (const name of ['createIsolatedFormalStagingApplication', 'createRestoredCertificationApplication',
    'attachCertificationRuntime', 'createCertificationDatabasePool', 'createTrustedFormalReviewRoute', 'createContentAdapter']) assert.ok(text.includes(name));
  assert.doesNotMatch(text, /assignCourses\(|completeCourse\(|\.login\(|\.send\(|\.query\(/);
});
