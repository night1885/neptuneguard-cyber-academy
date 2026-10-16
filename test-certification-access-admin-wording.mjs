import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessActionHandler } from './certification-access-actions.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
for (const options of [{ actor: student }, { guildId: null }, { guildId: '444444444444444444' }, { enabled: false }]) {
  test(`access actions reject unauthorized context with admin wording: ${JSON.stringify(options)}`, async () => {
    const replies = [];
    const pool = { query() { assert.fail('Unauthorized action cannot query'); }, connect() { assert.fail('Unauthorized action cannot write'); } };
    const config = { ownerId: owner, enabled: options.enabled ?? true };
    const handler = createAccessActionHandler(pool, config, guild);
    const interaction = { customId: `cert:access:suspend:${student}`, user: { id: options.actor || owner },
      guildId: Object.hasOwn(options, 'guildId') ? options.guildId : guild,
      isButton: () => true, isModalSubmit: () => false,
      async reply(payload) { replies.push(payload); },
      async showModal() { assert.fail('Unauthorized action cannot open a modal'); } };
    assert.equal(await handler(interaction), true);
    assert.equal(replies.length, 1);
    assert.equal(replies[0].content, 'Admin authorization in the configured server is required.');
    assert.equal(replies[0].flags, 64);
    assert.deepEqual(replies[0].allowedMentions, { parse: [] });
    assert.equal(config.ownerId, owner);
  });
}
