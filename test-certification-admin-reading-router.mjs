import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
import { COURSES } from './course-registry.js';
import { ADMIN_READING_COURSES } from './certification-admin-reading-courses.mjs';
const O = '100000000000000001', S = '100000000000000002', G = '100000000000000003', C = '100000000000000004', B = '100000000000000005';
const config = Object.freeze({ enabled: true, ownerId: O, adminChannelId: C });
function frame(customId) {
  return { customId, user: { id: O, bot: false }, guildId: G, guild: { id: G }, channelId: C, client: { user: { id: B } },
    message: { author: { id: B }, interactionMetadata: { user: { id: O } }, flags: { has: n => n === 64 } },
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false };
}
function academy() {
  return createCertificationRouter({ query() { assert.fail('Admin reading must not query learner records'); }, connect() { assert.fail('Admin reading must not open a transaction'); } }, config, G);
}
async function capture(handle, interaction) {
  const replies = [];
  interaction.deferReply = async p => assert.equal(p.flags, 64);
  interaction.deferUpdate = async () => {};
  interaction.reply = async p => replies.push(JSON.parse(JSON.stringify(p)));
  interaction.editReply = async p => replies.push(JSON.parse(JSON.stringify(p)));
  assert.equal(await handle(interaction), true);
  assert.equal(replies.length, 1);
  assert.deepEqual(replies[0].allowedMentions, { parse: [] });
  return replies[0];
}
for (let n = 0; n < ADMIN_READING_COURSES.length; n++) {
  const course = ADMIN_READING_COURSES[n], index = COURSES.length + n;
  test(`${course.key}: all reachable reading views survive the actual academy router`, async () => {
    const handle = academy(), queue = [`cert:admin:courses:course:${index}:0`], seen = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      assert.ok(seen.size < 2000, 'Traversal must stay bounded');
      const payload = await capture(handle, frame(id));
      assert.equal(payload.embeds.length, 1, `${id}: ${payload.content}`);
      assert.match(payload.embeds[0].footer.text, /Admin-only read-only preview/);
      assert.ok(payload.components.length <= 5);
      assert.ok(payload.components.every(row => row.components.length > 0 && row.components.length <= 5));
      const buttons = payload.components.flatMap(row => row.components), ids = buttons.map(button => button.custom_id);
      assert.equal(new Set(ids).size, ids.length, `Duplicate navigation at ${id}`);
      assert.ok(ids.includes('cert:students:list:0'), 'Existing Students navigation must remain');
      assert.ok(ids.includes('cert:admin:overview:0'));
      assert.ok(ids.includes('cert:admin:courses:0'));
      for (const button of buttons) {
        assert.ok(button.custom_id.length <= 100);
        assert.ok(!button.custom_id.startsWith('cert:course:'));
        if (button.custom_id.startsWith(`cert:admin:courses:module:${index}:`)) queue.push(button.custom_id);
      }
    }
    assert.ok(seen.size > 2, 'Must exercise more than the course home');
  });
  test(`${course.key}: full router still denies foreign or missing private owner context`, async () => {
    const handle = academy();
    for (const change of [i => { i.user.id = S; }, i => { i.channelId = S; }, i => { i.guild = null; }, i => { i.message.flags.has = () => false; }, i => { i.message.interactionMetadata.user.id = S; }, i => { i.message.author.id = S; }, i => { i.client = undefined; }]) {
      const interaction = frame(`cert:admin:courses:course:${index}:0`);
      change(interaction);
      const payload = await capture(handle, interaction);
      assert.equal(payload.embeds.length, 0);
      assert.match(payload.content, /authorization|unavailable/i);
    }
  });
}
