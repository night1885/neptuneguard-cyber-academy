import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationService } from './certification-service.js';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';

const user = '222222222222222222';
const owner = '111111111111111111';
const config = { enabled: true, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
function record(student_id) {
  return { discord_user_id: user, status: 'approved', student_id, approved_by: owner, approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
}
const cases = [['valid', 'NG-test', true], ['empty', '', false], ['whitespace', ' \t\n ', false], ['null', null, false], ['number', 123, false], ['object', {}, false]];
for (const [label, id, valid] of cases) {
  test(`student ID ${label}: authorization matches readiness without mutation`, async () => {
    const row = record(id);
    const before = structuredClone(row);
    const pool = { async query(sql, params) { assert.match(sql, /SELECT/); assert.deepEqual(params, [user]); return { rows: [row] }; } };
    const authorization = await createCertificationService(pool, config).getCourseAuthorization(user);
    assert.equal(evaluateCourseAccessReadiness(row, config).authorized, valid);
    assert.equal(Boolean(authorization), valid);
    if (valid) assert.deepEqual(authorization, { student_id: id });
    assert.deepEqual(row, before);
  });
  test(`student ID ${label}: repeated approval validates existing ID`, async () => {
    const row = record(id);
    const statements = [];
    const releases = [];
    const db = {
      async query(sql) { statements.push(sql); return { rows: sql.startsWith('SELECT') ? [row] : [] }; },
      release(discard) { releases.push(discard); }
    };
    const service = createCertificationService({ async connect() { return db; } }, config);
    if (valid) {
      assert.deepEqual(await service.approveEnrollment(owner, user), { studentId: id, alreadyApproved: true });
      assert.ok(statements.includes('COMMIT'));
    } else {
      await assert.rejects(service.approveEnrollment(owner, user), /Approved enrollment is incomplete/);
      assert.ok(statements.includes('ROLLBACK'));
      assert.ok(!statements.includes('COMMIT'));
    }
    assert.ok(!statements.some(sql => /^(UPDATE|INSERT)/.test(sql)));
    assert.deepEqual(releases, [false]);
  });
}
