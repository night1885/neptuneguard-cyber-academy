import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';
const manifest = JSON.stringify({ agreementVersion: 'agreement-v1', agreementSha256: 'a'.repeat(64),
  comprehensionCheck: { version: 'questions-v1', questions: [{ prompt: 'Question?' }], correctAnswers: ['guide'] } });
const pilot = Object.freeze({ CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true',
  CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
  CERTIFICATION_ENROLLMENT_MANIFEST_JSON: manifest });
test('legacy defaults omit the new flag', () => {
  assert.equal(Object.hasOwn(loadCertificationConfig({}), 'manualReviewEnabled'), false);
});
test('explicit false preserves legacy configuration shape', () => {
  assert.deepEqual(loadCertificationConfig({ CERTIFICATION_MANUAL_REVIEW_ENABLED: 'false' }), loadCertificationConfig({}));
});
test('invalid manual-review flags fail closed', () => {
  for (const value of ['TRUE', '1', '', 'yes']) assert.throws(() => loadCertificationConfig({ CERTIFICATION_MANUAL_REVIEW_ENABLED: value }), /manual-review flag/);
});
test('manual-review mode requires enabled certification and manifest', () => {
  assert.throws(() => loadCertificationConfig({ CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true' }), /requires enabled/);
  assert.throws(() => loadCertificationConfig({ CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true', CERTIFICATION_ENABLED: 'true' }), /manifest/);
});
test('pilot manual-review configuration can load without enabling general enrollment', () => {
  const settings=loadCertificationConfig(pilot);
  assert.equal(settings.manualReviewEnabled, true);
  assert.equal(settings.enrollmentSubmissionEnabled, false);
  assert.ok(Object.isFrozen(settings.comprehensionCheck.questions));
  assert.ok(Object.isFrozen(settings.comprehensionCheck.correctAnswers));
});
test('existing manifest validation still rejects missing guide entries', () => {
  const bad=JSON.parse(manifest); bad.comprehensionCheck.correctAnswers=[];
  assert.throws(() => loadCertificationConfig({ ...pilot, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(bad) }), /Valid enrollment/);
});
test('manual review cannot activate outside the implemented pilot path', () => {
  for (const value of [undefined,'false','TRUE','1']) assert.throws(() => loadCertificationConfig({ ...pilot, CERTIFICATION_REGISTRATION_PILOT: value }), /requires the registration pilot/);
});
test('manual review requires explicitly disabled general enrollment', () => {
  for (const value of [undefined,'true']) assert.throws(() => loadCertificationConfig({ ...pilot, CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: value }), /explicitly disabled general enrollment/);
});
test('legacy general enrollment remains configurable with manual mode off', () => {
  const settings=loadCertificationConfig({ CERTIFICATION_ENABLED: 'true', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'true',
    CERTIFICATION_MANUAL_REVIEW_ENABLED: 'false', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: manifest });
  assert.equal(settings.enrollmentSubmissionEnabled,true);
  assert.equal(Object.hasOwn(settings,'manualReviewEnabled'),false);
});
