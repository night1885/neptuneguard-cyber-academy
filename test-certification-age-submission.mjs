import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';

const learner = '1223123544301633568';
const content = 'Age-gate fixture only.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-age', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
const input = { typedName: 'Fixture Learner', confirmedRead: true, agreementVersion: 'fixture-age', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
function fixture(settings = config) {
  let connections = 0; const calls = [];
  const pool = { async connect() { connections++; return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
      if (sql.includes('FOR UPDATE')) return { rows: [{ status: 'awaiting_acknowledgment' }] };
      return { rows: [] };
    }, release() {}
  }; } };
  return { service: createAgeCheckedCertificationSubmission(pool, settings), calls, get connections() { return connections; } };
}
test('missing, malformed, and below-16 age is rejected before database checkout', async () => {
  for (const reportedAge of [undefined, null, false, 15, '15', 'sixteen', 16.5]) {
    const f = fixture();
    await assert.rejects(f.service.submitEnrollment(learner, { ...input, reportedAge }));
    assert.equal(f.connections, 0); assert.equal(f.calls.length, 0);
  }
});
test('ages 16 and 17 reach the real submission service and create pending requests only', async () => {
  for (const reportedAge of [16, 17, '16']) {
    const f = fixture();
    assert.deepEqual(await f.service.submitEnrollment(learner, { ...input, reportedAge }), { status: 'pending', alreadySubmitted: false });
    assert.equal(f.connections, 1); assert.equal(f.calls.at(-1).sql, 'COMMIT');
    const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
    assert.equal(update.params[0], learner);
    assert.ok(!update.sql.includes('student_id=') && !update.sql.includes('approved_by='));
    const audit = JSON.parse(f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events')).params[1]);
    assert.equal(Object.hasOwn(audit, 'reportedAge'), false);
  }
});
test('eligible age cannot bypass disabled submission, identity, reading, or comprehension checks', async () => {
  const disabled = fixture({ ...config, enrollmentSubmissionEnabled: false });
  await assert.rejects(disabled.service.submitEnrollment(learner, { ...input, reportedAge: 16 }), /disabled/);
  assert.equal(disabled.connections, 0);
  for (const changes of [{ confirmedRead: false }, { answers: ['wrong'] }, { agreementVersion: 'other' }]) {
    const f = fixture();
    await assert.rejects(f.service.submitEnrollment(learner, { ...input, reportedAge: 16, ...changes }));
    assert.equal(f.connections, 0);
  }
  const f = fixture();
  await assert.rejects(f.service.submitEnrollment('invalid', { ...input, reportedAge: 16 }));
  assert.equal(f.connections, 0);
});
test('invalid submission containers fail without database work', async () => {
  for (const value of [undefined, null, [], '16']) {
    const f = fixture(); await assert.rejects(f.service.submitEnrollment(learner, value)); assert.equal(f.connections, 0);
  }
});
