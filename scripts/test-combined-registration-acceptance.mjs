import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from '../certification-config.js';
import { readRegistrationPilotOptions } from '../certification-registration-pilot-guard.js';
import { readCourseRuntimeOptions } from '../certification-course-runtime.js';
import { readCourseRequestReleaseOptions } from '../certification-course-request-release.js';

const owner = '100000000000000001', learner = '100000000000000002';
const manifest = JSON.stringify({ agreementVersion: 'combined-fixture-v1', agreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Fixture acknowledgment?' }], correctAnswers: ['yes'] } });
const combined = Object.freeze({
  CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true',
  CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'true', CERTIFICATION_COURSES_ENABLED: 'true',
  CERTIFICATION_REGISTRATION_PILOT: 'false', CERTIFICATION_READ_ONLY_PREVIEW: 'false',
  CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false',
  CERTIFICATION_COURSE_REQUESTS_ENABLED: 'true', CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED: 'false',
  CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: learner, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: manifest,
  ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: '100000000000000003',
  GUILD_ID: '100000000000000004', VERIFIED_ROLE_ID: '100000000000000005'
});

test('native course and request parsers accept the intended non-pilot course context', () => {
  assert.equal(readCourseRuntimeOptions(combined).enabled, true);
  assert.deepEqual(readCourseRequestReleaseOptions(combined), { courseRequestsEnabled: true, studentAccessEnabled: false });
  assert.equal(readRegistrationPilotOptions(combined).enabled, false);
});

test('native config accepts courses plus preserved separate manual-review decisions', () => {
  // This is an acceptance requirement, not an expected rejection. It is RED on
  // the unmodified checkpoint and must not be changed to expect a throw.
  const config = loadCertificationConfig(combined);
  assert.equal(config.manualReviewEnabled, true);
  assert.equal(config.manualReviewDecisionsEnabled, true);
  assert.equal(config.courseRequestsEnabled, true);
  assert.equal(config.studentAccessEnabled, false);
  assert.equal(config.enrollmentSubmissionEnabled, false);
  assert.deepEqual(config.manualReviewDecisionStudentIds, [learner]);
  assert.equal(config.activeAgreementVersion, 'combined-fixture-v1');
});

test('existing restricted manual-review configuration remains supported', () => {
  const legacy = { ...combined, CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_COURSES_ENABLED: 'false', CERTIFICATION_COURSE_REQUESTS_ENABLED: 'false' };
  const config = loadCertificationConfig(legacy);
  assert.equal(config.manualReviewDecisionsEnabled, true);
  assert.deepEqual(config.manualReviewDecisionStudentIds, [learner]);
});

for (const key of ['CERTIFICATION_ENROLLMENT_MANIFEST_JSON', 'CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS']) {
  test('missing required combined registration input is rejected: ' + key, () => {
    const env = { ...combined }; delete env[key];
    assert.throws(() => loadCertificationConfig(env));
  });
}

test('no learner request activation is implied by course request support', () => {
  const options = readCourseRequestReleaseOptions(combined);
  assert.equal(options.studentAccessEnabled, false);
});
