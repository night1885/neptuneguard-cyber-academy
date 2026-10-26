import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticWorkspace } from './workspace.mjs';
import { createSyntheticReviewStore } from './review.mjs';
import { createSyntheticControls } from './controls.mjs';
import { createSyntheticActionPresenter } from './action-presenter.mjs';
const learner = { actorId: 'demo-learner-a', workspaceId: 'demo-server-a', courseKey: 'demo-ethical-hacking', privateWorkspace: true };
const reviewer = { ...learner, actorId: 'demo-reviewer-a' };
const unavailable = () => ({ ok: false, reason: 'unavailable' });
const body = panel => JSON.parse(panel.payload.embeds[0].description);
const action = (panel, index = 0) => panel.payload.components.flatMap(row => row.components).filter(b => b.custom_id.startsWith('formal-demo-action:'))[index];
async function setup(t) {
  let time = 0;
  const assigned = new Set([learner.actorId, reviewer.actorId]);
  const current = q => assigned.has(q.actorId) && q.workspaceId === learner.workspaceId && q.courseKey === learner.courseKey;
  const authorize = async q => current(q) && (q.action === 'review' ? q.actorId === reviewer.actorId : q.actorId === q.ownerId || (q.action === 'read' && q.actorId === reviewer.actorId));
  const store = createSyntheticReviewStore({ authorize });
  t.after(() => store.dispose());
  const id = (await store.create(learner)).record.id;
  function viewer(actor, { afterMutation } = {}) {
    const context = Object.freeze({ ...actor, messageId: 'demo-message-' + actor.actorId });
    const workspace = createSyntheticWorkspace({ authorize: async q => current(q), now: () => time, ttlMs: 10,
      async loadPage() {
        const found = await store.read(actor, id);
        if (!found.ok) throw new Error('Demo record unavailable');
        const { status, revision, evidenceRef, feedbackRef } = found.record;
        return { title: 'DEMO composed review state', body: JSON.stringify({ status, revision, evidenceRef, feedbackRef }) };
      } });
    const controls = createSyntheticControls({ store, authorize, now: () => time, ttlMs: 20 });
    const presenter = createSyntheticActionPresenter({ store, controls });
    t.after(() => { workspace.dispose(); controls.dispose(); });
    async function render(token, cursor = 'lesson', extra = {}) {
      const input = { ...context, token, cursor, ...extra };
      const before = await workspace.navigate(input);
      if (!before.ok) return unavailable();
      const panel = await controls.build(context, id);
      if (!panel.ok) return unavailable();
      const final = await workspace.navigate(input);
      if (!final.ok || body(before).revision !== body(final).revision) return unavailable();
      return { ...final, payload: { ...final.payload, components: [...final.payload.components, ...panel.components] } };
    }
    return {
      async open() { const opened = await workspace.open(context); return opened.ok ? render(opened.sessionToken, 'overview') : unavailable(); },
      render,
      async press(token, customId, extra = {}) {
        const guard = await workspace.navigate({ ...context, token, cursor: 'lesson', ...extra });
        if (!guard.ok) return unavailable();
        const result = await presenter.press({ ...context, customId, ...extra });
        if (!result.ok) return result;
        if (afterMutation) await afterMutation();
        const panel = await render(token);
        return panel.ok ? { ...panel, receipt: result.receipt } : { ok: false, reason: 'refresh-unavailable', mutationOutcome: 'committed-or-replayed' };
      },
      dispose() { workspace.dispose(); controls.dispose(); }
    };
  }
  return { store, id, viewer, assigned, advance: value => { time = value; } };
}
test('composed buttons and navigation retain one message through review resubmission', async t => {
  const f = await setup(t), student = f.viewer(learner), assessor = f.viewer(reviewer);
  const opened = await student.open(), token = opened.sessionToken;
  assert.equal(opened.payload.components[0].components.length, 3);
  let panel = await student.press(token, action(opened).custom_id);
  assert.equal(body(panel).status, 'submitted');
  const reviewed = await assessor.open();
  assert.equal(body(await assessor.press(reviewed.sessionToken, action(reviewed).custom_id)).status, 'changes-requested');
  panel = await student.render(token, 'help');
  panel = await student.press(token, action(panel).custom_id);
  const next = await assessor.render(reviewed.sessionToken);
  assert.equal(body(await assessor.press(reviewed.sessionToken, action(next, 1).custom_id)).status, 'review-recorded');
  const final = await student.render(token);
  assert.equal(body(final).revision, 4); assert.equal(final.messageId, opened.messageId);
  assert.deepEqual([final.grantsAccess, final.progressSaved, final.evidenceCollected], [false, false, false]);
  assert.deepEqual(final.payload.allowedMentions, { parse: [] });
});
test('live control cannot bypass expired workspace session', async t => {
  const f = await setup(t), student = f.viewer(learner), opened = await student.open();
  f.advance(10);
  assert.deepEqual(await student.press(opened.sessionToken, action(opened).custom_id), unavailable());
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});
test('wrong session actor message workspace course and privacy cannot mutate', async t => {
  const f = await setup(t), student = f.viewer(learner), opened = await student.open(), id = action(opened).custom_id;
  assert.deepEqual(await student.press('demo-forged-token', id), unavailable());
  for (const extra of [{ actorId: reviewer.actorId }, { messageId: 'demo-other-message' }, { workspaceId: 'demo-other' }, { courseKey: 'demo-other' }, { privateWorkspace: false }])
    assert.deepEqual(await student.press(opened.sessionToken, id, extra), unavailable());
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});
test('replayed submit refreshes reviewed view rather than historical receipt', async t => {
  const f = await setup(t), student = f.viewer(learner), assessor = f.viewer(reviewer);
  const opened = await student.open(), customId = action(opened).custom_id;
  await student.press(opened.sessionToken, customId);
  const rp = await assessor.open(); await assessor.press(rp.sessionToken, action(rp, 1).custom_id);
  const replay = await student.press(opened.sessionToken, customId);
  assert.equal(replay.receipt.revision, 1); assert.equal(body(replay).revision, 2);
  assert.equal(body(replay).status, 'review-recorded');
});
test('revocation after mutation withholds composed view without claiming rollback', async t => {
  const f = await setup(t), student = f.viewer(learner, { afterMutation: () => f.assigned.delete(learner.actorId) });
  const opened = await student.open(), result = await student.press(opened.sessionToken, action(opened).custom_id);
  assert.deepEqual(result, { ok: false, reason: 'refresh-unavailable', mutationOutcome: 'committed-or-replayed' });
  assert.equal(JSON.stringify(result).includes('demo-evidence-a'), false);
  f.assigned.add(learner.actorId); assert.equal((await f.store.read(learner, f.id)).record.revision, 1);
});
test('disposed workspace cannot use previously issued control', async t => {
  const f = await setup(t), student = f.viewer(learner), opened = await student.open(); student.dispose();
  assert.deepEqual(await student.press(opened.sessionToken, action(opened).custom_id), unavailable());
  assert.equal((await f.store.read(learner, f.id)).record.revision, 0);
});
