import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationService } from './certification-service.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationAccessManagement } from './certification-access-management.js';

const owner = '1223123544301633567'; const student = '1223123544301633568';
const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: owner,
  activeAgreementVersion: 'fixture-v1', activeAgreementSha256: 'a'.repeat(64),
  comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
const submission = { typedName: 'Fixture Learner', confirmedRead: true, answers: ['stop'],
  agreementVersion: config.activeAgreementVersion, agreementSha256: config.activeAgreementSha256,
  comprehensionCheckVersion: config.comprehensionCheck.version };
const operations = {
  approval: pool => createCertificationService(pool, config).approveEnrollment(owner, student),
  submission: pool => createCertificationSubmission(pool, config).submitEnrollment(student, submission),
  access: pool => createCertificationAccessManagement(pool, config).changeEnrollmentStatus(owner, student, 'suspend', 'Fixture reason')
};
function fixture({ rollbackFails = false, beginFails = false } = {}) {
  const original = new Error('Synthetic operation error'); const calls = []; const releases = [];
  const db = { async query(sql) {
    calls.push(sql);
    if (sql === 'ROLLBACK') { if (rollbackFails) throw new Error('Synthetic rollback error'); return {}; }
    if (sql === 'BEGIN' && !beginFails) return {};
    throw original;
  }, release(discard) { releases.push(discard); } };
  return { original, calls, releases, pool: { async connect() { return db; } } };
}
for (const [name, operation] of Object.entries(operations)) {
  test(`${name} returns connection normally after successful rollback and preserves original error`, async () => {
    const f = fixture(); await assert.rejects(operation(f.pool), error => error === f.original);
    assert.equal(f.calls.filter(sql => sql === 'ROLLBACK').length, 1); assert.deepEqual(f.releases, [false]);
    assert.ok(!f.calls.includes('COMMIT'));
  });
  test(`${name} discards connection after failed rollback and preserves original error`, async () => {
    const f = fixture({ rollbackFails: true }); await assert.rejects(operation(f.pool), error => error === f.original);
    assert.equal(f.calls.filter(sql => sql === 'ROLLBACK').length, 1); assert.deepEqual(f.releases, [true]);
    assert.ok(!f.calls.includes('COMMIT'));
  });
  test(`${name} also discards on BEGIN failure followed by rollback failure`, async () => {
    const f = fixture({ rollbackFails: true, beginFails: true });
    await assert.rejects(operation(f.pool), error => error === f.original);
    assert.deepEqual(f.calls, ['BEGIN', 'ROLLBACK']); assert.deepEqual(f.releases, [true]);
  });
}
