import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationAccessManagement } from './certification-access-management.js';

const owner = '1223123544301633567';
const student = '1223123544301633568';
const config = { ownerId: owner, enabled: true };
const base = { status: 'approved', student_id: 'NG-PT-fixed', agreement_version: 'test-v2',
  acknowledged_at: 'date', signature_method: 'typed_name', acknowledgment_name: 'Example Learner', signature_reference: null,
  learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', approved_by: owner, approved_at: 'date' };

function fixture(row = base, failAudit = false) {
  const calls = [];
  let released = false;
  const pool = { async connect() { return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Audit write failed');
      if (sql.includes('RETURNING request_id')) return { rows: [{ request_id: 'lab-request' }] };
      return { rows: [] };
    }, release() { released = true; }
  }; } };
  return { calls, service: createCertificationAccessManagement(pool, config), get released() { return released; } };
}

test('non-owner cannot change enrollment', async () => {
  const f = fixture();
  await assert.rejects(f.service.changeEnrollmentStatus(student, student, 'revoke', 'Policy violation'), /owner authorization/);
  assert.equal(f.calls.length, 0);
});

test('suspension preserves ID and revokes lab permissions in same transaction', async () => {
  const f = fixture();
  const result = await f.service.changeEnrollmentStatus(owner, student, 'suspend', 'Review required');
  assert.equal(result.status, 'suspended');
  assert.equal(result.studentId, 'NG-PT-fixed');
  assert.deepEqual(result.revokedLabRequests, ['lab-request']);
  assert.equal(result.sessionTerminationRequired, true);
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.ok(!update.sql.includes('student_id='));
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.released, true);
});

test('typed acknowledgment reinstates without a document reference or restored labs', async () => {
  for (const status of ['revoked', 'suspended']) {
    const f = fixture({ ...base, status });
    const result = await f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Owner review completed');
    assert.equal(result.status, 'approved');
    assert.equal(result.studentId, 'NG-PT-fixed');
    assert.equal(result.sessionTerminationRequired, false);
    assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_lab_requests')));
    assert.equal(f.calls.at(-1).sql, 'COMMIT');
  }
});

test('invalid transitions roll back and release connection', async () => {
  const f = fixture({ ...base, status: 'pending' });
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed'), /does not permit/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(f.released, true);
});

test('empty reasons and unexpected actions fail before database calls', async () => {
  const f = fixture();
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'revoke', ' '), /reason/);
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, '__proto__', 'Reason'), /Invalid/);
  assert.equal(f.calls.length, 0);
});

test('reinstatement requires all acknowledgment and prior-approval records', async () => {
  for (const field of ['student_id', 'agreement_version', 'acknowledged_at', 'signature_method', 'acknowledgment_name',
    'learner_confirmed_read_at', 'comprehension_passed_at', 'approved_by', 'approved_at']) {
    const f = fixture({ ...base, status: 'revoked', [field]: null });
    await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed'), /Prior approval/);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
    assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_enrollments')));
    assert.equal(f.released, true);
  }
});

test('legacy signing methods cannot substitute for typed acknowledgment', async () => {
  const f = fixture({ ...base, status: 'revoked', signature_method: 'signed_document', signature_reference: 'legacy-reference' });
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed'), /Prior approval/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});

test('audit failure rolls back access changes and never commits', async () => {
  const f = fixture(base, true);
  await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'suspend', 'Reviewed'), /Audit write failed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!f.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(f.released, true);
});

test('invalid student IDs fail before database calls', async () => {
  for (const value of ['invalid', null, 42]) {
    const f = fixture();
    await assert.rejects(f.service.changeEnrollmentStatus(owner, value, 'suspend', 'Reviewed'), /Invalid student/);
    assert.equal(f.calls.length, 0);
  }
});
