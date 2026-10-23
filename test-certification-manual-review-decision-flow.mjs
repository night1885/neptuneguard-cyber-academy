import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { createManualReviewDecisionGuard } from './certification-manual-review-decision-guard.mjs';
import { createManualReviewDecisionFlow } from './certification-manual-review-decision-flow.mjs';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333', channelId = '444444444444444444';
const context = { actorId: owner, actualGuildId: guildId, actualChannelId: channelId };
function fixture({ ttlMs = 300000, capacity = 100 } = {}) {
  const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner, adminChannelId: channelId,
    activeAgreementVersion: 'agreement-v1', activeAgreementSha256: 'a'.repeat(64),
    comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['Synthetic guide'] } };
  const at = new Date(1000);
  const state = { now: 1000, record: { discord_user_id: student, student_id: null, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: config.activeAgreementVersion, agreement_content_sha256: config.activeAgreementSha256,
    acknowledged_at: at, learner_confirmed_read_at: at, comprehension_check_version: 'check-v1', comprehension_submitted_at: at, comprehension_passed_at: null,
    comprehension_review_snapshot: createManualReviewSnapshot(config, ['Synthetic response']), age_eligible: true, age_declared_at: at,
    age_declaration_version: 'adult-18-v1', approved_by: null, approved_at: null, updated_at: at } };
  const calls = { read: 0, prepare: [], confirm: [] }, now = () => state.now;
  const guard = createManualReviewDecisionGuard(config, { guildId, now, ttlMs, capacity });
  // Synthetic executor for orchestration tests only; real PostgreSQL execution has separate acceptance tests.
  const service = {
    prepare(input) { calls.prepare.push(input); return guard.issue(input); },
    cancel: input => guard.cancel(input),
    async confirm(input) {
      calls.confirm.push(input);
      const decision = guard.consume({ ...input, record: state.record });
      return { status: decision.action === 'approve' ? 'approved' : 'denied', studentId: decision.action === 'approve' ? 'fixture-permanent-id' : null };
    }
  };
  const flow = createManualReviewDecisionFlow(config, { guildId, now, ttlMs, capacity, service,
    loadRecord: async learner => { calls.read++; assert.equal(learner, student); return state.record; } });
  return { flow, state, calls, service, guard };
}
const tokenFrom = payload => payload.components[0].components[0].custom_id.split(':').at(-1);
async function prepared(f, action = 'approve', reason = '  Owner reviewed fixture  ') {
  const reviewToken = tokenFrom(await f.flow.open(context, student));
  f.flow.choose(context, { reviewToken, action });
  return tokenFrom(f.flow.submit(context, { reviewToken, action, reason, reviewAck: 'REVIEWED' }));
}
for (const action of ['approve', 'deny']) test(`${action} uses the captured record and same displayed reason; duplicate confirmation cannot execute`, async () => {
  const f = fixture(), token = await prepared(f, action);
  assert.equal(f.calls.prepare.length, 1);
  assert.equal(f.calls.prepare[0].reason, 'Owner reviewed fixture');
  assert.equal(f.calls.prepare[0].reviewedResponses, true);
  assert.notEqual(f.calls.prepare[0].record, f.state.record);
  const first = f.flow.confirm(context, token);
  await assert.rejects(f.flow.confirm(context, token));
  assert.equal((await first).status, action === 'approve' ? 'approved' : 'denied');
  assert.equal(f.calls.confirm.length, 1);
  assert.equal(f.calls.confirm[0].studentDiscordId, student);
});
test('review acknowledgment and chosen action are required before preparation', async () => {
  const f = fixture(), reviewToken = tokenFrom(await f.flow.open(context, student));
  f.flow.choose(context, { reviewToken, action: 'approve' });
  assert.throws(() => f.flow.submit(context, { reviewToken, action: 'approve', reason: 'Reviewed', reviewAck: 'yes' }));
  assert.throws(() => f.flow.submit(context, { reviewToken, action: 'deny', reason: 'Reviewed', reviewAck: 'REVIEWED' }));
  assert.equal(f.calls.prepare.length, 0);
  const payload = f.flow.submit(context, { reviewToken, action: 'approve', reason: '  Exact reason  ', reviewAck: 'REVIEWED' });
  assert.equal(payload.embeds[0].fields[0].value, f.calls.prepare[0].reason);
  assert.equal(payload.embeds[0].fields[0].value, 'Exact reason');
  assert.throws(() => f.flow.submit(context, { reviewToken, action: 'approve', reason: 'Another reason', reviewAck: 'REVIEWED' }));
});
test('owner, guild, and admin channel are checked before reads or confirmation', async () => {
  const f = fixture();
  const wrongContexts = [{ ...context, actorId: student }, { ...context, actualGuildId: '555555555555555555' },
    { ...context, actualChannelId: '555555555555555555' }];
  for (const wrong of wrongContexts) await assert.rejects(f.flow.open(wrong, student));
  assert.equal(f.calls.read, 0);
  const token = await prepared(f);
  for (const wrong of wrongContexts) await assert.rejects(f.flow.confirm(wrong, token));
  assert.equal(f.calls.confirm.length, 0);
  assert.equal((await f.flow.confirm(context, token)).status, 'approved');
});
test('cancellation invalidates both UI session and guard confirmation', async () => {
  const f = fixture(), token = await prepared(f);
  assert.equal(f.flow.cancel(context, token), true);
  assert.equal(f.flow.cancel(context, token), false);
  await assert.rejects(f.flow.confirm(context, token));
  assert.throws(() => f.guard.consume({ ...context, token, record: f.state.record }));
  assert.equal(f.calls.confirm.length, 0);
});
test('expiration and backward clocks invalidate pending confirmations', async () => {
  for (const next of [1050, 999]) {
    const f = fixture({ ttlMs: 50 }), token = await prepared(f);
    f.state.now = next;
    await assert.rejects(f.flow.confirm(context, token));
    assert.equal(f.calls.confirm.length, 0);
  }
});
test('changed application is not silently substituted for the record presented', async () => {
  const f = fixture(), reviewToken = tokenFrom(await f.flow.open(context, student));
  f.state.record.updated_at = new Date(1001);
  f.flow.choose(context, { reviewToken, action: 'deny' });
  const token = tokenFrom(f.flow.submit(context, { reviewToken, action: 'deny', reason: 'Reviewed', reviewAck: 'REVIEWED' }));
  assert.equal(f.calls.prepare[0].record.updated_at.getTime(), 1000);
  await assert.rejects(f.flow.confirm(context, token), /Application changed/);
  await assert.rejects(f.flow.confirm(context, token));
  assert.equal(f.calls.confirm.length, 1);
});
test('uncertain outcomes retain the service error and are never retried automatically', async () => {
  const f = fixture(), token = await prepared(f);
  const uncertain = Object.assign(new Error('Synthetic uncertain outcome'), { code: 'MANUAL_REVIEW_DECISION_OUTCOME_UNCONFIRMED' });
  let attempts = 0;
  f.service.confirm = async () => { attempts++; throw uncertain; };
  await assert.rejects(f.flow.confirm(context, token), error => error === uncertain);
  await assert.rejects(f.flow.confirm(context, token));
  assert.equal(attempts, 1);
});
test('session capacity is bounded and cancellation releases a slot', async () => {
  const f = fixture({ capacity: 1 }), reviewToken = tokenFrom(await f.flow.open(context, student));
  await assert.rejects(f.flow.open(context, student), /Too many/);
  assert.equal(f.calls.read, 1);
  f.flow.cancel(context, reviewToken);
  await f.flow.open(context, student);
  assert.equal(f.calls.read, 2);
});
test('closing invalidates pending sessions and rejects new work', async () => {
  const f = fixture(), token = await prepared(f);
  f.flow.close();
  await assert.rejects(f.flow.confirm(context, token));
  await assert.rejects(f.flow.open(context, student));
  assert.throws(() => f.guard.consume({ ...context, token, record: f.state.record }));
  assert.equal(f.calls.confirm.length, 0);
});
