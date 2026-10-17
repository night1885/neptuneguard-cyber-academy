import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
import { createCertificationService } from './certification-service.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const student = '222222222222222222', admin = '111111111111111111';
const config = { enabled: true, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check-v1' } };
const complete = { discord_user_id: student, status: 'approved', student_id: 'NG-TEST', approved_by: admin, approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check-v1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
const cases = [
  ['discord_user_id', null, 'Discord user ID is missing or invalid.'],
  ['signature_method', 'legacy', 'Discord-account acknowledgment required.'],
  ['acknowledgment_name', 'PRIVATE-NAME', 'Historical identity fields need review.'],
  ['signature_reference', 'PRIVATE-REFERENCE', 'Historical identity fields need review.'],
  ['agreement_version', null, 'Agreement version is missing or invalid.'],
  ['agreement_content_sha256', null, 'Agreement hash is missing or invalid.'],
  ['acknowledged_at', null, 'Agreement acknowledgment is missing.'],
  ['learner_confirmed_read_at', null, 'Reading confirmation is missing.'],
  ['comprehension_passed_at', null, 'Comprehension pass is missing.'],
  ['comprehension_check_version', null, 'Comprehension version is missing.'],
  ['age_eligible', false, 'Positive age-18 declaration is missing.'],
  ['age_declared_at', null, 'Age declaration timestamp is missing.'],
  ['age_declaration_version', 'old', 'Age declaration version is not current.']
];
for (const [field, value, message] of cases) {
  test(`readiness explains ${field} without changing records or exposing values`, () => {
    const record = Object.freeze({ ...complete, [field]: value });
    const result = evaluateCourseAccessReadiness(record, config);
    assert.equal(result.authorized, false); assert.equal(result.readyForApproval, false); assert.ok(result.blockers.includes(message));
    assert.doesNotMatch(result.blockers.join('\n'), /PRIVATE-NAME|PRIVATE-REFERENCE/); assert.equal(record[field], value);
  });
}
test('diagnostic decisions match course authorization for complete and individually incomplete records', async () => {
  for (const record of [complete, ...cases.map(([field, value]) => ({ ...complete, [field]: value })), ...['awaiting_acknowledgment', 'pending', 'denied', 'suspended', 'revoked'].map(status => ({ ...complete, status })), { ...complete, agreement_version: 'old' }, { ...complete, agreement_content_sha256: 'b'.repeat(64) }, { ...complete, comprehension_check_version: 'old' }, { ...complete, student_id: null }]) {
    const pool = { async query(sql, values) { assert.match(sql, /^SELECT/); assert.deepEqual(values, [student]); return { rows: [record] }; }, connect() { assert.fail('Readiness must not mutate access'); } };
    const authorization = await createCertificationService(pool, config).getCourseAuthorization(student);
    assert.equal(evaluateCourseAccessReadiness(record, config).authorized, Boolean(authorization));
  }
});
test('complete pending record stays approval-ready but not course-authorized', () => {
  const result = evaluateCourseAccessReadiness({ ...complete, status: 'pending', student_id: null, approved_by: null, approved_at: null }, config);
  assert.equal(result.authorized, false); assert.equal(result.readyForApproval, true); assert.equal(result.blockers.length, 4);
});
test('worst-case diagnostics fit the existing student-record embed field', () => {
  const result = evaluateCourseAccessReadiness({ acknowledgment_name: 'PRIVATE-NAME', signature_reference: 'PRIVATE-REFERENCE' }, { ...config, enabled: false });
  const value = `Course access checks: Blocked\nPending record ready for approval: No\n${result.blockers.join('\n')}\nInspection does not change access or approve enrollment.`;
  assert.ok(value.length <= 1024, `Diagnostic field is ${value.length} characters`);
  assert.doesNotMatch(value, /PRIVATE-NAME|PRIVATE-REFERENCE/);
});
