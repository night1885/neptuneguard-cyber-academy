import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticWorkspace } from './workspace.mjs';
import { createSyntheticReviewStore } from './review.mjs';

const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const other = { ...learner, actorId: 'demo-learner-b' };
const submit = (id, revision = 0, requestId = 'demo-submit-a', evidenceRef = 'demo-evidence-a') => ({ recordId: id, expectedRevision: revision, requestId, evidenceRef });
const decision = (id, revision, value, requestId = 'demo-review-a') => ({ recordId: id, expectedRevision: revision, requestId, decision: value, feedbackRef: 'demo-feedback-a' });
const body = result => JSON.parse(result.payload.embeds[0].description);

async function setup() {
  const assigned = new Set([learner.actorId, reviewer.actorId, other.actorId]);
  const current = q => assigned.has(q.actorId) && q.workspaceId === learner.workspaceId && q.courseKey === learner.courseKey;
  const authorize = async q => current(q) && (q.action === 'review' ? q.actorId === reviewer.actorId :
    q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId));
  const store = createSyntheticReviewStore({ authorize });
  const created = await store.create(learner); assert.equal(created.ok, true);
  const id = created.record.id;
  function viewer(ctx, { afterLoad, selectedStore = store } = {}) {
    const context = { ...ctx, messageId: 'demo-message-' + ctx.actorId };
    const app = createSyntheticWorkspace({ authorize: async q => current(q), async loadPage() {
      const result = await selectedStore.read(ctx, id);
      if (!result.ok) throw new Error('Demo record unavailable');
      if (afterLoad) await afterLoad();
      const { status, revision, evidenceRef, feedbackRef } = result.record;
      return { title: 'DEMO review status', body: JSON.stringify({ status, revision, evidenceRef, feedbackRef }) };
    } });
    return { app, context, open: () => app.open(context),
      refresh: (opened, extra = {}) => app.navigate({ ...context, token: opened.sessionToken, cursor: 'lesson', ...extra }) };
  }
  return { store, id, assigned, authorize, viewer };
}

test('composed synthetic submission feedback resubmission and final review', async () => {
  const f = await setup(), v = f.viewer(learner), opened = await v.open();
  assert.equal(body(opened).status, 'working');
  assert.equal((await f.store.submit(learner, submit(f.id))).ok, true);
  assert.equal(body(await v.refresh(opened)).status, 'submitted');
  const rv = f.viewer(reviewer); assert.equal((await rv.open()).ok, true);
  assert.equal((await f.store.review(reviewer, decision(f.id, 1, 'changes-requested'))).ok, true);
  assert.equal(body(await v.refresh(opened)).feedbackRef, 'demo-feedback-a');
  assert.equal((await f.store.submit(learner, submit(f.id, 2, 'demo-submit-b', 'demo-evidence-b'))).ok, true);
  const final = await f.store.review(reviewer, decision(f.id, 3, 'review-recorded', 'demo-review-b'));
  const refreshed = await v.refresh(opened);
  assert.equal(body(refreshed).status, 'review-recorded'); assert.equal(body(refreshed).revision, 4);
  assert.equal(opened.messageId, refreshed.messageId);
  assert.deepEqual([final.grantsAccess, final.awardsIssued, final.persisted, refreshed.progressSaved], [false, false, false, false]);
});

test('assigned second learner still cannot render another learners record', async () => {
  const f = await setup(); await f.store.submit(learner, submit(f.id));
  const result = await f.viewer(other).open();
  assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('demo-evidence-a'), false);
});

test('reviewer assignment revocation blocks the next rendered view', async () => {
  const f = await setup(), v = f.viewer(reviewer), opened = await v.open();
  assert.equal(opened.ok, true); f.assigned.delete(reviewer.actorId);
  assert.equal((await v.refresh(opened)).ok, false);
});

test('stale review does not change the rendered submitted revision', async () => {
  const f = await setup(), v = f.viewer(learner), opened = await v.open();
  await f.store.submit(learner, submit(f.id));
  assert.equal((await f.store.review(reviewer, decision(f.id, 0, 'review-recorded'))).reason, 'conflict');
  const rendered = body(await v.refresh(opened));
  assert.equal(rendered.status, 'submitted'); assert.equal(rendered.revision, 1);
});

test('duplicate submit is reflected only once in the composed view', async () => {
  const f = await setup(), v = f.viewer(learner), opened = await v.open(), command = submit(f.id);
  assert.deepEqual(await f.store.submit(learner, command), await f.store.submit(learner, command));
  assert.equal(body(await v.refresh(opened)).revision, 1);
});

test('revocation after store read prevents the workspace releasing its page', async () => {
  const f = await setup(); await f.store.submit(learner, submit(f.id));
  const v = f.viewer(learner, { afterLoad: () => f.assigned.delete(learner.actorId) });
  const result = await v.open();
  assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('demo-evidence-a'), false);
});

test('message retargeting is denied without changing review state', async () => {
  const f = await setup(), v = f.viewer(learner), opened = await v.open();
  assert.equal((await v.refresh(opened, { messageId: 'demo-message-other' })).ok, false);
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});

test('disposal or a fresh empty store does not imply durable recovery', async () => {
  const f = await setup(), v = f.viewer(learner), opened = await v.open();
  f.store.dispose(); assert.equal((await v.refresh(opened)).ok, false);
  const fresh = createSyntheticReviewStore({ authorize: f.authorize });
  assert.equal((await f.viewer(learner, { selectedStore: fresh }).open()).ok, false);
  v.app.dispose(); assert.equal((await v.open()).ok, false);
});
