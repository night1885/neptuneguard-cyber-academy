import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
const config = { enabled: true, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
const complete = () => ({ discord_user_id: '222222222222222222', status: 'approved', student_id: 'NG-test', approved_by: '111111111111111111', approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: 'adult-18-v1' });

test('complete current approved record is authorized without mutation', () => {
  const record = complete();
  const before = structuredClone(record);
  assert.deepEqual(evaluateCourseAccessReadiness(record, config), { authorized: true, readyForApproval: false, blockers: [] });
  assert.deepEqual(record, before);
});

test('pending record can be ready for approval but is not authorized', () => {
  const record = { ...complete(), status: 'pending', student_id: null, approved_by: null, approved_at: null };
  const result = evaluateCourseAccessReadiness(record, config);
  assert.equal(result.authorized, false);
  assert.equal(result.readyForApproval, true);
  assert.equal(result.blockers.length, 4);
});

test('missing and nonapproved records never grant access', () => {
  assert.equal(evaluateCourseAccessReadiness(null, config).authorized, false);
  for (const status of ['awaiting_acknowledgment', 'denied', 'suspended', 'revoked']) {
    const result = evaluateCourseAccessReadiness({ ...complete(), status }, config);
    assert.equal(result.authorized, false);
    assert.equal(result.readyForApproval, false);
  }
});

test('missing approval and acknowledgment requirements block authorization', () => {
  for (const field of ['student_id', 'approved_by', 'approved_at', 'acknowledged_at', 'learner_confirmed_read_at', 'comprehension_passed_at', 'age_eligible', 'age_declared_at', 'age_declaration_version', 'signature_method', 'discord_user_id']) {
    const result = evaluateCourseAccessReadiness({ ...complete(), [field]: null }, config);
    assert.equal(result.authorized, false, field);
    assert.ok(result.blockers.length > 0, field);
  }
  assert.equal(evaluateCourseAccessReadiness({ ...complete(), student_id: '   ' }, config).authorized, false);
});

test('stale configured versions each produce a specific blocker', () => {
  for (const [field, value, expected] of [
    ['agreement_version', 'old', 'Agreement version is not current.'],
    ['agreement_content_sha256', 'b'.repeat(64), 'Agreement content hash is not current.'],
    ['comprehension_check_version', 'old', 'Comprehension-check version is not current.']
  ]) {
    const result = evaluateCourseAccessReadiness({ ...complete(), status: 'pending', [field]: value }, config);
    assert.equal(result.authorized, false);
    assert.equal(result.readyForApproval, false);
    assert.ok(result.blockers.includes(expected));
  }
});

test('disabled certification blocks both authorization and approval readiness', () => {
  for (const status of ['approved', 'pending']) {
    const result = evaluateCourseAccessReadiness({ ...complete(), status }, { ...config, enabled: false });
    assert.equal(result.authorized, false);
    assert.equal(result.readyForApproval, false);
    assert.ok(result.blockers.includes('Certification is disabled.'));
  }
});
