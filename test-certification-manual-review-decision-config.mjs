import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';

const owner = '222222222222222222', guild = '333333333333333333', channel = '444444444444444444', student = '111111111111111111';
function environment() {
  return { CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'true',
    CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'false', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false',
    ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: channel, GUILD_ID: guild, CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: student,
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'decision-config-v1', agreementSha256: 'a'.repeat(64),
      comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['Synthetic guide'] } }) };
}
test('owner decisions remain absent by default and when explicitly false', () => {
  assert.equal(loadCertificationConfig({}).manualReviewDecisionsEnabled, undefined);
  assert.equal(loadCertificationConfig({ CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'false' }).manualReviewDecisionsEnabled, undefined);
  const env = environment();
  delete env.CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED;
  assert.equal(loadCertificationConfig(env).manualReviewDecisionsEnabled, undefined);
  assert.equal(loadCertificationConfig({ ...env, CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'false' }).manualReviewDecisionsEnabled, undefined);
});
test('explicit valid restricted pilot configuration enables only the parsed setting', () => {
  const env = environment(), before = structuredClone(env), config = loadCertificationConfig(env);
  assert.equal(config.manualReviewDecisionsEnabled, true);
  assert.equal(config.manualReviewEnabled, true);
  assert.equal(config.enrollmentSubmissionEnabled, false);
  assert.equal(config.ownerId, owner);
  assert.equal(config.adminChannelId, channel);
  assert.ok(Object.isFrozen(config));
  assert.deepEqual(env, before);
});
test('malformed decision flags are rejected instead of treated as false', () => {
  for (const value of ['', 'TRUE', ' true', 'true ', '1', true, false, null]) {
    assert.throws(() => loadCertificationConfig({ ...environment(), CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: value }), /owner-decision flag/);
  }
});
test('certification, manual review, and the pilot must all be enabled', () => {
  for (const field of ['CERTIFICATION_ENABLED', 'CERTIFICATION_MANUAL_REVIEW_ENABLED', 'CERTIFICATION_REGISTRATION_PILOT']) {
    for (const value of [undefined, 'false']) assert.throws(() => loadCertificationConfig({ ...environment(), [field]: value }));
  }
});
test('conflicting mutation or preview features must be explicitly false', () => {
  for (const field of ['CERTIFICATION_READ_ONLY_PREVIEW', 'CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED', 'CERTIFICATION_APPLICATION_CLOSURE_ENABLED', 'CERTIFICATION_COURSES_ENABLED']) {
    for (const value of [undefined, 'true']) assert.throws(() => loadCertificationConfig({ ...environment(), [field]: value }));
  }
});
test('explicit valid owner, guild, channel and learner allowlist are mandatory', () => {
  for (const field of ['ACADEMY_OWNER_ID', 'ACADEMY_ADMIN_CHANNEL_ID', 'GUILD_ID', 'CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS']) {
    for (const value of [undefined, '', 'bad']) assert.throws(() => loadCertificationConfig({ ...environment(), [field]: value }));
  }
  for (const list of [owner, `${student},${student}`, [student, ...['6', '7', '8', '9', '5'].map(value => value.repeat(18))].join(',')]) {
    assert.throws(() => loadCertificationConfig({ ...environment(), CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: list }));
  }
});
test('a complete valid enrollment manifest remains required', () => {
  for (const value of [undefined, '', '{}', '{']) assert.throws(() => loadCertificationConfig({ ...environment(), CERTIFICATION_ENROLLMENT_MANIFEST_JSON: value }));
});
