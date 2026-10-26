import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticReviewStore } from './review.mjs';
import { createSyntheticControls } from './controls.mjs';
const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const ctx = who => ({ ...who, messageId: 'demo-message-' + who.actorId });
const buttons = result => result.components.flatMap(row => row.components);
const click = (controls, who, button, extra = {}) => controls.press({ ...ctx(who), customId: button.custom_id, ...extra });
async function setup(options = {}) {
  let reviewAllowed = true;
  const policy = q => q.action === 'review' ? reviewAllowed && q.actorId === reviewer.actorId :
    q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId);
  const store = createSyntheticReviewStore({ authorize: async q => policy(q) });
  const id = (await store.create(learner)).record.id;
  const controls = createSyntheticControls({ store, authorize: async q => policy(q), ...options });
  return { store, id, controls, revoke: () => { reviewAllowed = false; } };
}

test('opaque button clicks complete a synthetic submit review resubmit journey', async () => {
  const f = await setup();
  let panel = await f.controls.build(ctx(learner), f.id);
  assert.ok(buttons(panel).every(b => b.type === 2 && b.custom_id.length <= 100 && !b.custom_id.includes(f.id)));
  assert.equal((await click(f.controls, learner, buttons(panel)[0])).record.revision, 1);
  panel = await f.controls.build(ctx(reviewer), f.id);
  assert.equal((await click(f.controls, reviewer, buttons(panel)[0])).record.status, 'changes-requested');
  panel = await f.controls.build(ctx(learner), f.id);
  assert.equal((await click(f.controls, learner, buttons(panel)[0])).record.revision, 3);
  panel = await f.controls.build(ctx(reviewer), f.id);
  const final = await click(f.controls, reviewer, buttons(panel)[1]);
  assert.equal(final.record.status, 'review-recorded'); assert.equal(final.record.revision, 4);
  assert.deepEqual([final.persisted, final.evidenceCollected, final.grantsAccess, final.awardsIssued], [false, false, false, false]);
});

test('another actor cannot spend an owners button or invalidate its normal use', async () => {
  const f = await setup(), b = buttons(await f.controls.build(ctx(learner), f.id))[0];
  assert.equal((await click(f.controls, reviewer, b)).ok, false);
  assert.equal((await click(f.controls, learner, b)).ok, true);
});

test('workspace course message and private-marker changes are denied', async () => {
  const f = await setup(), b = buttons(await f.controls.build(ctx(learner), f.id))[0];
  for (const extra of [{ workspaceId: 'demo-other' }, { courseKey: 'demo-other' }, { messageId: 'demo-other' }, { privateWorkspace: false }])
    assert.equal((await click(f.controls, learner, b, extra)).ok, false);
});

test('client command revision record and decision overrides are refused', async () => {
  const f = await setup(), b = buttons(await f.controls.build(ctx(learner), f.id))[0];
  for (const extra of [{ expectedRevision: 99 }, { recordId: f.id }, { decision: 'review-recorded' }, { evidenceRef: 'demo-evidence-b' }])
    assert.equal((await click(f.controls, learner, b, extra)).ok, false);
});

test('a second independently issued old-revision control conflicts', async () => {
  const f = await setup(), first = buttons(await f.controls.build(ctx(learner), f.id))[0], second = buttons(await f.controls.build(ctx(learner), f.id))[0];
  assert.equal((await click(f.controls, learner, first)).ok, true);
  assert.equal((await click(f.controls, learner, second)).reason, 'conflict');
});

test('retrying the same control is an idempotent mutation replay', async () => {
  const f = await setup(), b = buttons(await f.controls.build(ctx(learner), f.id))[0];
  assert.deepEqual(await click(f.controls, learner, b), await click(f.controls, learner, b));
  assert.equal((await f.store.read(learner, f.id)).record.revision, 1);
});

test('expired controls cannot mutate the record', async () => {
  let time = 0; const f = await setup({ now: () => time, ttlMs: 10 });
  const b = buttons(await f.controls.build(ctx(learner), f.id))[0]; time = 10;
  assert.equal((await click(f.controls, learner, b)).ok, false);
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});

test('review authority revoked after issue blocks a later click', async () => {
  const f = await setup(), b = buttons(await f.controls.build(ctx(learner), f.id))[0]; await click(f.controls, learner, b);
  const reviewButton = buttons(await f.controls.build(ctx(reviewer), f.id))[1]; f.revoke();
  assert.equal((await click(f.controls, reviewer, reviewButton)).ok, false);
  assert.equal((await f.store.read(learner, f.id)).record.status, 'submitted');
});

test('authorizer exceptions produce a neutral failure', async () => {
  const f = await setup({ authorize: async () => { throw new Error('private diagnostic'); } });
  assert.deepEqual(await f.controls.build(ctx(learner), f.id), { ok: false, reason: 'unavailable' });
});

test('unknown controls and real-shaped contexts are rejected', async () => {
  const f = await setup();
  assert.equal((await f.controls.press({ ...ctx(learner), customId: 'forged' })).ok, false);
  assert.equal((await f.controls.build({ ...ctx(learner), actorId: '123456789012345678' }, f.id)).ok, false);
});

test('bounded control capacity recovers after expiry and disposal blocks clicks', async () => {
  let time = 0; const f = await setup({ maxControls: 1, ttlMs: 10, now: () => time });
  const old = buttons(await f.controls.build(ctx(learner), f.id))[0];
  assert.equal((await f.controls.build(ctx(learner), f.id)).ok, false); time = 10;
  assert.equal((await f.controls.build(ctx(learner), f.id)).ok, true);
  f.controls.dispose(); assert.equal((await click(f.controls, learner, old)).ok, false);
});

test('read access without mutation authority issues no action buttons', async () => {
  const f = await setup({ authorize: async () => false });
  assert.deepEqual((await f.controls.build(ctx(learner), f.id)).components, []);
  assert.throws(() => createSyntheticControls());
});
