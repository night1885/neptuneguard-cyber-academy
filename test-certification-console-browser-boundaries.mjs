import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleBrowser } from './certification-console-browser.js';
const owner = '1223123544301633567', guild = '1330353166830665859';
for (const page of [0, 1, 2, 10000]) {
  for (const count of [0, 1, 5, 6]) {
    test(`audit page ${page} with ${count} rows has unique bounded controls`, async () => {
      const replies = [];
      const pool = { async query(sql, params) {
        assert.match(sql, /^SELECT/); assert.deepEqual(params, [page * 5]);
        return { rows: Array.from({ length: count }, (_, i) => ({ event_id: String(i + 1), action: 'enrollment_approved', actor_discord_user_id: owner, created_at: new Date('2026-10-15T04:00:00Z') })) };
      } };
      const interaction = { customId: `cert:audit:${page}`, user: { id: owner }, guildId: guild,
        isButton: () => true, isModalSubmit: () => false, async deferReply(payload) { assert.equal(payload.flags, 64); },
        async reply() { assert.fail('Valid audit request rejected'); }, async editReply(payload) { replies.push(payload); } };
      await handleConsoleBrowser(interaction, pool, { enabled: true, ownerId: owner }, guild);
      const payload = replies[0], buttons = payload.components.flatMap(row => row.components);
      assert.equal(new Set(buttons.map(button => button.custom_id)).size, buttons.length);
      assert.ok(buttons.every(button => button.custom_id.length <= 100));
      assert.ok(payload.components.length <= 5);
      assert.ok(payload.components.every(row => row.components.length <= 5));
      assert.equal(payload.embeds[0].fields.length, Math.min(count, 5));
      const pagination = payload.components.at(-1).components;
      assert.equal(pagination[0].disabled, page === 0);
      assert.equal(pagination[2].disabled, count <= 5 || page === 10000);
      assert.equal(pagination[1].custom_id, `cert:audit:${page}`);
    });
  }
}
