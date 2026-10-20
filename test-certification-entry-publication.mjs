import test from 'node:test';
import assert from 'node:assert/strict';
import { ChannelType } from 'discord.js';
import { updateCertificationEntryPanels } from './certification-entry-publication.js';
const guildId = '333333333333333333', botId = '111111111111111111', adminChannelId = '444444444444444444', studentChannelId = '555555555555555555', adminMessageId = '666666666666666666', studentMessageId = '777777777777777777';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function fixture(options = {}) {
  const operations = [], edits = [], bot = {}, everyone = {}, runtime = { enabled: true, ready: true };
  const channels = new Map();
  for (const [kind, channelId, messageId] of [['admin', adminChannelId, adminMessageId], ['student', studentChannelId, studentMessageId]]) {
    const message = { id: messageId, channelId, author: { id: options.foreignStudent && kind === 'student' ? '888888888888888888' : botId },
      async edit(payload) {
        operations.push(`edit:${kind}`);
        if (options.failStudent && kind === 'student') throw new Error('PRIVATE-API-DETAIL');
        edits.push({ kind, payload }); if (options.stopAfterAdmin && kind === 'admin') runtime.ready = false;
      } };
    channels.set(channelId, { id: channelId, guildId: options.wrongStudentGuild && kind === 'student' ? botId : guildId,
      type: options.studentThread && kind === 'student' ? ChannelType.PublicThread : ChannelType.GuildText,
      permissionsFor(member) { return { has: () => member === everyone ? Boolean(options.publicAdmin) : !options.missingPermissions }; },
      messages: { async fetch(id) { operations.push(`read:${kind}`); assert.equal(id, messageId); return message; } },
      async send() { assert.fail('Publisher must not create messages'); } });
  }
  const client = { user: { id: botId },
    guilds: { async fetch(id) { operations.push('guild'); assert.equal(id, guildId); return { id: guildId, members: { async fetchMe() { return bot; } }, roles: { everyone } }; } },
    channels: { async fetch(id) { return channels.get(id); } } };
  const args = { client, runtime, guildId, adminChannelId, adminMessageId, studentChannelId, studentMessageId };
  return { operations, edits, runtime, args, run: () => updateCertificationEntryPanels(args) };
}
test('publisher preflights both targets before replacing original entry controls without creating messages', async () => {
  const f = fixture(); assert.deepEqual(await f.run(), { adminMessageId, studentMessageId });
  assert.deepEqual(f.operations, ['guild', 'read:admin', 'read:student', 'edit:admin', 'edit:student']);
  const controls = payload => payload.components.flatMap(row => json(row).components);
  assert.deepEqual(controls(f.edits[0].payload).map(item => item.custom_id), ['cert:admin:overview:0']);
  assert.deepEqual(controls(f.edits[1].payload).map(item => item.custom_id), ['cert:initial:home', 'cert:learner:home']);
  for (const { payload } of f.edits) {
    assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.deepEqual(payload.embeds, []); assert.deepEqual(payload.attachments, []);
  }
});
for (const change of [{ ready: false }, { enabled: false }]) {
  test(`runtime state rejects publication before lookups ${JSON.stringify(change)}`, async () => {
    const f = fixture(); Object.assign(f.runtime, change);
    await assert.rejects(f.run(), /unavailable/); assert.deepEqual(f.operations, []);
  });
}
for (const options of [{ publicAdmin: true }, { missingPermissions: true }, { foreignStudent: true }, { wrongStudentGuild: true }, { studentThread: true }]) {
  test(`invalid publication context prevents all edits ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await assert.rejects(f.run()); assert.equal(f.edits.length, 0);
    assert.ok(!f.operations.some(operation => operation.startsWith('edit:')));
  });
}
for (const change of [{ adminMessageId: undefined }, { studentMessageId: 'invalid' }, { studentChannelId: adminChannelId }, { guildId: null }]) {
  test(`invalid explicit targets fail before lookups ${JSON.stringify(change)}`, async () => {
    const f = fixture(); Object.assign(f.args, change);
    await assert.rejects(f.run(), /Explicit valid/); assert.deepEqual(f.operations, []);
  });
}
test('runtime shutdown between edits blocks the second edit without pretending to roll back the first', async () => {
  const f = fixture({ stopAfterAdmin: true }); await assert.rejects(f.run(), /no further entry edits/);
  assert.deepEqual(f.edits.map(edit => edit.kind), ['admin']); assert.ok(!f.operations.includes('edit:student'));
});
test('partial publication failure reports inspection requirement without exposing raw API error', async () => {
  const f = fixture({ failStudent: true });
  await assert.rejects(f.run(), error => {
    assert.match(error.message, /earlier edits may have succeeded/); assert.doesNotMatch(error.message, /PRIVATE-API-DETAIL/); return true;
  });
  assert.deepEqual(f.edits.map(edit => edit.kind), ['admin']);
});
