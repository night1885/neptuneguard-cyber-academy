import test from 'node:test';
import assert from 'node:assert/strict';
import { createManualReviewDecisionInteractionHandler } from './certification-manual-review-decision-interactions.mjs';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333', channelId = '444444444444444444';
const token = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner, adminChannelId: channelId };
const screen = kind => ({ flags: 64, content: 'Synthetic private screen', allowedMentions: { parse: [] }, embeds: [],
  components: [{ type: 1, components: [{ type: 2, style: 2, label: 'Synthetic', custom_id: `cert:review:${kind}:${token}` }] }] });
function fixture() {
  const events = [], diagnostics = [];
  const flow = {
    async open(context, learner) { events.push(['open', context, learner]); return screen('choose:approve'); },
    choose(context, input) { events.push(['choose', context, input]); return { custom_id: `cert:review:reason:${input.action}:${input.reviewToken}`, title: 'Synthetic form', components: [] }; },
    submit(context, input) { events.push(['submit', context, input]); return screen('confirm'); },
    async confirm(context, value) { events.push(['confirm', context, value]); return { status: 'approved', studentId: 'fixture-permanent-id' }; },
    cancel(context, value) { events.push(['cancel', context, value]); return true; }
  };
  const handle = createManualReviewDecisionInteractionHandler(config, { guildId, flow, onDiagnostic: value => diagnostics.push(value) });
  function interaction(customId, { modal = false, privateMessage = true, ...overrides } = {}) {
    const outputs = [];
    const item = { customId, user: { id: owner }, guildId, channelId, deferred: false, replied: false,
      message: { flags: { has: flag => privateMessage && flag === 64 } },
      isButton: () => !modal, isModalSubmit: () => modal,
      fields: { getTextInputValue: key => key === 'reason' ? 'Exact synthetic reason' : 'REVIEWED' },
      async deferReply(payload) { outputs.push(['defer', payload]); item.deferred = true; },
      async reply(payload) { outputs.push(['reply', payload]); item.replied = true; },
      async editReply(payload) { outputs.push(['edit', payload]); },
      async showModal(payload) { outputs.push(['modal', payload]); item.replied = true; }, ...overrides };
    return { item, outputs };
  }
  return { events, diagnostics, flow, handle, interaction };
}
test('unrelated IDs are not handled and already-acknowledged requests cannot execute', async () => {
  const f = fixture();
  assert.equal(await f.handle(f.interaction('cert:other').item), false);
  assert.equal(await f.handle(f.interaction(`cert:review:confirm:${token}`, { deferred: true }).item), true);
  assert.equal(f.events.length, 0);
});
test('owner, guild, channel, interaction type, private origin, and exact IDs are checked first', async () => {
  const f = fixture();
  for (const overrides of [{ user: { id: student } }, { guildId: '555555555555555555' }, { channelId: '555555555555555555' },
    { privateMessage: false }, { modal: true }]) {
    const { item, outputs } = f.interaction(`cert:review:confirm:${token}`, overrides);
    assert.equal(await f.handle(item), true);
    assert.equal(outputs[0][1].flags, 64);
  }
  await f.handle(f.interaction(`cert:review:confirm:${token}:extra`).item);
  assert.equal(f.events.length, 0);
});
test('opening defers privately before loading and edits without attempting to reset ephemeral flags', async () => {
  const f = fixture(), { item, outputs } = f.interaction(`cert:review:open:${student}`, { privateMessage: false });
  f.flow.open = async (context, learner) => { assert.equal(item.deferred, true); f.events.push(['open', context, learner]); return screen('choose:approve'); };
  await f.handle(item);
  assert.equal(outputs[0][0], 'defer');
  assert.equal(outputs[0][1].flags, 64);
  assert.equal(f.events[0][2], student);
  assert.equal(Object.hasOwn(outputs[1][1], 'flags'), false);
  assert.deepEqual(outputs[1][1].allowedMentions, { parse: [] });
});
test('choice opens only a modal and submission passes the actual typed reason and acknowledgment', async () => {
  const f = fixture(), choice = f.interaction(`cert:review:choose:deny:${token}`);
  await f.handle(choice.item);
  assert.equal(choice.outputs[0][0], 'modal');
  assert.deepEqual(f.events[0][2], { action: 'deny', reviewToken: token });
  const form = f.interaction(`cert:review:reason:deny:${token}`, { modal: true });
  await f.handle(form.item);
  assert.deepEqual(f.events[1][2], { action: 'deny', reviewToken: token, reason: 'Exact synthetic reason', reviewAck: 'REVIEWED' });
  assert.equal(f.events.filter(event => event[0] === 'confirm').length, 0);
});
test('a failed private acknowledgment cannot call the decision service', async () => {
  const f = fixture(), { item } = f.interaction(`cert:review:confirm:${token}`, { async deferReply() { throw new Error('Synthetic transport failure'); } });
  await f.handle(item);
  assert.equal(f.events.length, 0);
});
test('confirmation passes only server-derived scope and token after private acknowledgment', async () => {
  const f = fixture(), { item, outputs } = f.interaction(`cert:review:confirm:${token}`);
  f.flow.confirm = async (context, value) => { assert.equal(item.deferred, true); f.events.push(['confirm', context, value]); return { status: 'denied', studentId: null }; };
  await f.handle(item);
  assert.deepEqual(f.events[0], ['confirm', { actorId: owner, actualGuildId: guildId, actualChannelId: channelId }, token]);
  assert.match(outputs.at(-1)[1].content, /committed: denied/);
});
test('cancellation does not invoke confirmation', async () => {
  const f = fixture(), { item } = f.interaction(`cert:review:cancel:${token}`);
  await f.handle(item);
  assert.deepEqual(f.events.map(event => event[0]), ['cancel']);
});
test('failed confirmation delivery invalidates the newly issued pending token', async () => {
  const f = fixture(), { item } = f.interaction(`cert:review:reason:approve:${token}`, { modal: true, async editReply() { throw new Error('Synthetic delivery failure'); } });
  await f.handle(item);
  assert.deepEqual(f.events.map(event => event[0]), ['submit', 'cancel']);
  assert.equal(f.events[1][2], token);
});
test('message failure after a committed result never repeats the decision', async () => {
  const f = fixture(), { item, outputs } = f.interaction(`cert:review:confirm:${token}`);
  let edits = 0;
  item.editReply = async payload => { if (++edits === 1) throw new Error('Synthetic delivery failure'); outputs.push(['edit', payload]); };
  await f.handle(item);
  assert.equal(f.events.filter(event => event[0] === 'confirm').length, 1);
  assert.match(outputs.at(-1)[1].content, /do not repeat the decision/);
  assert.deepEqual(f.diagnostics[0], { event: 'owner_manual_review_interaction_failure', phase: 'confirm', outcome: 'committed_delivery_unconfirmed' });
});
test('uncertain transaction outcome produces inspection guidance, not raw errors or retries', async () => {
  const f = fixture(), { item, outputs } = f.interaction(`cert:review:confirm:${token}`);
  let attempts = 0;
  f.flow.confirm = async () => { attempts++; throw Object.assign(new Error('PRIVATE_DATABASE_DETAILS'), { code: 'MANUAL_REVIEW_DECISION_OUTCOME_UNCONFIRMED' }); };
  await f.handle(item);
  assert.equal(attempts, 1);
  assert.match(outputs.at(-1)[1].content, /Inspect enrollment status and audit history/);
  assert.ok(!JSON.stringify([outputs, f.diagnostics]).includes('PRIVATE_DATABASE_DETAILS'));
  assert.equal(f.diagnostics[0].outcome, 'outcome_unconfirmed');
});
