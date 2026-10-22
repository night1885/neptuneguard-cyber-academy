import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCertificationSubmission } from './certification-submission.js';
import { submissionFailureReference } from './certification-submission-diagnostics.mjs';

const student = '111111111111111111';
const content = 'Synthetic test agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true,
  ownerId: '222222222222222222', activeAgreementVersion: 'synthetic-v1',
  activeAgreementSha256: hash,
  comprehensionCheck: { version: 'synthetic-check', correctAnswers: ['PRIVATE_ANSWER'] } };
const submission = { ageEligibility: 'yes', acknowledgmentAccepted: true,
  confirmedRead: true, agreementVersion: config.activeAgreementVersion,
  agreementSha256: hash, comprehensionCheckVersion: 'synthetic-check', answers: ['PRIVATE_ANSWER'] };
const invite = () => ({ async hasPendingInvitation() { return true; } });
function fixture(failAt, rollbackFails = false) {
  const calls = [], released = [];
  const failure = Object.assign(new Error('PRIVATE_ERROR'), {
    code: '42501', detail: 'PRIVATE_DETAIL', query: 'PRIVATE_SQL'
  });
  const row = { discord_user_id: student, status: 'awaiting_acknowledgment' };
  const db = {
    async query(sql) {
      calls.push(sql);
      if (sql === 'ROLLBACK' && rollbackFails) throw new Error('rollback failed');
      if (failAt && sql.startsWith(failAt)) throw failure;
      if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
      if (sql.startsWith('SELECT 1 AS invited')) return { rows: [{ invited: 1 }] };
      if (sql.startsWith('SELECT *')) return { rows: [row] };
      return { rows: [] };
    },
    release(discard) { released.push(discard); }
  };
  return { calls, released, failure, row,
    pool: { async connect() { if (failAt === 'connect') throw failure; return db; } } };
}
async function capture(operation) {
  const records = [], original = console.error;
  console.error = record => records.push(record);
  try { return { value: await operation(), records }; }
  catch (error) { return { error, records }; }
  finally { console.error = original; }
}
for (const [sql, stage] of [
  ['connect', 'database_connect'], ['BEGIN', 'transaction_begin'],
  ['SELECT content', 'agreement_verification'], ['SELECT *', 'enrollment_lock'],
  ['UPDATE certification_enrollments', 'enrollment_update'],
  ['INSERT INTO certification_audit_events', 'audit_insert'], ['COMMIT', 'transaction_commit']
]) test(`failure at ${stage}: reference, privacy and cleanup`, async () => {
  const f = fixture(sql);
  const service = createCertificationSubmission(f.pool, config, { createInvitationReader: invite });
  const result = await capture(() => service.submitInvitedEnrollment(student, submission));
  assert.equal(result.error, f.failure);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].stage, stage);
  assert.equal(result.records[0].sqlState, '42501');
  assert.equal(result.records[0].correlationId, submissionFailureReference(result.error));
  assert.doesNotMatch(JSON.stringify(result.records), /PRIVATE|111111111111111111/);
  assert.deepEqual(f.released, sql === 'connect' ? [] : [false]);
  assert.equal(f.calls.includes('ROLLBACK'), sql !== 'connect');
});

test('failed rollback discards connection and preserves original error and stage', async () => {
  const f = fixture('UPDATE', true);
  const service = createCertificationSubmission(f.pool, config, { createInvitationReader: invite });
  const result = await capture(() => service.submitInvitedEnrollment(student, submission));
  assert.equal(result.error, f.failure);
  assert.equal(result.records[0].stage, 'enrollment_update');
  assert.deepEqual(f.released, [true]);
});

for (const [field, value, stage] of [
  ['ageEligibility', 'invalid', 'age_declaration'],
  ['acknowledgmentAccepted', false, 'acknowledgment_validation'],
  ['agreementVersion', 'other', 'version_validation'],
  ['answers', ['PRIVATE_WRONG'], 'comprehension_validation']
]) test(`validation stage ${stage} does not connect`, async () => {
  let connects = 0;
  const service = createCertificationSubmission({ connect() { connects++; throw new Error('unexpected'); } }, config);
  const result = await capture(() => service.submitEnrollment(student, { ...submission, [field]: value }));
  assert.ok(result.error);
  assert.equal(connects, 0);
  assert.equal(result.records[0].stage, stage);
  assert.doesNotMatch(JSON.stringify(result.records), /PRIVATE/);
});

test('success commits once, releases connection and emits no failure log', async () => {
  const f = fixture();
  const service = createCertificationSubmission(f.pool, config, { createInvitationReader: invite });
  const result = await capture(() => service.submitInvitedEnrollment(student, submission));
  assert.deepEqual(result.value, { status: 'pending', alreadySubmitted: false });
  assert.deepEqual(result.records, []);
  assert.equal(f.calls.filter(sql => sql === 'COMMIT').length, 1);
  assert.equal(f.calls.includes('ROLLBACK'), false);
  assert.deepEqual(f.released, [false]);
});

