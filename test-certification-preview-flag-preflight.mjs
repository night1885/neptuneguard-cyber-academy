import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPreviewFeatureFlags } from './certification-preview-flag-preflight.js';
const valid = Object.freeze({ CERTIFICATION_ENABLED: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'true',
  CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false' });
const fields = Object.keys(valid);
test('exact preview flags pass without modifying input', () => {
  const result = inspectPreviewFeatureFlags(valid);
  assert.deepEqual(result, { ok: true, issues: [] });
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.issues));
});
test('all missing flags are reported together', () => {
  const result = inspectPreviewFeatureFlags();
  assert.equal(result.ok, false); assert.deepEqual(result.issues.map(i => i.field), fields);
  assert.ok(result.issues.every(i => i.code === 'missing'));
});
test('the deployment-style capitalization and whitespace errors are aggregated', () => {
  const result = inspectPreviewFeatureFlags({ ...valid, CERTIFICATION_READ_ONLY_PREVIEW: 'True',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'False', CERTIFICATION_COURSES_ENABLED: 'false ' });
  assert.deepEqual(result.issues.map(i => i.field), ['CERTIFICATION_READ_ONLY_PREVIEW', 'CERTIFICATION_APPLICATION_CLOSURE_ENABLED', 'CERTIFICATION_COURSES_ENABLED']);
  assert.ok(result.issues.every(i => i.code === 'invalid_literal'));
});
for (const field of fields) {
  for (const value of [undefined, null, true, false, '', ' true', 'true ', 'TRUE', 'False', 'false\\n', '\"true\"']) {
    test(`${field} rejects ${JSON.stringify(value)}`, () => {
      const result = inspectPreviewFeatureFlags({ ...valid, [field]: value });
      assert.equal(result.ok, false); assert.equal(result.issues.length, 1);
      assert.equal(result.issues[0].field, field); assert.ok(Object.isFrozen(result.issues[0]));
    });
  }
  test(`${field} rejects the opposite valid literal for preview mode`, () => {
    const result = inspectPreviewFeatureFlags({ ...valid, [field]: valid[field] === 'true' ? 'false' : 'true' });
    assert.equal(result.issues[0].code, 'wrong_preview_value');
  });
}
test('neither invalid values nor unrelated environment secrets appear in diagnostics', () => {
  const secret = 'DO_NOT_EMIT_PRIVATE_SENTINEL';
  const result = inspectPreviewFeatureFlags({ ...valid, CERTIFICATION_READ_ONLY_PREVIEW: secret,
    DISCORD_TOKEN: secret, CERTIFICATION_DATABASE_URL: secret, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: secret });
  assert.ok(!JSON.stringify(result).includes(secret));
});
for (const value of [null, [], 'invalid', 1]) test(`rejects non-environment input ${JSON.stringify(value)}`, () => {
  assert.throws(() => inspectPreviewFeatureFlags(value), TypeError);
});
const script = fileURLToPath(new URL('./certification-preview-flag-preflight.mjs', import.meta.url));
function run(overrides) {
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, ...valid, ...overrides } });
}
test('CLI succeeds with an explicit full-readiness limitation', () => {
  const child = run({}); assert.equal(child.status, 0);
  assert.match(child.stdout, /does not establish full configuration/); assert.equal(child.stderr, '');
});
test('CLI fails once and reports multiple invalid flags without emitting secret values', () => {
  const secret = 'DO_NOT_EMIT_PRIVATE_SENTINEL';
  const child = run({ CERTIFICATION_READ_ONLY_PREVIEW: secret, CERTIFICATION_COURSES_ENABLED: 'False', DISCORD_TOKEN: secret });
  assert.equal(child.status, 1); assert.match(child.stderr, /CERTIFICATION_READ_ONLY_PREVIEW/);
  assert.match(child.stderr, /CERTIFICATION_COURSES_ENABLED/);
  assert.ok(!(child.stdout + child.stderr).includes(secret));
});

for (const field of fields) for (const point of [0, 9, 10, 13, 160, 65279]) {
  test(`${field} rejects appended character U+${point.toString(16)}`, () => {
    const result = inspectPreviewFeatureFlags({ ...valid, [field]: valid[field] + String.fromCharCode(point) });
    assert.equal(result.ok, false); assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].code, 'invalid_literal');
  });
}
