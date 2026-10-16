import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmission } from './certification-submission.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const student = '222222222222222222', owner = '111111111111111111';
const content = 'Disposable invitation agreement fixture.', hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: false, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: hash, comprehensionCheck: { version: 'v1', correctAnswers: ['A'] } };
const submission = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'v1', agreementSha256: hash, comprehensionCheckVersion: 'v1', answers: ['A'] };
function fixture(options = {}) {
  const queries = [], releases = []; let connections = 0;
  const db = { async query(sql, values) {
    queries.push({ sql, values });
    if (sql === 'ROLLBACK' && options.rollbackFails) throw new Error('rollback failed');
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.startsWith('SELECT * FROM certification_enrollments')) return { rows: options.missing ? [] : [{ status: 'awaiting_acknowledgment', ...options.record }] };
    if (sql === PENDING_REGISTRATION_INVITATION_SQL) return { rows: options.invited === false ? [] : [{ invited: 1 }] };
    if (sql.includes("'enrollment_submitted'") && options.auditFails) throw new Error('audit failed');
    return { rows: [] };
  }, release(discard) { releases.push(discard); } };
  const pool = { async connect() { connections++; return db; }, query() { assert.fail('Invitation must be checked on the locked transaction client'); } };
  return { service: createCertificationSubmission(pool, { ...config, ...options.config }), queries, releases, connections: () => connections };
}
test('invited submission rechecks provenance after row lock and only requests pending review', async () => {
  const f = fixture(); assert.deepEqual(await f.service.submitInvitedEnrollment(student, submission), { status: 'pending', alreadySubmitted: false });
  const sql = f.queries.map(q => q.sql);
  assert.ok(sql.findIndex(q => q.endsWith('FOR UPDATE')) < sql.indexOf(PENDING_REGISTRATION_INVITATION_SQL));
  assert.deepEqual(f.queries.find(q => q.sql === PENDING_REGISTRATION_INVITATION_SQL).values, [student, owner]);
  assert.equal(sql.filter(q => q.startsWith('UPDATE certification_enrollments')).length, 1);
  assert.equal(sql.filter(q => q.startsWith('INSERT INTO certification_enrollments')).length, 0);
  const update = sql.find(q => q.startsWith('UPDATE certification_enrollments')); assert.match(update, /status='pending'/); assert.doesNotMatch(update, /student_id\s*=|approved_by\s*=|approved_at\s*=/);
  assert.equal(sql.at(-1), 'COMMIT'); assert.deepEqual(f.releases, [false]);
});
test('ordinary method stays closed and extra arguments cannot select invitation mode', async () => {
  const f = fixture(); await assert.rejects(f.service.submitEnrollment(student, submission, true), /disabled/); assert.equal(f.connections(), 0);
});
test('missing record and missing invitation roll back without writes', async () => {
  for (const options of [{ missing: true }, { invited: false }]) {
    const f = fixture(options); await assert.rejects(f.service.submitInvitedEnrollment(student, submission));
    assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
    assert.ok(f.queries.every(q => !/^INSERT|^UPDATE/.test(q.sql))); assert.deepEqual(f.releases, [false]);
  }
});
test('existing access and historical identity cannot be reset even if a mocked invitation says yes', async () => {
  for (const record of [{ status: 'approved' }, { status: 'denied' }, { status: 'suspended' }, { status: 'revoked' }, { student_id: 'NG-HISTORICAL' }, { approved_by: owner }, { acknowledgment_name: 'historical' }, { signature_reference: 'historical' }]) {
    const f = fixture({ record }); await assert.rejects(f.service.submitInvitedEnrollment(student, submission), /requires owner review/);
    assert.ok(f.queries.every(q => !/^INSERT|^UPDATE/.test(q.sql)));
  }
});
test('agreement age answers and unsupported fields are validated before database access', async () => {
  for (const changed of [{ ageEligibility: 'no' }, { acknowledgmentAccepted: false }, { confirmedRead: false }, { agreementSha256: 'b'.repeat(64) }, { answers: ['wrong'] }, { invitedOnly: true }]) {
    const f = fixture(); await assert.rejects(f.service.submitInvitedEnrollment(student, { ...submission, ...changed })); assert.equal(f.connections(), 0);
  }
  const disabled = fixture({ config: { enabled: false } }); await assert.rejects(disabled.service.submitInvitedEnrollment(student, submission), /disabled/); assert.equal(disabled.connections(), 0);
});
test('audit failure rolls back and failed rollback discards the transaction client', async () => {
  for (const rollbackFails of [false, true]) {
    const f = fixture({ auditFails: true, rollbackFails }); await assert.rejects(f.service.submitInvitedEnrollment(student, submission), /audit failed/);
    assert.equal(f.queries.at(-1).sql, 'ROLLBACK'); assert.deepEqual(f.releases, [rollbackFails]); assert.ok(!f.queries.some(q => q.sql === 'COMMIT'));
  }
});
