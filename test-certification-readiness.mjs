import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadCertificationConfig } from './certification-config.js';
import { requiredEnrollmentColumns, validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';

const content = 'Fixture agreement only.';
const hash = createHash('sha256').update(content).digest('hex');
const manifest = { agreementVersion: 'fixture-v2', agreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Test question.' }], correctAnswers: ['stop'] } };
const env = value => ({ CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(value) });
function schemaPool({ missingColumn = false, disabledTrigger = false, missingTable = false, missingConstraint = false, unvalidatedConstraint = false } = {}) {
  return { async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: missingTable ? null : 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('pg_attribute')) return { rows: (missingColumn ? requiredEnrollmentColumns.filter(name => name !== (typeof missingColumn === 'string' ? missingColumn : 'discord_user_id')) : requiredEnrollmentColumns).map(attname => ({ attname })) };
    if (sql.includes('pg_constraint')) return { rows: missingConstraint ? [] : [{ conname: 'certification_account_acknowledgment_required', convalidated: !unvalidatedConstraint }] };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: disabledTrigger ? 'D' : 'O' })) };
    throw new Error('Unexpected query');
  } };
}
test('certification and submission remain off by default', () => {
  const value = loadCertificationConfig({}); assert.equal(value.enabled, false); assert.equal(value.enrollmentSubmissionEnabled, false);
});
test('submission requires certification gate and complete manifest', () => {
  assert.throws(() => loadCertificationConfig({ CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true' }), /Certification must be enabled/);
  assert.throws(() => loadCertificationConfig(env(null)), /configuration required/);
  assert.throws(() => loadCertificationConfig({ ...env(manifest), CERTIFICATION_ENROLLMENT_MANIFEST_JSON: '{' }), /manifest required/);
  assert.throws(() => loadCertificationConfig({ CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'yes' }), /Invalid/);
});
test('valid manifest produces deeply frozen submission settings', () => {
  const value = loadCertificationConfig(env(manifest)); assert.equal(value.enrollmentSubmissionEnabled, true);
  assert.equal(value.activeAgreementSha256, hash); assert.equal(value.comprehensionCheck.questions[0].prompt, 'Test question.');
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.comprehensionCheck) && Object.isFrozen(value.comprehensionCheck.questions[0]) && Object.isFrozen(value.comprehensionCheck.correctAnswers));
});
test('malformed hashes, empty answer keys and excessive questions fail closed', () => {
  for (const value of [{ ...manifest, agreementSha256: 'invalid' }, { ...manifest, comprehensionCheck: { ...manifest.comprehensionCheck, correctAnswers: [] } }, { ...manifest, comprehensionCheck: { ...manifest.comprehensionCheck, questions: Array(4).fill({ prompt: 'Question' }), correctAnswers: Array(4).fill('stop') } }]) assert.throws(() => loadCertificationConfig(env(value)), /configuration required/);
});
test('complete schema with validated account constraint satisfies startup', async () => { await validateCertificationSchema(schemaPool()); });
test('missing tables or required columns prevent readiness', async () => {
  await assert.rejects(validateCertificationSchema(schemaPool({ missingTable: true })), /schema is missing/);
  await assert.rejects(validateCertificationSchema(schemaPool({ missingColumn: true })), /columns are incomplete/);
  for (const name of ['age_eligible', 'age_declared_at', 'age_declaration_version']) {
    assert.ok(requiredEnrollmentColumns.includes(name));
    await assert.rejects(validateCertificationSchema(schemaPool({ missingColumn: name })), /columns are incomplete/);
  }
});
test('missing or unvalidated account constraint prevents readiness', async () => {
  for (const settings of [{ missingConstraint: true }, { unvalidatedConstraint: true }]) await assert.rejects(validateCertificationSchema(schemaPool(settings)), /Validated account acknowledgment constraint/);
});
test('disabled safeguards prevent readiness', async () => {
  await assert.rejects(validateCertificationSchema(schemaPool({ disabledTrigger: true })), /missing or disabled/);
});
test('active agreement is rehashed without publishing it', async () => {
  const config = loadCertificationConfig(env(manifest));
  await validateActiveEnrollmentAgreement({ async query() { return { rows: [{ content, content_sha256: hash }] }; } }, config);
  await assert.rejects(validateActiveEnrollmentAgreement({ async query() { return { rows: [{ content: 'changed', content_sha256: hash }] }; } }, config), /does not match/);
  await validateActiveEnrollmentAgreement({ async query() { assert.fail('Disabled submission should not query active agreement'); } }, loadCertificationConfig({}));
});
