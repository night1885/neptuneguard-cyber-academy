import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationAgeRenewal } from './certification-age-renewal.js';
import { CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';

const learner = '1223123544301633568';
const content = 'Renewal fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-renewal', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
const input = { reportedAge: 16, typedName: 'Fixture Learner', confirmedRead: true, agreementVersion: 'fixture-renewal', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
const base = { status: 'suspended', student_id: 'NG-PT-fixed', approved_by: '1223123544301633567', approved_at: 'date', signature_method: 'typed_name', acknowledgment_name: input.typedName, agreement_version: input.agreementVersion, agreement_content_sha256: hash, comprehension_check_version: input.comprehensionCheckVersion, acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', age_eligibility_confirmed: null, age_eligibility_confirmed_at: null, age_policy_version: null };
function fixture(row = base, { settings = config, failAudit = false, failRollback = false, changedAgreement = false } = {}) {
  const calls = []; const releases = []; let connections = 0;
  const pool = { async connect() { connections++; return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM certification_agreements')) return { rows: [{ content: changedAgreement ? 'changed' : content, content_sha256: hash }] };
      if (sql.includes('FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Fixture audit failure');
      if (failRollback && sql === 'ROLLBACK') throw new Error('Fixture rollback failure');
      return { rows: [] };
    }, release(value) { releases.push(value); }
  }; } };
  return { service: createCertificationAgeRenewal(pool, settings), calls, releases, get connections() { return connections; } };
}
test('suspended and revoked renewal only writes trusted eligibility and preserves access/acknowledgment fields', async () => {
  for (const status of ['suspended', 'revoked']) {
    const f = fixture({ ...base, status });
    assert.deepEqual(await f.service.renewEligibility(learner, { ...input, age_policy_version: 'forged', age_eligibility_confirmed_at: 'forged', status: 'approved' }), { status, alreadyConfirmed: false });
    const update = f.calls.find(c => c.sql.startsWith('UPDATE'));
    assert.match(update.sql, /age_eligibility_confirmed_at=NOW\(\)/); assert.deepEqual(update.params, [learner, CERTIFICATION_AGE_POLICY_VERSION]);
    for (const field of ['status=', 'student_id=', 'approved_by=', 'approved_at=', 'acknowledgment_name=', 'acknowledged_at=']) assert.ok(!update.sql.includes(field));
    assert.ok(!f.calls.some(c => c.sql.includes('certification_lab_requests') || c.sql.startsWith('INSERT INTO certification_enrollments')));
    const audit = JSON.parse(f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events')).params[1]);
    assert.deepEqual(audit, { agePolicyVersion: CERTIFICATION_AGE_POLICY_VERSION, method: 'self_report', enrollmentStatus: status });
    assert.equal(f.calls.at(-1).sql, 'COMMIT');
  }
});
test('missing/below-16 age, incomplete reading, wrong versions, and failed comprehension reject before checkout', async () => {
  for (const change of [{ reportedAge: undefined }, { reportedAge: 15 }, { reportedAge: 'sixteen' }, { confirmedRead: false }, { agreementVersion: 'other' }, { answers: ['wrong'] }]) {
    const f = fixture(); await assert.rejects(f.service.renewEligibility(learner, { ...input, ...change })); assert.equal(f.connections, 0);
  }
  const disabled = fixture(base, { settings: { ...config, enrollmentSubmissionEnabled: false } });
  await assert.rejects(disabled.service.renewEligibility(learner, input), /disabled/); assert.equal(disabled.connections, 0);
  const f = fixture(); await assert.rejects(f.service.renewEligibility('invalid', input)); assert.equal(f.connections, 0);
});
test('other statuses, absent records, mismatched acknowledgment, or missing prior approval cannot renew', async () => {
  for (const row of [null, ...['pending', 'approved', 'denied', 'awaiting_acknowledgment'].map(status => ({ ...base, status })), { ...base, approved_by: null }, { ...base, student_id: null }, { ...base, acknowledgment_name: 'Different Learner' }, { ...base, agreement_content_sha256: '0'.repeat(64) }]) {
    const f = fixture(row); await assert.rejects(f.service.renewEligibility(learner, input), /owner review/);
    assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.includes('INSERT INTO certification_audit_events') || c.sql === 'COMMIT'));
  }
});
test('current evidence retry preserves its timestamp and avoids another audit event', async () => {
  const f = fixture({ ...base, age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date(), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION });
  assert.deepEqual(await f.service.renewEligibility(learner, input), { status: 'suspended', alreadyConfirmed: true });
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.includes('INSERT INTO certification_audit_events')));
});
test('audit failure rolls back renewal and failed rollback discards the client', async () => {
  for (const failRollback of [false, true]) {
    const f = fixture(base, { failAudit: true, failRollback }); await assert.rejects(f.service.renewEligibility(learner, input), /audit failure/);
    assert.ok(!f.calls.some(c => c.sql === 'COMMIT')); assert.deepEqual(f.releases, [failRollback]);
  }
});
test('agreement content tampering prevents renewal writes', async () => {
  const f = fixture(base, { changedAgreement: true }); await assert.rejects(f.service.renewEligibility(learner, input), /content/);
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE'))); assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});
