import assert from 'node:assert/strict';
import { createManualReviewDecisionService } from './certification-manual-review-decisions.mjs';
import { createManualReviewDecisionFlow } from './certification-manual-review-decision-flow.mjs';
import { createManualReviewDecisionInteractionHandler } from './certification-manual-review-decision-interactions.mjs';

// Invoked only by the localhost-only disposable PostgreSQL acceptance fixture.
// Discord transport is synthetic; the flow, guard, service, queries, locks, and audits are real.
export async function runDecisionStackAcceptance({ t, app, db, config, guildId, owner, role, seed, read, audits, guide, response, setPhase }) {
  assert.match(role, /^cert_dec_[a-f0-9]{32}$/);
  const scoped = { ...config, adminChannelId: '444444444444444444' };
  const escapedFixture = value => value.replaceAll('_', String.fromCharCode(92) + '_');
  function stack({ now = Date.now, ttlMs = 300000 } = {}) {
    const counts = { read: 0, confirm: 0 }, diagnostics = [];
    const real = createManualReviewDecisionService(app, scoped, { guildId, now, ttlMs });
    const service = { prepare: real.prepare, cancel: real.cancel,
      confirm: input => { counts.confirm++; return real.confirm(input); } };
    const flow = createManualReviewDecisionFlow(scoped, { guildId, service, now, ttlMs,
      loadRecord: async id => { counts.read++; return (await app.query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1', [id])).rows[0]; } });
    const handle = createManualReviewDecisionInteractionHandler(scoped, { guildId, flow, onDiagnostic: value => diagnostics.push(value) });
    async function invoke(customId, options = {}) {
      const output = { messages: [], modals: [], defers: [] };
      const interaction = { customId, user: { id: options.actorId ?? owner }, guildId: options.guildId ?? guildId,
        channelId: options.channelId ?? scoped.adminChannelId, deferred: false, replied: false,
        isButton: () => options.modal !== true, isModalSubmit: () => options.modal === true,
        message: { flags: { has: flag => options.privateMessage !== false && flag === 64 } },
        fields: { getTextInputValue: key => options.fields?.[key] },
        async deferReply(payload) { assert.equal(payload.flags, 64); output.defers.push(payload); interaction.deferred = true; },
        async reply(payload) { assert.equal(payload.flags, 64); assert.deepEqual(payload.allowedMentions, { parse: [] }); output.messages.push(payload); interaction.replied = true; },
        async editReply(payload) {
          assert.equal(interaction.deferred, true); assert.equal(Object.hasOwn(payload, 'flags'), false);
          assert.deepEqual(payload.allowedMentions, { parse: [] });
          if (options.failDelivery) throw new Error('Synthetic result delivery failure');
          output.messages.push(payload);
        },
        async showModal(payload) { output.modals.push(payload); interaction.replied = true; } };
      assert.equal(await handle(interaction), true);
      return output;
    }
    async function prepare(row, action = 'approve') {
      const opened = await invoke(`cert:review:open:${row.discord_user_id}`, { privateMessage: false });
      assert.equal(opened.defers.length, 1);
      const review = opened.messages.at(-1);
      assert.equal(review.embeds[1].fields[1].value, escapedFixture(response));
      assert.equal(review.embeds[1].fields[2].value, escapedFixture(guide));
      const choice = review.components[0].components.find(button => button.custom_id.startsWith(`cert:review:choose:${action}:`));
      assert.ok(choice);
      const chosen = await invoke(choice.custom_id);
      assert.equal(chosen.modals.length, 1);
      const submitted = await invoke(chosen.modals[0].custom_id, { modal: true,
        fields: { reason: '  Stack owner reviewed application  ', review_ack: 'REVIEWED' } });
      const confirmation = submitted.messages.at(-1);
      assert.equal(confirmation.embeds[0].fields[0].value, 'Stack owner reviewed application');
      return { confirmId: confirmation.components[0].components[0].custom_id, cancelId: confirmation.components[0].components[1].custom_id };
    }
    return { invoke, prepare, counts, diagnostics, close: () => flow.close() };
  }
  for (const action of ['approve', 'deny']) await t.test(`composed ${action} commits only after final confirmation and cannot replay`, async child => {
    setPhase(`stack:${action}`);
    const row = await seed(), value = stack(); child.after(value.close);
    const controls = await value.prepare(row, action);
    assert.deepEqual(await read(row.discord_user_id), row);
    assert.equal((await audits(row.discord_user_id)).length, 0);
    const output = await value.invoke(controls.confirmId), stored = await read(row.discord_user_id);
    assert.equal(stored.status, action === 'approve' ? 'approved' : 'denied');
    assert.match(output.messages.at(-1).content, new RegExp(`Enrollment decision committed: ${stored.status}`));
    assert.equal(stored.status_reason, 'Stack owner reviewed application');
    assert.equal(stored.comprehension_passed_at, null);
    assert.deepEqual(stored.comprehension_review_snapshot, row.comprehension_review_snapshot);
    if (action === 'approve') { assert.match(stored.student_id, /^NG-PT-[a-f0-9-]{36}$/); assert.equal(stored.approved_by, owner); }
    else assert.equal(stored.student_id, null);
    const events = await audits(row.discord_user_id);
    assert.equal(events.length, 1);
    assert.equal(events[0].actor_discord_user_id, owner);
    assert.equal(events[0].action, action === 'approve' ? 'enrollment_approved' : 'enrollment_deny');
    assert.equal(events[0].details.reason, 'Stack owner reviewed application');
    assert.equal(events[0].details.decisionMethod, 'owner_manual_review');
    assert.ok(!JSON.stringify(events).includes(guide)); assert.ok(!JSON.stringify(events).includes(response));
    assert.deepEqual(value.diagnostics, []);
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 1);
    assert.deepEqual(await read(row.discord_user_id), stored);
    assert.equal((await audits(row.discord_user_id)).length, 1);
  });
  await t.test('composed cancellation leaves the application and audits unchanged', async child => {
    setPhase('stack:cancel');
    const row = await seed(), value = stack(); child.after(value.close);
    const controls = await value.prepare(row);
    const output = await value.invoke(controls.cancelId);
    assert.match(output.messages.at(-1).content, /Confirmation canceled/);
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 0);
    assert.deepEqual(await read(row.discord_user_id), row);
    assert.equal((await audits(row.discord_user_id)).length, 0);
  });
  await t.test('composed scope and private-origin failures cannot read or decide', async child => {
    setPhase('stack:scope');
    const row = await seed(), value = stack(); child.after(value.close);
    const wrong = [{ actorId: row.discord_user_id }, { guildId: '555555555555555555' }, { channelId: '555555555555555555' }];
    for (const options of wrong) {
      const output = await value.invoke(`cert:review:open:${row.discord_user_id}`, options);
      assert.ok(output.messages.every(payload => payload.embeds.length === 0));
    }
    assert.equal(value.counts.read, 0);
    const controls = await value.prepare(row);
    for (const options of [...wrong, { privateMessage: false }]) await value.invoke(controls.confirmId, options);
    assert.equal(value.counts.confirm, 0);
    await value.invoke(controls.cancelId);
    assert.deepEqual(await read(row.discord_user_id), row);
    assert.equal((await audits(row.discord_user_id)).length, 0);
  });
  await t.test('composed stale-response rejection preserves the changed pending record', async child => {
    setPhase('stack:stale');
    const row = await seed(), value = stack(); child.after(value.close);
    const controls = await value.prepare(row);
    await db.query("UPDATE public.certification_enrollments SET comprehension_review_snapshot=jsonb_set(comprehension_review_snapshot,'{items,0,response}',to_jsonb($2::text)),updated_at=NOW() WHERE discord_user_id=$1", [row.discord_user_id, 'Changed composed fixture response']);
    const changed = await read(row.discord_user_id);
    assert.notDeepEqual(changed.comprehension_review_snapshot, row.comprehension_review_snapshot);
    const output = await value.invoke(controls.confirmId);
    assert.match(output.messages.at(-1).content, /Inspect enrollment status and audit history/);
    assert.deepEqual(await read(row.discord_user_id), changed);
    assert.equal((await audits(row.discord_user_id)).length, 0);
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 1);
  });
  await t.test('composed audit failure rolls back and cannot execute on replay', async child => {
    setPhase('stack:audit-rollback');
    const row = await seed(), value = stack(); child.after(value.close);
    const controls = await value.prepare(row);
    const capability = 'INSERT(actor_discord_user_id,subject_discord_user_id,action,details) ON public.certification_audit_events';
    await db.query(`REVOKE ${capability} FROM "${role}"`);
    try {
      const output = await value.invoke(controls.confirmId);
      assert.match(output.messages.at(-1).content, /Inspect enrollment status and audit history/);
    } finally { await db.query(`GRANT ${capability} TO "${role}"`); }
    assert.deepEqual(await read(row.discord_user_id), row);
    assert.equal((await audits(row.discord_user_id)).length, 0);
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 1);
    assert.deepEqual(await read(row.discord_user_id), row);
  });
  await t.test('composed expiration rejects before calling the database decision service', async child => {
    setPhase('stack:expiry');
    let current = 1000;
    const row = await seed(), value = stack({ now: () => current, ttlMs: 50 }); child.after(value.close);
    const controls = await value.prepare(row);
    current = 1050;
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 0);
    assert.deepEqual(await read(row.discord_user_id), row);
    assert.equal((await audits(row.discord_user_id)).length, 0);
  });
  await t.test('composed result-message failure cannot repeat a committed database decision', async child => {
    setPhase('stack:committed-delivery');
    const row = await seed(), value = stack(); child.after(value.close);
    const controls = await value.prepare(row);
    await value.invoke(controls.confirmId, { failDelivery: true });
    const stored = await read(row.discord_user_id);
    assert.equal(stored.status, 'approved');
    assert.equal((await audits(row.discord_user_id)).length, 1);
    assert.deepEqual(value.diagnostics[0], { event: 'owner_manual_review_interaction_failure', phase: 'confirm', outcome: 'committed_delivery_unconfirmed' });
    await value.invoke(controls.confirmId);
    assert.equal(value.counts.confirm, 1);
    assert.deepEqual(await read(row.discord_user_id), stored);
    assert.equal((await audits(row.discord_user_id)).length, 1);
  });
}
