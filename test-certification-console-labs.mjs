import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleLabs } from './certification-console-labs.js';
const owner = '1223123544301633567', guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner };
const request = '00000000-0000-4000-8000-000000000001';
function fixture({ id = 'cert:labview:all:0', actor = owner, guildId = guild, records = [] } = {}) {
  const queries = [], replies = [], deferrals = [];
  const pool = { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql, params }); return { rows: records }; }, connect() { assert.fail('No lab mutations'); } };
  const interaction = { customId: id, user: { id: actor }, guildId, isButton: () => true,
    async reply(value) { replies.push(value); }, async deferReply(value) { deferrals.push(value); }, async editReply(value) { replies.push(value); } };
  return { pool, interaction, queries, replies, deferrals };
}
for (const status of ['all', 'pending', 'approved', 'denied', 'suspended', 'revoked', 'expired']) {
  for (const size of [0, 6]) {
    test(`lab ${status} list with ${size} records is private, bounded and unique`, async () => {
      const records = Array.from({ length: size }, (_, i) => ({ request_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, discord_user_id: owner, lab_key: 'test-lab', status: 'pending' }));
      const f = fixture({ id: `cert:labview:${status}:0`, records });
      await handleConsoleLabs(f.interaction, f.pool, config, guild);
      assert.deepEqual(f.queries[0].params, [status, 0]); assert.equal(f.deferrals[0].flags, 64);
      const payload = f.replies[0], controls = payload.components.flatMap(row => row.components);
      assert.ok(payload.components.length <= 5); assert.ok(payload.components.every(row => row.components.length <= 5));
      assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
      assert.ok(controls.every(control => control.custom_id.length <= 100));
      assert.equal(payload.embeds[0].fields.length, Math.min(size, 5));
      assert.deepEqual(payload.allowedMentions, { parse: [] });
    });
  }
}
for (const options of [{ actor: '1223123544301633568' }, { guildId: null }, { id: 'cert:labview:all:10001' }, { id: 'cert:labview:detail:invalid' }]) {
  test(`lab view rejects invalid context/input ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await handleConsoleLabs(f.interaction, f.pool, config, guild);
    assert.equal(f.queries.length, 0); assert.equal(f.deferrals.length, 0); assert.equal(f.replies[0].flags, 64);
  });
}
test('lab detail is parameterized and excludes private scope and notes', async () => {
  const secret = 'DO-NOT-DISPLAY';
  const f = fixture({ id: `cert:labview:detail:${request}`, records: [{ request_id: request, discord_user_id: owner, status: 'approved', scope: { secret }, status_reason: secret }] });
  await handleConsoleLabs(f.interaction, f.pool, config, guild);
  assert.deepEqual(f.queries[0].params, [request]); assert.ok(!JSON.stringify(f.replies[0]).includes(secret));
  assert.match(f.replies[0].embeds[0].description, /not proof of a running session/);
});
test('missing request returns navigation without mutation', async () => {
  const f = fixture({ id: `cert:labview:detail:${request}` }); await handleConsoleLabs(f.interaction, f.pool, config, guild);
  assert.match(f.replies[0].content, /not found/); assert.equal(f.replies[0].embeds.length, 0);
});
test('disabled lab view denies access before database access', async () => {
  const f = fixture(); await handleConsoleLabs(f.interaction, f.pool, { ...config, enabled: false }, guild); assert.equal(f.queries.length, 0);
});
test('unrelated buttons pass through', async () => {
  const f = fixture({ id: 'other:button' }); assert.equal(await handleConsoleLabs(f.interaction, f.pool, config, guild), false);
});
