import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmission } from './certification-submission.js';

const student = '1223123544301633568';
const content = 'Test fixture only, not a published agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['scope', 'stop'] } };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'fixture-v2', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['scope', 'stop'] };
const pending = { discord_user_id: student, status: 'pending', agreement_version: 'fixture-v2', agreement_content_sha256: hash, comprehension_check_version: 'fixture-check', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', age_eligible: true, age_declared_at: 'date', age_declaration_version: 'adult-18-v1' };
function fixture(row = { status: 'awaiting_acknowledgment' }, failAudit = false, agreement = { content, content_sha256: hash }, settings = config) {
  const calls = []; let connections = 0; let released = false;
  const pool = { async connect() { connections++; return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM certification_agreements')) return { rows: agreement ? [agreement] : [] };
      if (sql.includes('FOR UPDATE')) return { rows: row ? [row] : [] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Audit write failed');
      return { rows: [] };
    }, release() { released = true; }
  }; } };
  return { calls, service: createCertificationSubmission(pool, settings), get connections() { return connections; }, get released() { return released; } };
}
const changedEnrollment = f => f.calls.some(c => c.sql.startsWith('UPDATE certification_enrollments'));

test('submission remains separately disabled by default', async () => {
  const f = fixture(undefined, false, undefined, { ...config, enrollmentSubmissionEnabled: undefined });
  await assert.rejects(f.service.submitEnrollment(student, input), /disabled/); assert.equal(f.connections, 0);
});
test('missing server answer key fails closed', async () => {
  const f = fixture(undefined, false, undefined, { ...config, comprehensionCheck: undefined });
  await assert.rejects(f.service.submitEnrollment(student, input), /configuration required/); assert.equal(f.connections, 0);
});
test('invalid eligibility, acknowledgment, versions and answers never access database', async () => {
  for (const changes of [{ ageEligibility: 'no' }, { ageEligibility: undefined }, { ageEligibility: true }, { acknowledgmentAccepted: false }, { confirmedRead: false }, { agreementVersion: 'old' }, { agreementSha256: '0'.repeat(64) }, { comprehensionCheckVersion: 'old' }, { answers: ['wrong', 'stop'] }]) {
    const f = fixture(); await assert.rejects(f.service.submitEnrollment(student, { ...input, ...changes })); assert.equal(f.connections, 0);
  }
  const f = fixture(); await assert.rejects(f.service.submitEnrollment('invalid', input), /Invalid student/); assert.equal(f.connections, 0);
});
test('added identity fields and accessors are rejected without invoking getters', async () => {
  for (const extra of [{ typedName: 'Fixture name' }, { birthDate: '2000-01-01' }, { email: 'fixture@example.com' }, { actualAge: 18 }]) {
    const f = fixture(); await assert.rejects(f.service.submitEnrollment(student, { ...input, ...extra }), /Unsupported enrollment field/); assert.equal(f.connections, 0);
  }
  let invoked = false; const payload = { ...input };
  Object.defineProperty(payload, 'ageEligibility', { get() { invoked = true; return 'yes'; } });
  const f = fixture(); await assert.rejects(f.service.submitEnrollment(student, payload), /Unsupported enrollment field/);
  assert.equal(invoked, false); assert.equal(f.connections, 0);
});
test('valid submission records account declaration and audit without issuing ID', async () => {
  const f = fixture(); assert.deepEqual(await f.service.submitEnrollment(student, input), { status: 'pending', alreadySubmitted: false });
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.deepEqual(update.params, [student, 'fixture-v2', hash, 'fixture-check', 'adult-18-v1']);
  assert.match(update.sql, /status='pending'/); assert.match(update.sql, /signature_method='discord_account'/);
  assert.match(update.sql, /acknowledgment_name=NULL/); assert.match(update.sql, /signature_reference=NULL/); assert.match(update.sql, /age_eligible=TRUE/);
  assert.ok(!update.sql.includes('student_id=') && !update.sql.includes('approved_by='));
  const audit = JSON.parse(f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events')).params[1]);
  assert.deepEqual(audit, { agreementVersion: 'fixture-v2', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', acknowledgmentMethod: 'discord_account', ageDeclarationVersion: 'adult-18-v1', ageEligibility: true });
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.equal(f.released, true);
});
test('agreement content tampering rolls back', async () => {
  const f = fixture(undefined, false, { content: 'changed', content_sha256: hash });
  await assert.rejects(f.service.submitEnrollment(student, input), /content is unavailable or changed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.released, true);
});
test('restricted states cannot be bypassed by resubmission', async () => {
  for (const status of ['approved', 'denied', 'suspended', 'revoked']) {
    const f = fixture({ status }); await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
    assert.equal(changedEnrollment(f), false); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});
test('exact pending resubmission does not rewrite acknowledgment or duplicate audit', async () => {
  const f = fixture({ ...pending });
  assert.deepEqual(await f.service.submitEnrollment(student, input), { status: 'pending', alreadySubmitted: true });
  assert.equal(changedEnrollment(f), false); assert.ok(!f.calls.some(c => c.sql.includes('INSERT INTO certification_audit_events')));
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
});
test('different or incomplete pending records cannot be overwritten', async () => {
  for (const row of [{ status: 'pending' }, { ...pending, agreement_version: 'old' }, { ...pending, age_eligible: false }, { ...pending, age_declaration_version: null }]) {
    const f = fixture(row); await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
    assert.equal(changedEnrollment(f), false); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});
test('prior approval and historical identity fields cannot be hidden behind awaiting status', async () => {
  for (const extra of [{ student_id: 'NG-PT-existing' }, { approved_by: student }, { approved_at: 'date' }, { acknowledgment_name: 'Fixture name' }, { signature_reference: 'Fixture document' }]) {
    const f = fixture({ status: 'awaiting_acknowledgment', ...extra });
    await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
    assert.equal(changedEnrollment(f), false); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});
test('audit failure rolls back submission without committing', async () => {
  const f = fixture(undefined, true); await assert.rejects(f.service.submitEnrollment(student, input), /Audit write failed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.ok(!f.calls.some(c => c.sql === 'COMMIT')); assert.equal(f.released, true);
});
