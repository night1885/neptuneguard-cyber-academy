import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createManualReviewSnapshot, hasManualReviewAcknowledgment, ownerManualReviewEmbed } from './certification-manual-review-data.mjs';
import { createManualReviewSubmission } from './certification-manual-review-submission.mjs';
import { buildManualReviewModal, buildManualQuestionEmbed } from './certification-manual-review-presentation.mjs';
const student = '111111111111111111', owner = '222222222222222222', guild = '333333333333333333';
const content = 'Synthetic agreement';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, manualReviewEnabled: true, enrollmentSubmissionEnabled: true,
  ownerId: owner, activeAgreementVersion: 'agreement-v1', activeAgreementSha256: hash,
  comprehensionCheck: { version: 'questions-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['PRIVATE_GUIDE'] } };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true,
  agreementVersion: 'agreement-v1', agreementSha256: hash, comprehensionCheckVersion: 'questions-v1', answers: ['PRIVATE_WRONG'] };
function fixture({ fail = '', rollbackFails = false, invited = true, row: suppliedRow } = {}) {
  const queries = [], releases = [], diagnostics = [];
  let connects = 0;
  const row = suppliedRow || { status: 'awaiting_acknowledgment', discord_user_id: student };
  const failure = Object.assign(new Error('PRIVATE_ERROR'), { code: '23514' });
  const db = { async query(sql, parameters) {
    queries.push({ sql, parameters });
    if (sql === 'ROLLBACK' && rollbackFails) throw new Error('PRIVATE_ROLLBACK');
    if (fail && sql.startsWith(fail)) throw failure;
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.startsWith('SELECT *')) return { rows: [row] };
    return { rows: [] };
  }, release(discard) { releases.push(discard); } };
  const pool = { async connect() { connects++; return db; } };
  const options = { createInvitationReader: () => ({ async hasPendingInvitation() { return invited; } }),
    createDiagnostic: () => { let stage; return { setStage(value) { stage = value; }, report() { diagnostics.push({ stage }); } }; } };
  return { queries, releases, diagnostics, pool, options, failure, get connects() { return connects; } };
}
for (const answer of ['PRIVATE_GUIDE', 'PRIVATE_WRONG']) test(`any nonempty answer is stored for review: ${answer}`, async () => {
  const f = fixture();
  const service = createManualReviewSubmission(f.pool, config, f.options);
  assert.deepEqual(await service.submitInvitedEnrollment(student, { ...input, answers: [answer] }), { status: 'pending', alreadySubmitted: false });
  const update = f.queries.find(q => q.sql.startsWith('UPDATE'));
  assert.match(update.sql, /comprehension_passed_at=NULL/);
  assert.match(update.sql, /comprehension_submitted_at=NOW/);
  const snapshot = JSON.parse(update.parameters[5]);
  assert.equal(snapshot.items[0].response, answer);
  assert.equal(snapshot.items[0].expectedAnswer, 'PRIVATE_GUIDE');
  const audit = f.queries.find(q => q.sql.startsWith('INSERT INTO certification_audit_events'));
  assert.doesNotMatch(audit.parameters[1], /PRIVATE/);
  assert.deepEqual(f.diagnostics, []);
  assert.deepEqual(f.releases, [false]);
});
for (const overrides of [{ answers: [] }, { answers: [' '] }, { ageEligibility: 'no' },
  { acknowledgmentAccepted: false }, { confirmedRead: false }, { agreementVersion: 'other' }]) {
  test(`required declarations and answer structure remain enforced: ${Object.keys(overrides)[0]}`, async () => {
    const f = fixture();
    const service = createManualReviewSubmission(f.pool, config, f.options);
    await assert.rejects(service.submitInvitedEnrollment(student, { ...input, ...overrides }));
    assert.equal(f.connects, 0);
  });
}
for (const rollbackFails of [false, true]) test(`audit failure rolls back; discard=${rollbackFails}`, async () => {
  const f = fixture({ fail: 'INSERT INTO certification_audit_events', rollbackFails });
  const service = createManualReviewSubmission(f.pool, config, f.options);
  await assert.rejects(service.submitInvitedEnrollment(student, input), error => error === f.failure);
  assert.ok(f.queries.some(q => q.sql === 'ROLLBACK'));
  assert.equal(f.queries.some(q => q.sql === 'COMMIT'), false);
  assert.deepEqual(f.releases, [rollbackFails]);
  assert.deepEqual(f.diagnostics, [{ stage: 'audit_insert' }]);
});
test('missing invitation prevents enrollment update', async () => {
  const f = fixture({ invited: false });
  const service = createManualReviewSubmission(f.pool, config, f.options);
  await assert.rejects(service.submitInvitedEnrollment(student, input), /invitation/);
  assert.equal(f.queries.some(q => q.sql.startsWith('UPDATE')), false);
  assert.ok(f.queries.some(q => q.sql === 'ROLLBACK'));
});
test('valid already-pending manual request is not overwritten', async () => {
  const row = { discord_user_id: student, status: 'pending', signature_method: 'discord_account',
    acknowledged_at: new Date(), learner_confirmed_read_at: new Date(), age_eligible: true,
    age_declared_at: new Date(), age_declaration_version: 'adult-18-v1', agreement_version: 'agreement-v1',
    agreement_content_sha256: hash, comprehension_submitted_at: new Date(), comprehension_passed_at: null,
    comprehension_check_version: 'questions-v1', comprehension_review_snapshot: createManualReviewSnapshot(config, ['original response']) };
  assert.equal(hasManualReviewAcknowledgment(row), true);
  const f = fixture({ row });
  const service = createManualReviewSubmission(f.pool, config, f.options);
  assert.deepEqual(await service.submitInvitedEnrollment(student, input), { status: 'pending', alreadySubmitted: true });
  assert.equal(f.queries.some(q => q.sql.startsWith('UPDATE')), false);
});
test('manual record cannot claim a pass and still satisfy the submitted-record predicate', () => {
  const record = { comprehension_submitted_at: new Date(), comprehension_passed_at: new Date(),
    comprehension_check_version: 'questions-v1', comprehension_review_snapshot: createManualReviewSnapshot(config, ['response']) };
  assert.equal(hasManualReviewAcknowledgment(record), false);
});
test('owner view includes response and guide, but unauthorized actors receive neither', () => {
  const snapshot = createManualReviewSnapshot(config, input.answers);
  const embed = ownerManualReviewEmbed(snapshot, config, owner, guild, guild);
  assert.equal(embed.fields[1].value, 'PRIVATE' + String.fromCharCode(92) + '_WRONG');
  assert.equal(embed.fields[2].value, 'PRIVATE' + String.fromCharCode(92) + '_GUIDE');
  assert.throws(() => ownerManualReviewEmbed(snapshot, config, student, guild, guild), /Owner authorization/);
  assert.throws(() => ownerManualReviewEmbed(snapshot, config, owner, '444444444444444444', guild), /Owner authorization/);
});
test('long questions are present in full in the form, never replaced with answer-as-instructed', () => {
  const question = 'Q'.repeat(300);
  const settings = { ...config, comprehensionCheck: { ...config.comprehensionCheck,
    questions: [{ prompt: question }], correctAnswers: ['PRIVATE_GUIDE'] } };
  const modal = buildManualReviewModal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', settings);
  assert.equal(modal.components[2].description, question);
  assert.equal(modal.components[2].component.custom_id, 'answer0');
  assert.doesNotMatch(JSON.stringify(modal), /PRIVATE_GUIDE|as instructed/);
  assert.equal(buildManualQuestionEmbed(settings).fields[0].value, question);
});
test('three questions plus declarations fit within five form components', () => {
  const settings = { ...config, comprehensionCheck: { questions: [1, 2, 3].map(n => ({ prompt: `Question ${n}?` })) } };
  assert.equal(buildManualReviewModal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', settings).components.length, 5);
});
test('pending record missing required declarations is not treated as submitted', async () => {
  const f = fixture({ row: { status: 'pending', discord_user_id: student } });
  const service = createManualReviewSubmission(f.pool, config, f.options);
  await assert.rejects(service.submitInvitedEnrollment(student, input), /owner review/);
  assert.equal(f.queries.some(q => q.sql.startsWith('UPDATE')), false);
});
