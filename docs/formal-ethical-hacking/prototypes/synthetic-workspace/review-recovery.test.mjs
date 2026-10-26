import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticReviewStore } from './review.mjs';

const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const policy = q => q.action === 'review' ? q.actorId === reviewer.actorId : q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId);
const submission = id => ({ recordId: id, expectedRevision: 0, requestId: 'demo-request-recovery', evidenceRef: 'demo-evidence-recovery' });
const review = id => ({ recordId: id, expectedRevision: 1, requestId: 'demo-review-recovery', decision: 'review-recorded', feedbackRef: 'demo-feedback-recovery' });

test('lost response after successful submit can replay without another revision', async t => {
  const store = createSyntheticReviewStore({ authorize: async q => policy(q) });
  t.after(() => store.dispose());
  const id = (await store.create(learner)).record.id, command = submission(id);
  const loseResponse = async () => {
    const result = await store.submit(learner, command);
    assert.equal(result.ok, true);
    throw new Error('simulated response loss after successful mutation');
  };
  await assert.rejects(loseResponse, /simulated response loss/);
  const retry = await store.submit(learner, command);
  assert.equal(retry.ok, true);
  assert.equal(retry.record.revision, 1);
  const current = await store.read(learner, id);
  assert.equal(current.record.revision, 1);
  assert.equal(current.record.evidenceRef, command.evidenceRef);
});

test('replayed submission receipt is historical while authorized read gives current review state', async t => {
  const store = createSyntheticReviewStore({ authorize: async q => policy(q) });
  t.after(() => store.dispose());
  const id = (await store.create(learner)).record.id, command = submission(id);
  const submitted = await store.submit(learner, command);
  const reviewed = await store.review(reviewer, review(id));
  assert.equal(reviewed.ok, true);
  const receipt = await store.submit(learner, command);
  assert.deepEqual(receipt, submitted);
  assert.equal(receipt.record.status, 'submitted');
  const current = await store.read(learner, id);
  assert.equal(current.record.status, 'review-recorded');
  assert.equal(current.record.revision, 2);
  assert.equal(current.record.feedbackRef, 'demo-feedback-recovery');
});

test('revocation denies replay of a previously successful submission receipt', async t => {
  let revoked = false;
  const store = createSyntheticReviewStore({ authorize: async q => !revoked && policy(q) });
  t.after(() => store.dispose());
  const id = (await store.create(learner)).record.id, command = submission(id);
  assert.equal((await store.submit(learner, command)).ok, true);
  revoked = true;
  assert.deepEqual(await store.submit(learner, command), { ok: false, reason: 'unavailable' });
  assert.deepEqual(await store.read(learner, id), { ok: false, reason: 'unavailable' });
  revoked = false;
  assert.equal((await store.read(learner, id)).record.revision, 1);
});

test('identical concurrent review retries produce one review revision', async t => {
  const store = createSyntheticReviewStore({ authorize: async q => policy(q) });
  t.after(() => store.dispose());
  const id = (await store.create(learner)).record.id;
  await store.submit(learner, submission(id));
  const command = review(id);
  const [first, again] = await Promise.all([store.review(reviewer, command), store.review(reviewer, command)]);
  assert.equal(first.ok, true);
  assert.deepEqual(first, again);
  assert.equal((await store.read(learner, id)).record.revision, 2);
  assert.deepEqual([first.persisted, first.evidenceCollected, first.grantsAccess, first.awardsIssued], [false, false, false, false]);
});
