import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
import { consoleViewId } from './certification-console-presentation.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333';
const config = { enabled: true, ownerId: admin };
const ids = ['cert:admin:courses:0', 'cert:admin:courses:course:0:0', 'cert:admin:courses:module:0:0:0'];
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function fixture({ actor = admin, server = guildId, privateMessage = true } = {}) {
  const calls = [], replies = [], panel = { payload: { content: 'Original admin panel' }, flags: { has: flag => privateMessage && flag === 64 } };
  const pool = { query() { assert.fail('Curriculum navigation must not query learner records'); }, connect() { assert.fail('Curriculum navigation must not open a transaction'); } };
  const route = createCertificationRouter(pool, config, guildId);
  async function click(customId) {
    let updating = false;
    const interaction = { customId, user: { id: actor }, guildId: server, message: panel,
      isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
      async deferUpdate() { assert.equal(this, interaction); updating = true; calls.push('deferUpdate'); },
      async deferReply(payload) { assert.equal(this, interaction); assert.equal(payload.flags, 64); calls.push('deferReply'); },
      async reply(payload) { assert.equal(this, interaction); assert.equal(payload.flags, 64); replies.push(payload); calls.push('reply'); },
      async editReply(payload) { assert.equal(this, interaction); if (updating) panel.payload = payload; else replies.push(payload); calls.push('editReply'); }
    };
    assert.equal(await route(interaction), true);
    return interaction;
  }
  return { click, calls, replies, panel };
}
for (const id of ids) {
  test(`original admin router updates its private panel for ${id}`, async () => {
    const f = fixture(); await f.click(id);
    assert.deepEqual(f.calls, ['deferUpdate', 'editReply']); assert.equal(f.replies.length, 0);
    assert.ok(f.panel.payload.embeds.length); assert.deepEqual(f.panel.payload.allowedMentions, { parse: [] });
    const controls = f.panel.payload.components.flatMap(row => json(row).components);
    assert.ok(controls.some(item => item.custom_id === 'cert:admin:overview:0'));
    assert.ok(f.panel.payload.embeds.every(embed => typeof embed.toJSON === 'function'));
  });
}
test('original dashboard curriculum navigation reuses the same panel across views', async () => {
  const f = fixture(), panel = f.panel;
  for (const id of [...ids, 'cert:admin:courses:course:0:0', 'cert:admin:courses:0']) {
    await f.click(id); assert.equal(f.panel, panel); assert.ok(panel.payload.embeds.length);
  }
  assert.equal(f.replies.length, 0); assert.equal(f.calls.filter(call => call === 'deferUpdate').length, 5);
});
for (const context of [{ actor: student }, { server: null }, { server: student }]) {
  test(`unauthorized original-dashboard curriculum click leaves source unchanged ${JSON.stringify(context)}`, async () => {
    const f = fixture(context), original = f.panel.payload; await f.click(ids[2]);
    assert.equal(f.panel.payload, original); assert.equal(f.calls.includes('deferUpdate'), false);
    assert.equal(f.replies.length, 1); assert.equal(f.replies[0].embeds.length, 0);
    assert.match(f.replies[0].content, /Admin authorization/);
  });
}
test('public source remains unchanged and curriculum is delivered privately', async () => {
  const f = fixture({ privateMessage: false }), original = f.panel.payload; await f.click(ids[2]);
  assert.equal(f.panel.payload, original); assert.deepEqual(f.calls, ['deferReply', 'editReply']);
  assert.equal(f.replies.length, 1); assert.ok(f.replies[0].embeds.length);
});
test('curriculum route recognition remains strictly allowlisted', () => {
  for (const customId of ids) assert.equal(consoleViewId({ customId, isButton: () => true }), customId);
  for (const customId of ['cert:admin:courses:-1', 'cert:admin:courses:__proto__', 'cert:admin:courses:module:0:0:0:extra', 'cert:register:open']) {
    assert.equal(consoleViewId({ customId, isButton: () => true }), null);
  }
});