test('logging failure cannot change rollback or connection release', async () => {
  const f = fixture('UPDATE');
  const service = createCertificationSubmission(f.pool, config, { createInvitationReader: invite });
  const original = console.error;
  console.error = () => { throw new Error('logger failure'); };
  try { await assert.rejects(service.submitInvitedEnrollment(student, submission), error => error === f.failure); }
  finally { console.error = original; }
  assert.ok(f.calls.includes('ROLLBACK'));
  assert.deepEqual(f.released, [false]);
});

test('UI response reuses the service reference without a duplicate log', async () => {
  const { createCertificationSubmissionHandler } = await import('./certification-submission-interactions.js');
  const f = fixture('UPDATE');
  const uiConfig = { ...config, comprehensionCheck: {
    ...config.comprehensionCheck, questions: [{ prompt: 'Synthetic question?' }] } };
  const handle = createCertificationSubmissionHandler({ ...f.pool, async query() {
    return { rows: [{ content, content_sha256: hash }] };
  } }, uiConfig, '333333333333333333', { invitedOnly: true, createInvitationReader: invite });
  const replies = [];
  let modal;
  function interaction(customId, isModal = false) {
    return { customId, guildId: '333333333333333333', user: { id: student },
      deferred: false, replied: false,
      isButton: () => !isModal, isModalSubmit: () => isModal,
      async deferReply() { this.deferred = true; },
      async reply(payload) { this.replied = true; replies.push(payload); },
      async editReply(payload) { replies.push(payload); },
      async showModal(value) { modal = value.toJSON(); },
      fields: { getTextInputValue: key => ({ age: 'Yes', read: 'AGREE', answer0: 'PRIVATE_ANSWER' })[key] }
    };
  }
  await handle(interaction('cert:submit:start'));
  const controls = replies.at(-1).components[0].toJSON().components;
  await handle(interaction(controls[1].custom_id));
  assert.ok(modal);
  const result = await capture(() => handle(interaction(modal.custom_id, true)));
  assert.equal(result.value, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].stage, 'enrollment_update');
  assert.ok(replies.at(-1).content.includes(result.records[0].correlationId));
  assert.doesNotMatch(replies.at(-1).content, /42501|PRIVATE|enrollment_update/);
});


test('invitation rejection rolls back without updating enrollment', async () => {
  const f = fixture();
  const service = createCertificationSubmission(f.pool, config, {
    createInvitationReader: () => ({ async hasPendingInvitation() { return false; } })
  });
  const result = await capture(() => service.submitInvitedEnrollment(student, submission));
  assert.equal(result.records[0].stage, 'invitation_check');
  assert.ok(f.calls.includes('ROLLBACK'));
  assert.equal(f.calls.some(sql => sql.startsWith('UPDATE')), false);
  assert.deepEqual(f.released, [false]);
});

test('missing configuration and invalid payload are attributed before connecting', async () => {
  const f = fixture('connect');
  const service = createCertificationSubmission(f.pool, { ...config, activeAgreementVersion: '' });
  const missing = await capture(() => service.submitEnrollment(student, submission));
  assert.equal(missing.records[0].stage, 'configuration');
  const valid = createCertificationSubmission(f.pool, config);
  const invalid = await capture(() => valid.submitEnrollment(student, { ...submission, extra: true }));
  assert.equal(invalid.records[0].stage, 'submission_validation');
  assert.deepEqual(f.calls, []);
});

test('pilot authorization still rejects forbidden general enrollment', async () => {
  const f = fixture();
  const policy = Object.freeze({ owner: id => id === config.ownerId,
    allowsStudent: id => id === student, assertTarget(id) { assert.equal(id, student); } });
  const service = createCertificationSubmission(f.pool, { ...config,
    enrollmentSubmissionEnabled: false, registrationPilotEnabled: true,
    registrationPilotPolicy: policy }, { createInvitationReader: invite });
  const result = await capture(() => service.submitEnrollment(student, submission));
  assert.ok(result.error);
  assert.equal(result.records[0].stage, 'authorization');
  assert.deepEqual(f.calls, []);
});

test('already-pending complete acknowledgment stays idempotent', async () => {
  const f = fixture();
  Object.assign(f.row, { status: 'pending', signature_method: 'discord_account',
    agreement_version: config.activeAgreementVersion, agreement_content_sha256: hash,
    comprehension_check_version: 'synthetic-check', acknowledged_at: new Date(),
    learner_confirmed_read_at: new Date(), comprehension_passed_at: new Date(),
    age_eligible: true, age_declared_at: new Date(), age_declaration_version: 'adult-18-v1' });
  const service = createCertificationSubmission(f.pool, config, { createInvitationReader: invite });
  const result = await capture(() => service.submitInvitedEnrollment(student, submission));
  assert.deepEqual(result.value, { status: 'pending', alreadySubmitted: true });
  assert.deepEqual(result.records, []);
  assert.equal(f.calls.some(sql => sql.startsWith('UPDATE')), false);
  assert.deepEqual(f.released, [false]);
});
