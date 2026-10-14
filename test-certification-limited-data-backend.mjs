import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationAccessManagement } from './certification-access-management.js';

const learner = '123456789012345678';
const owner = '223456789012345678';
const content = 'Disposable test agreement';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: owner, activeAgreementVersion: 'v2', activeAgreementSha256: hash, comprehensionCheck: { version: 'q2', correctAnswers: ['STOP'] } };
const submission = () => ({ ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'v2', agreementSha256: hash, comprehensionCheckVersion: 'q2', answers: ['STOP'] });
const record = (status = 'pending') => ({ discord_user_id: learner, status, signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v2', agreement_content_sha256: hash, comprehension_check_version: 'q2', acknowledged_at: '2026-10-14', learner_confirmed_read_at: '2026-10-14', comprehension_passed_at: '2026-10-14', age_eligible: true, age_declared_at: '2026-10-14', age_declaration_version: 'adult-18-v1', student_id: 'NG-PT-existing', approved_by: owner, approved_at: '2026-10-14' });
function fixture(row) {
  const calls = []; let connections = 0;
  const query = async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('SELECT * FROM certification_enrollments')) return { rows: row ? [row] : [] };
    return { rows: [] };
  };
  return { calls, get connections() { return connections; }, query, connect: async () => { connections++; return { query, release: discard => calls.push({ release: discard }) }; } };
}

for (const change of [{ ageEligibility: 'no' }, { ageEligibility: undefined }, { typedName: 'Example' }, { birthDate: '2000-01-01' }, { acknowledgmentAccepted: false }, { confirmedRead: false }, { answers: ['WRONG'] }, { agreementVersion: 'old' }]) {
  test(`invalid submission rejected before database connection ${JSON.stringify(change)}`, async () => {
    const pool = fixture(null);
    await assert.rejects(createCertificationSubmission(pool, config).submitEnrollment(learner, { ...submission(), ...change }));
    assert.equal(pool.connections, 0);
  });
}

test('eligible account submission writes declaration without legal name or document', async () => {
  const pool = fixture({ discord_user_id: learner, status: 'awaiting_acknowledgment' });
  assert.deepEqual(await createCertificationSubmission(pool, config).submitEnrollment(learner, submission()), { status: 'pending', alreadySubmitted: false });
  const update = pool.calls.find(call => call.sql?.startsWith('UPDATE certification_enrollments'));
  assert.match(update.sql, /signature_method='discord_account'/);
  assert.match(update.sql, /age_eligible=TRUE/);
  assert.deepEqual(update.values, [learner, 'v2', hash, 'q2', 'adult-18-v1']);
  assert.ok(pool.calls.some(call => call.sql === 'COMMIT'));
});

test('submission does not erase historical name fields', async () => {
  const pool = fixture({ discord_user_id: learner, status: 'awaiting_acknowledgment', acknowledgment_name: 'Historical fixture' });
  await assert.rejects(createCertificationSubmission(pool, config).submitEnrollment(learner, submission()));
  assert.ok(pool.calls.some(call => call.sql === 'ROLLBACK'));
  assert.ok(!pool.calls.some(call => call.sql?.startsWith('UPDATE certification_enrollments')));
});

for (const change of [{ age_eligible: false }, { age_declared_at: null }, { signature_method: 'typed_name' }, { agreement_version: 'old' }]) {
  test(`approval and reinstatement fail closed ${JSON.stringify(change)}`, async () => {
    const pool = fixture({ ...record(), ...change });
    await assert.rejects(createCertificationService(pool, config).approveEnrollment(owner, learner));
    assert.ok(!pool.calls.some(call => call.sql?.startsWith('UPDATE certification_enrollments')));
    const reinstatementPool = fixture({ ...record('suspended'), ...change });
    await assert.rejects(createCertificationAccessManagement(reinstatementPool, config).changeEnrollmentStatus(owner, learner, 'reinstate', 'Owner review'));
    assert.ok(!reinstatementPool.calls.some(call => call.sql?.startsWith('UPDATE certification_enrollments')));
  });
}

test('owner approval preserves a previously issued ID; non-owner cannot connect', async () => {
  const pool = fixture(record());
  assert.equal((await createCertificationService(pool, config).approveEnrollment(owner, learner)).studentId, 'NG-PT-existing');
  const unauthorized = fixture(record());
  await assert.rejects(createCertificationService(unauthorized, config).approveEnrollment(learner, learner));
  assert.equal(unauthorized.connections, 0);
});

test('reinstatement does not restore lab requests', async () => {
  const pool = fixture(record('suspended'));
  const result = await createCertificationAccessManagement(pool, config).changeEnrollmentStatus(owner, learner, 'reinstate', 'Owner review');
  assert.equal(result.status, 'approved');
  assert.deepEqual(result.revokedLabRequests, []);
  assert.ok(!pool.calls.some(call => call.sql?.includes('UPDATE certification_lab_requests')));
});

test('course authorization rejects absent eligibility and accepts complete approved record', async () => {
  const good = fixture(record('approved'));
  assert.deepEqual(await createCertificationService(good, config).getCourseAuthorization(learner), { student_id: 'NG-PT-existing' });
  const bad = fixture({ ...record('approved'), age_eligible: null });
  assert.equal(await createCertificationService(bad, config).getCourseAuthorization(learner), null);
});
