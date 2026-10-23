import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333', channelId = '444444444444444444';
const token = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const settings = { enabled: true, ownerId: owner, guildId, adminChannelId: channelId, studentIds: [student] };
const open = `cert:review:open:${student}`, choose = `cert:review:choose:approve:${token}`, confirm = `cert:review:confirm:${token}`, modalId = `cert:review:reason:approve:${token}`;
function interaction(customId, { actorId = owner, guild = guildId, channel = channelId, modal = false, privateMessage = true, origin = actorId } = {}) {
  const output = [];
  const item = { customId, user: { id: actorId }, guildId: guild, channelId: channel, deferred: false, replied: false,
    isButton: () => !modal, isModalSubmit: () => modal, isStringSelectMenu: () => false,
    message: { flags: { has: flag => privateMessage && flag === 64 }, interactionMetadata: { user: { id: origin } } },
    async reply(payload) { output.push(payload); item.replied = true; },
    async followUp(payload) { output.push(payload); },
    async editReply(payload) { output.push(payload); },
    async deferReply(payload) { output.push(payload); item.deferred = true; },
    async showModal(payload) { output.push(payload); item.replied = true; } };
  return { item, output };
}
function fixture({ ready = true } = {}) {
  const calls = { decision: 0, base: 0, initialize: 0, dispose: 0, baseDispose: 0 };
  const readViews = async () => { calls.base++; return true; };
  readViews.dispose = () => { calls.baseDispose++; };
  const decision = async (i, policy) => {
    calls.decision++; assert.ok(Object.isFrozen(policy)); policy.assertTarget(student);
    if (i.customId === choose) await i.showModal({ custom_id: modalId, title: 'Synthetic modal', components: [] });
    else await i.reply({ content: 'Synthetic decision view', components: [{ type: 1, components: [{ type: 2, style: 2, label: 'Confirm', custom_id: confirm }] }] });
    return true;
  };
  decision.initialize = async () => { calls.initialize++; return { ready }; };
  decision.dispose = () => { calls.dispose++; };
  const args = { settings, readViews, registration: async () => true, learner: async () => true };
  return { calls, decision, args, route: createRegistrationPilotRouter({ ...args, ownerDecisionsEnabled: true, ownerDecisions: decision }) };
}
test('existing policy blocks all owner decision controls by default', () => {
  const policy = createRegistrationPilotPolicy(settings);
  for (const customId of [open, choose, confirm]) {
    assert.equal(policy.allowsButton(owner, customId), false);
    assert.equal(policy.classify(interaction(customId).item), null);
  }
  assert.equal(policy.allowsModal(owner, modalId), false);
});
test('enabled policy admits only exact owner controls for allowlisted review entry', () => {
  const policy = createRegistrationPilotPolicy(settings, { ownerDecisionsEnabled: true });
  assert.equal(policy.classify(interaction(open, { privateMessage: false }).item), 'decision');
  assert.equal(policy.classify(interaction(confirm).item), 'decision');
  assert.equal(policy.classify(interaction(modalId, { modal: true }).item), 'decision');
  for (const customId of [`cert:review:open:555555555555555555`, `${confirm}:extra`, `cert:review:choose:suspend:${token}`]) {
    assert.equal(policy.classify(interaction(customId).item), null);
  }
  for (const options of [{ actorId: student }, { guild: '555555555555555555' }, { channel: '555555555555555555' },
    { privateMessage: false }, { origin: student }]) assert.equal(policy.classify(interaction(confirm, options).item), null);
  assert.equal(policy.classify(interaction(modalId, { modal: true, privateMessage: false }).item), null);
  assert.throws(() => policy.assertTarget('555555555555555555'));
});
test('decision routing stays closed until explicit readiness succeeds', async () => {
  const f = fixture(), before = interaction(open);
  await f.route(before.item);
  assert.equal(f.calls.decision, 0);
  assert.equal(before.output[0].flags, 64);
  const first = f.route.initialize(); assert.equal(first, f.route.initialize());
  await first;
  const after = interaction(open); await f.route(after.item);
  assert.equal(f.calls.initialize, 1); assert.equal(f.calls.decision, 1);
  assert.equal(after.output[0].flags, 64);
  assert.equal(after.output[0].components[0].components[0].custom_id, confirm);
  assert.notEqual(after.output[0].components[0].components[0].disabled, true);
  assert.match(after.output[0].content, /separate owner decision/);
  await f.route.dispose();
});
test('failed readiness never admits the decision callback', async () => {
  const f = fixture({ ready: false });
  await assert.rejects(f.route.initialize());
  await f.route(interaction(open).item);
  assert.equal(f.calls.decision, 0);
  await f.route.dispose();
});
test('pilot proxy permits only the explicitly enabled owner review modal', async () => {
  const f = fixture(); await f.route.initialize();
  const request = interaction(choose); await f.route(request.item);
  assert.equal(request.output[0].custom_id, modalId);
  await f.route.dispose();
});
test('existing read routes remain separate and shutdown disposes both branches once', async () => {
  const f = fixture(); await f.route.initialize();
  await f.route(interaction('cert:admin:overview:0').item);
  assert.equal(f.calls.base, 1); assert.equal(f.calls.decision, 0);
  await f.route.dispose(); await f.route.dispose();
  await f.route(interaction(confirm).item);
  assert.equal(f.calls.decision, 0);
  assert.equal(f.calls.dispose, 1); assert.equal(f.calls.baseDispose, 1);
  await assert.rejects(f.route.initialize());
});
test('decision enablement requires explicit boolean, readiness, and cleanup capabilities', () => {
  const f = fixture();
  assert.throws(() => createRegistrationPilotPolicy(settings, { ownerDecisionsEnabled: 'true' }));
  assert.throws(() => createRegistrationPilotRouter({ ...f.args, ownerDecisions: f.decision }));
  assert.throws(() => createRegistrationPilotRouter({ ...f.args, ownerDecisionsEnabled: true }));
  assert.throws(() => createRegistrationPilotRouter({ ...f.args, ownerDecisionsEnabled: true, ownerDecisions: async () => true }));
});
