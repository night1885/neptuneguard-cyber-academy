import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationAccessManagement } from './certification-access-management.js';

const owner = '1223123544301633567';
const student = '1223123544301633568';
const config = { ownerId: owner, enabled: true };
const base = { status: 'approved', student_id: 'NG-PT-fixed', agreement_version: 'v1',
  acknowledged_at: 'date', signature_method: 'test', signature_reference: 'reference',
  learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', approved_by: owner, approved_at: 'date' };

function fixture(row = base) {
  const calls = [];
  let released = false;
  const pool = { async connect() { return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...row }] };
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

test('reinstatement never automatically restores labs', async () => {
  const f = fixture({ ...base, status: 'revoked' });
  const result = await f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Owner review completed');
  assert.equal(result.status, 'approved');
  assert.equal(result.studentId, 'NG-PT-fixed');
  assert.equal(result.sessionTerminationRequired, false);
  assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_lab_requests')));
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
