import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmission } from './certification-submission.js';

const student = '1223123544301633568';
const content = 'Test fixture only, not a published agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2',
  activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['scope', 'stop'] } };
const input = { typedName: ' Example Learner ', confirmedRead: true, agreementVersion: 'fixture-v2',
  agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['scope', 'stop'] };
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

test('submission is separately disabled by default', async () => {
  const f = fixture(undefined, false, undefined, { ...config, enrollmentSubmissionEnabled: undefined });
  await assert.rejects(f.service.submitEnrollment(student, input), /disabled/);
  assert.equal(f.connections, 0);
});
test('missing server answer key fails closed', async () => {
  const f = fixture(undefined, false, undefined, { ...config, comprehensionCheck: undefined });
  await assert.rejects(f.service.submitEnrollment(student, input), /configuration required/);
  assert.equal(f.connections, 0);
});
test('invalid name, identity, reading confirmation, versions, and answers never access database', async () => {
  for (const changes of [{ typedName: ' ' }, { confirmedRead: false }, { agreementVersion: 'old' },
    { agreementSha256: '0'.repeat(64) }, { comprehensionCheckVersion: 'old' }, { answers: ['wrong', 'stop'] }]) {
    const f = fixture(); await assert.rejects(f.service.submitEnrollment(student, { ...input, ...changes }));
    assert.equal(f.connections, 0);
  }
  const f = fixture(); await assert.rejects(f.service.submitEnrollment('invalid', input), /Invalid student/);
  assert.equal(f.connections, 0);
});
test('valid submission records pending acknowledgment and audit without issuing an ID', async () => {
  const f = fixture(); assert.deepEqual(await f.service.submitEnrollment(student, input), { status: 'pending', alreadySubmitted: false });
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.equal(update.params[3], 'Example Learner');
  assert.ok(update.sql.includes("status='pending'"));
  assert.ok(update.sql.includes('signature_reference=NULL'));
  assert.ok(!update.sql.includes('student_id=') && !update.sql.includes('approved_by='));
  const audit = f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events'));
  assert.equal(JSON.parse(audit.params[1]).agreementSha256, hash);
  assert.ok(!audit.params[1].includes('Example Learner'));
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.equal(f.released, true);
});
test('agreement content tampering rolls back', async () => {
  const f = fixture(undefined, false, { content: 'changed', content_sha256: hash });
  await assert.rejects(f.service.submitEnrollment(student, input), /content is unavailable or changed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.released, true);
});
test('restricted states cannot be bypassed by learner resubmission', async () => {
  for (const status of ['approved', 'denied', 'suspended', 'revoked']) {
    const f = fixture({ status }); await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
    assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_enrollments')));
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});
test('exact pending resubmission does not rewrite acknowledgment or duplicate audit', async () => {
  const f = fixture({ status: 'pending', agreement_version: 'fixture-v2', agreement_content_sha256: hash,
    comprehension_check_version: 'fixture-check', signature_method: 'typed_name', acknowledgment_name: 'Example Learner',
    acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date' });
  assert.deepEqual(await f.service.submitEnrollment(student, input), { status: 'pending', alreadySubmitted: true });
  assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_enrollments') || c.sql.includes('INSERT INTO certification_audit_events')));
});
test('different pending record cannot be overwritten', async () => {
  const f = fixture({ status: 'pending' }); await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});
test('prior approval records cannot be hidden behind awaiting status', async () => {
  const f = fixture({ status: 'awaiting_acknowledgment', student_id: 'NG-PT-existing' });
  await assert.rejects(f.service.submitEnrollment(student, input), /owner review/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});
test('audit failure rolls back submission', async () => {
  const f = fixture(undefined, true); await assert.rejects(f.service.submitEnrollment(student, input), /Audit write failed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.ok(!f.calls.some(c => c.sql === 'COMMIT')); assert.equal(f.released, true);
});
