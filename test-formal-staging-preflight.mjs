import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createFormalStagingCliDependencies, runFormalStagingCli } from './formal-isolated-staging-entry.mjs';
const exec = promisify(execFile);
const entry = fileURLToPath(new URL('./formal-isolated-staging-entry.mjs', import.meta.url));
function profile() {
  const env = { FORMAL_STAGING_ENABLED: 'true', CERTIFICATION_ENABLED: 'true',
    GUILD_ID: '111111111111111111', ACADEMY_OWNER_ID: '222222222222222222',
    ACADEMY_ADMIN_CHANNEL_ID: '333333333333333333', VERIFIED_ROLE_ID: '444444444444444444',
    FORMAL_STAGING_BOT_ID: '555555555555555555', FORMAL_STAGING_ENTRY_CHANNEL_ID: '666666666666666666',
    CERTIFICATION_DATABASE_URL: 'postgresql://synthetic:synthetic@staging.invalid/staging',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'synthetic-v1',
      agreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'synthetic-v1',
        questions: [{ prompt: 'Synthetic question' }], correctAnswers: ['Synthetic answer'] } }) };
  for (const key of ['CERTIFICATION_REGISTRATION_PILOT', 'CERTIFICATION_READ_ONLY_PREVIEW',
    'CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED', 'CERTIFICATION_APPLICATION_CLOSURE_ENABLED',
    'CERTIFICATION_COURSES_ENABLED', 'CERTIFICATION_MANUAL_REVIEW_ENABLED',
    'CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED']) env[key] = 'false';
  return { env, productionBoundary: { guildId: '777777777777777777', botId: '888888888888888888',
    databaseHost: 'production.invalid', databasePort: '5432', databaseName: 'production' },
    bundle: { schemaVersion: 1, mode: 'draft-review-only', courseId: 'formal-ethical-hacking',
      runtimeIntegration: false, publishable: false, pages: [{ id: 'first', audience: 'learner',
        kind: 'reading', title: 'Synthetic preflight', text: 'FICTIONAL PREFLIGHT ONLY' }] } };
}
async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'formal-preflight-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, 'private.json');
  const deps = await createFormalStagingCliDependencies();
  const state = { out: [], errors: [], tokens: 0, applications: 0 };
  // Retain the actual reader and inspector; fail if the offline branch reaches live factories.
  deps.write = value => state.out.push(value);
  deps.error = value => state.errors.push(value);
  deps.readToken = () => { state.tokens++; throw Error('Unexpected token access'); };
  deps.createApplication = () => { state.applications++; throw Error('Unexpected application construction'); };
  return { path, deps, state, async save(value) { await writeFile(path, JSON.stringify(value), { mode: 0o600 }); } };
}
test('actual dependency loader, profile reader and validators accept a synthetic profile offline', async t => {
  const f = await setup(t); await f.save(profile());
  assert.equal(await runFormalStagingCli(['--profile', f.path], f.deps), 0);
  assert.deepEqual(JSON.parse(f.state.out[0]), { ok: true, mode: 'offline-preflight', operationalReady: false });
  assert.equal(f.state.tokens, 0); assert.equal(f.state.applications, 0);
});
const invalid = {
  'production guild': p => { p.env.GUILD_ID = p.productionBoundary.guildId; },
  'production bot': p => { p.env.FORMAL_STAGING_BOT_ID = p.productionBoundary.botId; },
  'production database': p => { p.env.CERTIFICATION_DATABASE_URL = 'postgresql://synthetic:synthetic@production.invalid:5432/production'; },
  'enabled mutation feature': p => { p.env.CERTIFICATION_COURSES_ENABLED = 'true'; },
  'token in profile environment': p => { p.env.DISCORD_TOKEN = 'SECRET-TEST'; },
  'instructor content': p => { p.bundle.pages[0].audience = 'instructor'; }
};
for (const [name, mutate] of Object.entries(invalid)) test('actual validators reject ' + name, async t => {
  const f = await setup(t), value = profile(); mutate(value); await f.save(value);
  assert.equal(await runFormalStagingCli(['--profile', f.path], f.deps), 1);
  assert.equal(f.state.out.length, 0); assert.equal(f.state.tokens, 0); assert.equal(f.state.applications, 0);
  assert.doesNotMatch(f.state.errors.join(''), /SECRET-TEST|synthetic:synthetic|production\.invalid/);
});
for (const [name, text] of Object.entries({ empty: '', malformed: '{SECRET-TEST', oversized: 'x'.repeat(65537) })) {
  test('actual reader rejects ' + name + ' profile without echoing contents', async t => {
    const f = await setup(t); await writeFile(f.path, text, { mode: 0o600 });
    assert.equal(await runFormalStagingCli(['--profile', f.path], f.deps), 1);
    assert.equal(f.state.tokens, 0); assert.equal(f.state.applications, 0);
    assert.doesNotMatch(f.state.errors.join(''), /SECRET-TEST/);
  });
}
test('actual reader handles a missing profile', async t => {
  const f = await setup(t);
  assert.equal(await runFormalStagingCli(['--profile', f.path], f.deps), 1);
  assert.equal(f.state.tokens, 0); assert.equal(f.state.applications, 0);
});
test('real CLI preflight exits with its bounded result and no token supplied', async t => {
  const f = await setup(t); await f.save(profile());
  const result = await exec(process.execPath, [entry, '--profile', f.path], { env: {}, timeout: 8000, maxBuffer: 65536 });
  assert.equal(result.stderr, '');
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, mode: 'offline-preflight', operationalReady: false });
});
test('real CLI start without a token exits before live dependency construction', async t => {
  const f = await setup(t); await f.save(profile());
  await assert.rejects(exec(process.execPath, [entry, '--profile', f.path, '--start'],
    { env: {}, timeout: 8000, maxBuffer: 65536 }), error => {
      assert.equal(error.code, 1); assert.equal(error.stdout, '');
      assert.match(error.stderr, /^Formal staging request failed;/);
      assert.doesNotMatch(error.stderr, /synthetic:synthetic|FICTIONAL|Error:/);
      return true;
    });
});
