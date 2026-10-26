import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticReviewStore } from './review.mjs';
const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const policy = q => q.action === 'review' ? q.actorId === reviewer.actorId : q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId);
const make = authorize => createSyntheticReviewStore({ authorize: authorize || (async q => policy(q)) });
const submit = (id, revision = 0, request = 'demo-request-a', evidence = 'demo-evidence-a') => ({ recordId: id, expectedRevision: revision, requestId: request, evidenceRef: evidence });
const review = (id, revision = 1, decision = 'review-recorded') => ({ recordId: id, expectedRevision: revision, requestId: 'demo-review-a', decision, feedbackRef: 'demo-feedback-a' });
const draft = async store => (await store.create(learner)).record.id;

test('create submit and authorized review preserve independent grants', async () => {
  const store = make(), id = await draft(store);
  assert.equal((await store.submit(learner, submit(id))).record.revision, 1);
  const result = await store.review(reviewer, review(id));
  assert.equal(result.record.status, 'review-recorded'); assert.equal(result.record.revision, 2);
  assert.deepEqual([result.persisted, result.evidenceCollected, result.grantsAccess, result.awardsIssued], [false, false, false, false]);
});

test('changes requested can be resubmitted as a new revision', async () => {
  const store = make(), id = await draft(store);
  await store.submit(learner, submit(id));
  await store.review(reviewer, review(id, 1, 'changes-requested'));
  const result = await store.submit(learner, submit(id, 2, 'demo-request-b', 'demo-evidence-b'));
  assert.equal(result.record.status, 'submitted'); assert.equal(result.record.revision, 3);
  assert.equal(result.record.evidenceRef, 'demo-evidence-b'); assert.equal(result.record.feedbackRef, null);
});

test('cross-owner submit and client role or owner fields are denied', async () => {
  const store = make(), id = await draft(store);
  assert.equal((await store.submit({ ...learner, actorId: 'demo-learner-b' }, submit(id))).ok, false);
  assert.equal((await store.submit({ ...learner, role: 'instructor' }, submit(id))).ok, false);
  assert.equal((await store.submit(learner, { ...submit(id), ownerId: 'demo-learner-b' })).ok, false);
});

test('wrong workspace course and private marker do not reveal a record', async () => {
  const store = make(), id = await draft(store);
  for (const extra of [{ workspaceId: 'demo-server-b' }, { courseKey: 'demo-other' }, { privateWorkspace: false }]) {
    assert.deepEqual(await store.read({ ...learner, ...extra }, id), { ok: false, reason: 'unavailable' });
  }
});

test('unassigned reviewer and self-review are denied', async () => {
  const store = make(), id = await draft(store); await store.submit(learner, submit(id));
  assert.equal((await store.review({ ...reviewer, actorId: 'demo-other-reviewer' }, review(id))).ok, false);
  assert.equal((await store.review(learner, review(id))).ok, false);
});

test('stale revision cannot change submitted evidence', async () => {
  const store = make(), id = await draft(store); await store.submit(learner, submit(id));
  assert.equal((await store.review(reviewer, review(id, 0))).reason, 'conflict');
  assert.equal((await store.read(learner, id)).record.revision, 1);
});

test('identical request replay returns the original result without another revision', async () => {
  const store = make(), id = await draft(store), command = submit(id);
  const first = await store.submit(learner, command), again = await store.submit(learner, command);
  assert.deepEqual(again, first); assert.equal((await store.read(learner, id)).record.revision, 1);
});

test('same request id with a different body is a conflict', async () => {
  const store = make(), id = await draft(store); await store.submit(learner, submit(id));
  assert.equal((await store.submit(learner, submit(id, 0, 'demo-request-a', 'demo-evidence-b'))).reason, 'conflict');
});

test('revocation before commit and authorizer errors leave state unchanged', async () => {
  let calls = 0, revoke = false;
  const store = make(async q => { if (q.action === 'submit') { calls++; if (revoke && calls === 2) return false; } return policy(q); });
  const id = await draft(store); revoke = true;
  assert.equal((await store.submit(learner, submit(id))).ok, false);
  assert.equal((await store.read(learner, id)).record.revision, 0);
  const failed = make(async () => { throw new Error('private backend detail'); });
  assert.deepEqual(await failed.create(learner), { ok: false, reason: 'unavailable' });
});

test('concurrent submissions serialize and exactly one stale contender succeeds', async () => {
  const store = make(), id = await draft(store);
  const results = await Promise.all([store.submit(learner, submit(id)), store.submit(learner, submit(id, 0, 'demo-request-b'))]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => result.reason === 'conflict').length, 1);
});

test('raw references are refused and response mutation cannot change the store', async () => {
  const store = make(), id = await draft(store);
  assert.equal((await store.submit(learner, submit(id, 0, 'demo-request-a', 'https://example.invalid/evidence'))).ok, false);
  assert.equal((await store.submit(learner, submit(id, 0, 'demo-request-a', { toString: () => 'demo-evidence-a' }))).ok, false);
  const response = await store.read(learner, id); response.record.ownerId = 'demo-forged';
  assert.equal((await store.read(learner, id)).record.ownerId, learner.actorId);
});

test('constructor capacity and disposal boundaries fail closed', async () => {
  assert.throws(() => createSyntheticReviewStore());
  const store = make();
  for (let i = 0; i < 20; i++) assert.equal((await store.create(learner)).ok, true);
  assert.equal((await store.create(learner)).ok, false);
  store.dispose(); assert.equal((await store.create(learner)).ok, false);
});
