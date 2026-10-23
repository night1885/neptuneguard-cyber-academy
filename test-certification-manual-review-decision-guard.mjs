import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualReviewDecisionGuard } from './certification-manual-review-decision-guard.mjs';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333';
const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner,
  activeAgreementVersion: 'agreement-v1', activeAgreementSha256: 'a'.repeat(64),
  comprehensionCheck: { version: 'questions-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['PRIVATE_GUIDE'] } };
const context = { actorId: owner, actualGuildId: guildId };
function record() {
  const at = new Date('2026-10-22T21:13:07.280Z');
  return { discord_user_id: student, student_id: null, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: config.activeAgreementVersion,
    agreement_content_sha256: config.activeAgreementSha256, acknowledged_at: at, learner_confirmed_read_at: at,
    comprehension_check_version: config.comprehensionCheck.version, comprehension_submitted_at: at,
    comprehension_passed_at: null, comprehension_review_snapshot: createManualReviewSnapshot(config, ['PRIVATE_WRONG']),
    age_eligible: true, age_declared_at: at, age_declaration_version: 'adult-18-v1', approved_by: null,
    approved_at: null, updated_at: at };
}
function fixture(options = {}) {
  let time = 1000;
  const guard = createManualReviewDecisionGuard(config, { guildId, now: () => time, ...options });
  const row = record();
  const issue = overrides => guard.issue({ ...context, record: row, action: 'approve', reason: 'Reviewed privately', reviewedResponses: true, ...overrides });
  const consume = (token, overrides) => guard.consume({ ...context, token, record: row, ...overrides });
  return { guard, row, issue, consume, setTime(value) { time = value; } };
}
for (const field of ['enabled', 'manualReviewEnabled', 'manualReviewDecisionsEnabled']) {
  test(`explicit enablement required: ${field}`, () => {
    for (const value of [undefined, false, 'true']) assert.throws(() => createManualReviewDecisionGuard({ ...config, [field]: value }, { guildId }));
  });
}
for (const action of ['approve', 'deny']) test(`single-use ${action} binds the reviewed record without changing it`, () => {
  const f = fixture(), before = structuredClone(f.row);
  const issued = f.issue({ action, reason: '  Reviewed privately  ' });
  const result = f.consume(issued.token);
  assert.equal(result.action, action);
  assert.equal(result.studentDiscordId, student);
  assert.equal(result.actorId, owner);
  assert.equal(result.guildId, guildId);
  assert.equal(result.reason, 'Reviewed privately');
  assert.match(result.reviewFingerprint, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify([issued, result]), /PRIVATE_WRONG|PRIVATE_GUIDE|Synthetic question/);
  assert.deepEqual(f.row, before);
  assert.equal(f.row.comprehension_passed_at, null);
  assert.throws(() => f.consume(issued.token));
});
test('explicit review and a bounded reason are mandatory', () => {
  const f = fixture();
  for (const overrides of [{ reviewedResponses: false }, { reviewedResponses: 'true' }, { reason: '' },
    { reason: ' ' }, { reason: 'x'.repeat(1001) }, { action: 'suspend' }]) assert.throws(() => f.issue(overrides));
});
test('another actor or server cannot issue, consume, or cancel a confirmation', () => {
  const f = fixture(), issued = f.issue();
  for (const overrides of [{ actorId: student }, { actualGuildId: '444444444444444444' }]) {
    assert.throws(() => f.issue(overrides));
    assert.throws(() => f.consume(issued.token, overrides));
    assert.throws(() => f.guard.cancel({ ...context, token: issued.token, ...overrides }));
  }
  assert.equal(f.consume(issued.token).action, 'approve');
});
for (const change of [
  row => { row.comprehension_review_snapshot.items[0].response = 'changed'; },
  row => { row.comprehension_review_snapshot.items[0].expectedAnswer = 'changed'; },
  row => { row.comprehension_review_snapshot.items[0].question = 'Changed question?'; },
  row => { row.updated_at = new Date('2026-10-22T21:13:08.280Z'); },
  row => { row.status = 'approved'; },
  row => { row.discord_user_id = '555555555555555555'; },
  row => { row.agreement_content_sha256 = 'b'.repeat(64); },
  row => { row.age_eligible = false; },
  row => { row.comprehension_passed_at = new Date(); }
]) test(`changed application consumes and rejects the old confirmation: ${change.toString()}`, () => {
  const f = fixture(), issued = f.issue();
  const changed = structuredClone(f.row);
  change(changed);
  assert.throws(() => f.consume(issued.token, { record: changed }));
  assert.throws(() => f.consume(issued.token));
});
for (const time of [301000, 301001, 999]) test(`expiry and backward-clock checks reject time ${time}`, () => {
  const f = fixture(), issued = f.issue();
  f.setTime(time);
  assert.throws(() => f.consume(issued.token));
});
test('confirmation remains usable immediately before expiry', () => {
  const f = fixture(), issued = f.issue();
  f.setTime(300999);
  assert.equal(f.consume(issued.token).action, 'approve');
});
test('cancel, unknown tokens, and process replacement fail closed', () => {
  const f = fixture(), issued = f.issue();
  assert.equal(f.guard.cancel({ ...context, token: issued.token }), true);
  assert.throws(() => f.consume(issued.token));
  assert.throws(() => f.consume('forged-token'));
  assert.throws(() => fixture().consume(f.issue().token));
});
test('bounded confirmation capacity recovers after expiry', () => {
  const f = fixture({ capacity: 1 });
  f.issue();
  assert.throws(() => f.issue());
  f.setTime(301000);
  assert.equal(f.consume(f.issue().token).action, 'approve');
});
test('constructor rejects unsafe scope and bounds', () => {
  for (const overrides of [{ ownerId: 'bad' }, { activeAgreementVersion: undefined }, { activeAgreementSha256: 'bad' },
    { comprehensionCheck: { version: undefined } }]) assert.throws(() => createManualReviewDecisionGuard({ ...config, ...overrides }, { guildId }));
  for (const options of [{ guildId: 'bad' }, { ttlMs: 0 }, { ttlMs: 300001 }, { capacity: 0 }, { capacity: 101 }]) {
    assert.throws(() => createManualReviewDecisionGuard(config, { guildId, ...options }));
  }
});
test('incomplete or already-decided records cannot receive a confirmation', () => {
  for (const overrides of [{ status: 'denied' }, { approved_by: owner }, { approved_at: new Date() },
    { updated_at: null }, { student_id: '' }, { comprehension_review_snapshot: null }, { comprehension_submitted_at: null }]) {
    const f = fixture();
    assert.throws(() => f.issue({ record: { ...f.row, ...overrides } }));
  }
});
