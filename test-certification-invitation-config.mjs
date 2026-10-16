import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadCertificationConfig } from './certification-config.js';
import { validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createCertificationSubmission } from './certification-submission.js';
const content = 'Disposable invitation configuration agreement.', hash = createHash('sha256').update(content).digest('hex');
const manifest = { agreementVersion: 'invitation-v1', agreementSha256: hash, comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } };
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(manifest) };
test('explicit manifest is loaded while general enrollment remains closed', () => {
  const config = loadCertificationConfig(env); assert.equal(config.enabled, true); assert.equal(config.enrollmentSubmissionEnabled, false);
  assert.equal(config.activeAgreementVersion, manifest.agreementVersion); assert.equal(config.activeAgreementSha256, hash);
  assert.deepEqual(config.comprehensionCheck.correctAnswers, ['A']);
  assert.ok(Object.isFrozen(config) && Object.isFrozen(config.comprehensionCheck) && Object.isFrozen(config.comprehensionCheck.questions[0]) && Object.isFrozen(config.comprehensionCheck.correctAnswers));
});
test('an omitted general-enrollment flag stays false with an explicit manifest', () => {
  const { CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED, ...settings } = env; const config = loadCertificationConfig(settings);
  assert.equal(config.enrollmentSubmissionEnabled, false); assert.equal(config.activeAgreementVersion, manifest.agreementVersion);
});
test('enabled dashboard without an explicit manifest retains its previous default configuration', async () => {
  const config = loadCertificationConfig({ CERTIFICATION_ENABLED: 'true' });
  assert.equal(config.enrollmentSubmissionEnabled, false); assert.equal(config.activeAgreementVersion, undefined);
  await validateActiveEnrollmentAgreement({ query() { assert.fail('No agreement configured'); } }, config);
});
test('disabled certification is not activated by supplying a manifest', () => {
  const config = loadCertificationConfig({ ...env, CERTIFICATION_ENABLED: 'false' }); assert.equal(config.enabled, false); assert.equal(config.enrollmentSubmissionEnabled, false); assert.equal(config.activeAgreementVersion, undefined);
});
test('malformed explicit invitation manifests fail closed', () => {
  for (const raw of ['', '{', 'null', JSON.stringify({ ...manifest, agreementSha256: 'invalid' }), JSON.stringify({ ...manifest, comprehensionCheck: { ...manifest.comprehensionCheck, correctAnswers: [] } })]) {
    assert.throws(() => loadCertificationConfig({ ...env, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: raw }), /manifest required|configuration required/);
  }
});
test('startup checks the stored invitation agreement with submissions closed and performs no writes', async () => {
  const config = loadCertificationConfig(env), queries = [];
  await validateActiveEnrollmentAgreement({ async query(sql, values) { queries.push({ sql, values }); return { rows: [{ content, content_sha256: hash }] }; } }, config);
  assert.equal(queries.length, 1); assert.match(queries[0].sql, /^SELECT/); assert.deepEqual(queries[0].values, [manifest.agreementVersion]);
});
test('missing tampered or oversized invitation agreements prevent readiness', async () => {
  const config = loadCertificationConfig(env);
  for (const rows of [[], [{ content: 'changed', content_sha256: hash }], [{ content, content_sha256: 'b'.repeat(64) }], [{ content: 'x'.repeat(60001), content_sha256: hash }]]) {
    await assert.rejects(validateActiveEnrollmentAgreement({ async query() { return { rows }; } }, config), /does not match/);
  }
});
test('loading the invitation manifest does not enable ordinary submission', async () => {
  const config = loadCertificationConfig(env);
  const service = createCertificationSubmission({ connect() { assert.fail('Ordinary submission must remain disabled'); } }, config);
  await assert.rejects(service.submitEnrollment('222222222222222222', {}), /disabled/);
});
