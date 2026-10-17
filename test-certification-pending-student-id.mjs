import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationService } from './certification-service.js';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const admin = '111111111111111111', student = '222222222222222222';
const config = { enabled: true, ownerId: admin, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
function fixture(student_id) {
  const record = Object.freeze({ discord_user_id: student, status: 'pending', student_id, approved_by: null, approved_at: null, signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION });
  const calls = [], releases = [];
  const db = { async query(sql, params) { calls.push({ sql, params }); return { rows: sql.startsWith('SELECT') ? [record] : [] }; }, release(discard) { releases.push(discard); } };
  return { record, calls, releases, service: createCertificationService({ async connect() { return db; } }, config) };
}
for (const [label, id] of [['empty', ''], ['whitespace', ' \t\n '], ['zero', 0], ['number', 123], ['object', {}], ['boolean', false]]) {
  test(`pending ${label} ID blocks approval and readiness without writes`, async () => {
    const f = fixture(id), readiness = evaluateCourseAccessReadiness(f.record, config);
    assert.equal(readiness.authorized, false); assert.equal(readiness.readyForApproval, false);
    assert.ok(readiness.blockers.includes('Pending permanent student ID is invalid; admin review required.'));
    await assert.rejects(f.service.approveEnrollment(admin, student), /Pending permanent student ID is invalid/);
    assert.ok(!f.calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)));
    assert.ok(!f.calls.some(call => call.sql === 'COMMIT'));
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.deepEqual(f.releases, [false]);
    assert.equal(f.record.student_id, id);
  });
}
for (const [label, id] of [['null', null], ['undefined', undefined], ['existing', 'NG-PT-existing'], ['nonblank with surrounding spaces', ' NG-PT-existing ']]) {
  test(`pending ${label} ID approves with a valid preserved or newly issued ID`, async () => {
    const f = fixture(id);
    const readiness = evaluateCourseAccessReadiness(f.record, config);
    assert.equal(readiness.readyForApproval, true); assert.equal(readiness.authorized, false);
    const result = await f.service.approveEnrollment(admin, student);
    assert.equal(result.alreadyApproved, false);
    if (id == null) assert.match(result.studentId, /^NG-PT-[a-f0-9-]{36}$/);
    else assert.equal(result.studentId, id);
    const update = f.calls.find(call => call.sql.startsWith('UPDATE certification_enrollments'));
    assert.deepEqual(update.params, [student, result.studentId, admin]);
    const audit = f.calls.find(call => call.sql.startsWith('INSERT INTO certification_audit_events'));
    assert.equal(JSON.parse(audit.params[2]).studentId, result.studentId);
    assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.deepEqual(f.releases, [false]);
    const approved = { ...f.record, status: 'approved', student_id: result.studentId, approved_by: admin, approved_at: 'recorded' };
    assert.equal(evaluateCourseAccessReadiness(approved, config).authorized, true);
    const service = createCertificationService({ async query() { return { rows: [approved] }; } }, config);
    assert.deepEqual(await service.getCourseAuthorization(student), { student_id: result.studentId });
    assert.equal(f.record.student_id, id);
  });
}
