import test from 'node:test';
import assert from 'node:assert/strict';
import { readCommunityOptions, classifyCommunityInteraction, createCommunityAdmission, COMMUNITY_COURSES } from './community-learning-policy.mjs';
const guildId = '111111111111111111', verifiedRoleId = '222222222222222222', actor = '333333333333333333';
const settings = { enabled: true, guildId, verifiedRoleId };
function fixture({ command = 'begin', path = 'linux-fundamentals', button, verified = true } = {}) {
  const state = { verified, fetches: 0 };
  const i = { guildId, user: { id: actor }, commandName: command, customId: button,
    isChatInputCommand: () => button === undefined, isButton: () => button !== undefined,
    options: { getString: () => path }, guild: { id: guildId, members: { async fetch(options) {
      assert.deepEqual(options, { user: actor, force: true }); state.fetches++;
      return { id: actor, roles: { cache: { has: role => role === verifiedRoleId && state.verified } } };
    } } } };
  return { i, state };
}
test('configuration is default-off and rejects ambiguous flags or missing identity', () => {
  assert.deepEqual(readCommunityOptions(), { enabled: false });
  assert.throws(() => readCommunityOptions({ COMMUNITY_LEARNING_ENABLED: 'yes' }));
  assert.throws(() => readCommunityOptions({ COMMUNITY_LEARNING_ENABLED: 'true' }));
  assert.deepEqual(readCommunityOptions({ COMMUNITY_LEARNING_ENABLED: 'true', GUILD_ID: guildId, VERIFIED_ROLE_ID: verifiedRoleId }), settings);
});
test('only the three Linux community courses are admitted', async () => {
  for (const path of COMMUNITY_COURSES) assert.equal((await createCommunityAdmission(settings)(fixture({ path }).i)).allowed, true);
});
test('SOC, formal courses, and forged path choices are rejected before member lookup', async () => {
  for (const path of ['soc-analyst', 'ethical-hacking', 'incident-response', 'authorized-pentesting', '../linux-fundamentals', null]) {
    const f = fixture({ path }); assert.equal((await createCommunityAdmission(settings)(f.i)).allowed, false); assert.equal(f.state.fetches, 0);
  }
});
test('disabled admission performs no member lookup', async () => {
  const f = fixture(); assert.equal((await createCommunityAdmission({ enabled: false })(f.i)).reason, 'disabled'); assert.equal(f.state.fetches, 0);
});
test('wrong server, invalid actor, and someone else panel are rejected before lookup', async () => {
  for (const change of [i => i.guildId = null, i => i.guild.id = actor, i => i.user.id = 'bad', i => i.message = { interactionMetadata: { user: { id: guildId } } }]) {
    const f = fixture(); change(f.i); assert.equal((await createCommunityAdmission(settings)(f.i)).allowed, false); assert.equal(f.state.fetches, 0);
  }
});
test('role loss is checked again for every request without enrollment authorization', async () => {
  const f = fixture(), admit = createCommunityAdmission(settings);
  assert.equal((await admit(f.i)).allowed, true); f.state.verified = false;
  assert.equal((await admit(f.i)).reason, 'verification_required'); assert.equal(f.state.fetches, 2);
});
test('failed member lookup fails closed', async () => {
  const f = fixture(); f.i.guild.members.fetch = async () => { throw new Error('private API detail'); };
  assert.deepEqual(await createCommunityAdmission(settings)(f.i), { handled: true, allowed: false, reason: 'verification_unavailable' });
});
test('continue cannot resume a historical SOC or formal path', async () => {
  for (const path of ['soc-analyst', 'incident-response', null]) {
    const f = fixture({ command: 'continue' });
    assert.equal((await createCommunityAdmission(settings, { resolveCurrentCourse: async user => { assert.equal(user, actor); return path; } })(f.i)).allowed, false);
  }
  assert.equal((await createCommunityAdmission(settings, { resolveCurrentCourse: async () => 'linux-administration' })(fixture({ command: 'continue' }).i)).allowed, true);
});
test('direct SOC buttons are rejected while Linux buttons require verification', async () => {
  assert.equal((await createCommunityAdmission(settings)(fixture({ button: 'academy:soc-analyst:1:open' }).i)).allowed, false);
  assert.equal((await createCommunityAdmission(settings)(fixture({ button: 'academy:linux-administration:1:open', verified: false }).i)).allowed, false);
  assert.equal((await createCommunityAdmission(settings)(fixture({ button: 'linux-open-m1' }).i)).allowed, true);
});
test('registration, owner decisions and formal certification controls remain outside community admission', async () => {
  for (const button of ['cert:initial:home', 'cert:register:open', 'cert:review:open:' + actor, 'cert:course:ethical-hacking']) {
    assert.deepEqual(classifyCommunityInteraction(fixture({ button }).i), { handled: false });
  }
  assert.deepEqual(classifyCommunityInteraction(fixture({ command: 'student-progress' }).i), { handled: false });
});
