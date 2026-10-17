import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationAccessManagement } from './certification-access-management.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const owner = '111111111111111111', student = '222222222222222222';
const config = { enabled: true, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
function fixture(status, student_id) {
  const row = { discord_user_id: student, status, student_id, approved_by: owner, approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
  const calls = [], releases = [];
  const db = { async query(sql, params) { calls.push({ sql, params }); return { rows: sql.startsWith('SELECT') ? [row] : [] }; }, release(discard) { releases.push(discard); } };
  return { calls, releases, service: createCertificationAccessManagement({ async connect() { return db; } }, config) };
}
for (const status of ['suspended', 'revoked']) {
  for (const [label, id] of [['empty', ''], ['whitespace', ' \t\n '], ['null', null], ['zero', 0], ['number', 123], ['object', {}]]) {
    test(`${status}: reinstatement rejects ${label} permanent ID before writes`, async () => {
      const f = fixture(status, id);
      await assert.rejects(f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed'), /Prior approval/);
      assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
      assert.ok(!f.calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)));
      assert.ok(!f.calls.some(call => call.sql === 'COMMIT'));
      assert.deepEqual(f.releases, [false]);
    });
  }
  test(`${status}: valid ID is preserved and lab permissions are not restored`, async () => {
    const f = fixture(status, 'NG-PT-fixed');
    const result = await f.service.changeEnrollmentStatus(owner, student, 'reinstate', 'Reviewed');
    assert.equal(result.status, 'approved');
    assert.equal(result.studentId, 'NG-PT-fixed');
    assert.deepEqual(result.revokedLabRequests, []);
    assert.equal(result.sessionTerminationRequired, false);
    assert.ok(!f.calls.some(call => call.sql.includes('UPDATE certification_lab_requests')));
    const update = f.calls.find(call => call.sql.startsWith('UPDATE certification_enrollments'));
    assert.ok(update);
    assert.doesNotMatch(update.sql, /student_id\s*=/);
    assert.ok(f.calls.some(call => call.sql.startsWith('INSERT INTO certification_audit_events')));
    assert.equal(f.calls.at(-1).sql, 'COMMIT');
    assert.deepEqual(f.releases, [false]);
  });
}
