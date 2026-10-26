import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticReviewStore } from './review.mjs';
import { createSyntheticControls } from './controls.mjs';
import { createSyntheticActionPresenter } from './action-presenter.mjs';
const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const ctx = who => ({ ...who, messageId: 'demo-message-' + who.actorId });
const button = panel => panel.components[0].components[0];
async function setup(t) {
  let allowed = true;
  const policy = q => allowed && (q.action === 'review' ? q.actorId === reviewer.actorId : q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId));
  const store = createSyntheticReviewStore({ authorize: async q => policy(q) });
  const id = (await store.create(learner)).record.id;
  const controls = createSyntheticControls({ store, authorize: async q => policy(q) });
  t.after(() => { controls.dispose(); store.dispose(); });
  const b = button(await controls.build(ctx(learner), id));
  return { store, id, controls, input: { ...ctx(learner), customId: b.custom_id }, revoke: () => { allowed = false; } };
}
test('successful press returns current state and same-message intent', async t => {
  const f = await setup(t), presenter = createSyntheticActionPresenter(f);
  const result = await presenter.press(f.input);
  assert.equal(result.record.status, 'submitted'); assert.equal(result.record.revision, 1);
  assert.equal(result.messageId, f.input.messageId); assert.equal(result.visibility, 'private-required');
  assert.deepEqual(result.allowedMentions, { parse: [] });
  assert.deepEqual([result.persisted, result.evidenceCollected, result.grantsAccess, result.awardsIssued], [false, false, false, false]);
});
test('replayed button keeps historical receipt separate from current reviewed state', async t => {
  const f = await setup(t), presenter = createSyntheticActionPresenter(f);
  await presenter.press(f.input);
  const panel = await f.controls.build(ctx(reviewer), f.id);
  await f.controls.press({ ...ctx(reviewer), customId: panel.components[0].components[1].custom_id });
  const result = await presenter.press(f.input);
  assert.deepEqual(result.receipt, { revision: 1, status: 'submitted' });
  assert.equal(result.record.status, 'review-recorded'); assert.equal(result.record.revision, 2);
});
test('refresh denial after successful mutation does not claim rollback or leak receipt', async t => {
  const f = await setup(t);
  const presenter = createSyntheticActionPresenter({ controls: f.controls, store: { read: async () => ({ ok: false }) } });
  const result = await presenter.press(f.input);
  assert.deepEqual(result, { ok: false, reason: 'refresh-unavailable', mutationOutcome: 'committed-or-replayed' });
  assert.equal((await f.store.read(learner, f.id)).record.revision, 1);
  assert.equal(JSON.stringify(result).includes('demo-evidence-a'), false);
});
test('refresh exception can recover by same control replay without another revision', async t => {
  const f = await setup(t);
  const failed = createSyntheticActionPresenter({ controls: f.controls, store: { read: async () => { throw new Error('private detail'); } } });
  assert.equal((await failed.press(f.input)).reason, 'refresh-unavailable');
  const recovered = await createSyntheticActionPresenter(f).press(f.input);
  assert.equal(recovered.record.revision, 1);
});
test('cross-actor and retargeted message press are denied', async t => {
  const f = await setup(t), presenter = createSyntheticActionPresenter(f);
  for (const change of [{ actorId: reviewer.actorId }, { messageId: 'demo-other-message' }])
    assert.deepEqual(await presenter.press({ ...f.input, ...change }), { ok: false, reason: 'unavailable' });
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});
test('revocation before refreshed read withholds all record data', async t => {
  const f = await setup(t);
  const presenter = createSyntheticActionPresenter({ controls: f.controls, store: { read: async (...args) => { f.revoke(); return f.store.read(...args); } } });
  assert.equal((await presenter.press(f.input)).reason, 'refresh-unavailable');
});
test('independently issued stale control remains a conflict', async t => {
  const f = await setup(t), presenter = createSyntheticActionPresenter(f);
  const other = button(await f.controls.build(ctx(learner), f.id));
  await presenter.press(f.input);
  assert.deepEqual(await presenter.press({ ...ctx(learner), customId: other.custom_id }), { ok: false, reason: 'conflict' });
});
test('client command overrides and missing dependencies are refused', async t => {
  const f = await setup(t), presenter = createSyntheticActionPresenter(f);
  assert.deepEqual(await presenter.press({ ...f.input, expectedRevision: 99 }), { ok: false, reason: 'unavailable' });
  assert.throws(() => createSyntheticActionPresenter());
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});
