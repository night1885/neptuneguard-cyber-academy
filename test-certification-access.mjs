import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationAccessManagement } from './certification-access-management.js';

const owner = '1223123544301633567';
const student = '1223123544301633568';
const config = { ownerId: owner, enabled: true };
const base = { discord_user_id: student, status: 'approved', student_id: 'NG-PT-fixed', agreement_version: 'test-v2',
  agreement_content_sha256: 'a'.repeat(64), comprehension_check_version: 'check-v2',
  acknowledged_at: 'date', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null,
  learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', approved_by: owner, approved_at: 'date',
  age_eligible: true, age_declared_at: 'date', age_declaration_version: 'adult-18-v1' };
function fixture(row = base, failAudit = false, activeConfig = config) {
  const calls = []; let released = false;
  const pool = { async connect() { return { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
    if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Audit write failed');
    if (sql.includes('RETURNING request_id')) return { rows: [{ request_id: 'lab-request' }] };
    return { rows: [] };
  }, release() { released = true; } }; } };
  return { calls, service: createCertificationAccessManagement(pool, activeConfig), get released() { return released; } };
}
async function rejectReinstatement(f, pattern = /Prior approval/) {
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed'), pattern);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_enrollments'))); assert.equal(f.released, true);
}
test('non-owner cannot change enrollment', async () => {
  const f = fixture();
  await assert.rejects(f.service.changeEnrollmentStatus(student, student, 'revoke', 'Policy violation'), /owner authorization/); assert.equal(f.calls.length, 0);
});
test('suspension preserves ID and revokes lab permissions transactionally', async () => {
  const f = fixture(); const result = await f.service.changeEnrollmentStatus(owner, student, 'suspend', 'Review required');
  assert.equal(result.status, 'suspended'); assert.equal(result.studentId, 'NG-PT-fixed');
  assert.deepEqual(result.revokedLabRequests, ['lab-request']); assert.equal(result.sessionTerminationRequired, true);
  assert.ok(!f.calls.find(c => c.sql.includes('UPDATE certification_enrollments')).sql.includes('student_id='));
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.equal(f.released, true);
});
test('adult account acknowledgment reinstates without name, document or restored labs', async () => {
  for (const status of ['revoked', 'suspended']) {
    const f = fixture({ ...base, status }); const result = await f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Owner review completed');
    assert.equal(result.status, 'approved'); assert.equal(result.studentId, 'NG-PT-fixed'); assert.equal(result.sessionTerminationRequired, false);
    assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_lab_requests'))); assert.equal(f.calls.at(-1).sql, 'COMMIT');
  }
});
test('invalid transitions roll back and release connection', async () => {
  await rejectReinstatement(fixture({ ...base, status: 'pending' }), /does not permit/);
});
test('empty reasons and unexpected actions fail before database calls', async () => {
  const f = fixture();
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'revoke', ' '), /reason/);
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, '__proto__', 'Reason'), /Invalid/); assert.equal(f.calls.length, 0);
});
test('reinstatement requires account, adult eligibility and prior-approval records', async () => {
  for (const field of ['discord_user_id', 'student_id', 'agreement_version', 'agreement_content_sha256', 'comprehension_check_version', 'acknowledged_at', 'signature_method', 'learner_confirmed_read_at', 'comprehension_passed_at', 'approved_by', 'approved_at', 'age_eligible', 'age_declared_at', 'age_declaration_version']) {
    await rejectReinstatement(fixture({ ...base, status: 'revoked', [field]: null }));
  }
});
test('legacy methods and retained identity fields cannot substitute for account acknowledgment', async () => {
  for (const changes of [{ signature_method: 'signed_document', signature_reference: 'legacy-reference' }, { signature_method: 'typed_name' }, { acknowledgment_name: 'Fixture name' }, { signature_reference: 'Fixture reference' }, { age_eligible: false }, { age_declaration_version: 'unknown' }]) {
    await rejectReinstatement(fixture({ ...base, status: 'revoked', ...changes }));
  }
});
test('changed agreement, hash or comprehension version blocks reinstatement', async () => {
  for (const change of [{ activeAgreementVersion: 'changed' }, { activeAgreementSha256: 'b'.repeat(64) }, { comprehensionCheck: { version: 'changed' } }]) {
    await rejectReinstatement(fixture({ ...base, status: 'revoked' }, false, { ...config, ...change }));
  }
});
test('audit failure rolls back access changes without committing', async () => {
  const f = fixture(base, true);
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'suspend', 'Reviewed'), /Audit write failed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.ok(!f.calls.some(c => c.sql === 'COMMIT')); assert.equal(f.released, true);
});
test('invalid student IDs fail before database calls', async () => {
  for (const value of ['invalid', null, 42]) {
    const f = fixture(); await assert.rejects(f.service.changeEnrollmentStatus(owner, value, 'suspend', 'Reviewed'), /Invalid student/); assert.equal(f.calls.length, 0);
  }
});
