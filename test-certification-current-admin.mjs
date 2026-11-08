import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits } from 'discord.js';
import { createCurrentAdministratorVerifier } from './certification-current-admin.js';

const guildId = '1339276399390887957', actorId = '1223123544301633568';
function fixture() {
  const state = { admin: true, fail: '', memberId: actorId, memberGuild: guildId, calls: [] };
  const member = { get id() { return state.memberId; }, get guild() { return { id: state.memberGuild }; }, permissions: { has(bit) { assert.equal(bit, PermissionFlagsBits.Administrator); return state.admin; } } };
  const guild = { id: guildId, members: { async fetch(options) { state.calls.push(['member', options]); if (state.fail === 'member') throw new Error('fixture'); return member; } }, roles: { async fetch() { state.calls.push(['roles']); if (state.fail === 'roles') throw new Error('fixture'); } } };
  const client = { guilds: { async fetch(options) { state.calls.push(['guild', options]); if (state.fail === 'guild') throw new Error('fixture'); return guild; } } };
  return { state, guild, verify: createCurrentAdministratorVerifier(client, guildId) };
}
test('explicit client and valid server are required', () => {
  assert.throws(() => createCurrentAdministratorVerifier({}, guildId));
  assert.throws(() => createCurrentAdministratorVerifier({ guilds: { fetch() {} } }, 'invalid'));
});
test('fresh guild, member and role reads precede Administrator verification', async () => {
  const f = fixture(); assert.equal(await f.verify(actorId), true);
  assert.deepEqual(f.state.calls, [['guild', { guild: guildId, force: true }], ['member', { user: actorId, force: true, cache: false }], ['roles']]);
});
test('permission is not remembered between actions', async () => {
  const f = fixture(); assert.equal(await f.verify(actorId), true); f.state.admin = false;
  assert.equal(await f.verify(actorId), false); assert.equal(f.state.calls.length, 6);
});
test('invalid actor causes no Discord lookup', async () => {
  const f = fixture(); assert.equal(await f.verify('invalid'), false); assert.deepEqual(f.state.calls, []);
});
test('wrong server or member identity is denied', async () => {
  for (const mutation of [f => { f.guild.id = actorId; }, f => { f.state.memberId = guildId; }, f => { f.state.memberGuild = actorId; }]) {
    const f = fixture(); mutation(f); assert.equal(await f.verify(actorId), false);
  }
});
test('guild, member and role lookup failures all deny', async () => {
  for (const stage of ['guild', 'member', 'roles']) { const f = fixture(); f.state.fail = stage; assert.equal(await f.verify(actorId), false); }
});
