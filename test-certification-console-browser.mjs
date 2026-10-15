import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleBrowser } from './certification-console-browser.js';
const owner = '1223123544301633567', guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner };
function fixture({ id = 'cert:dir:all:0:', actor = owner, guildId = guild, modal = false, query = '', status = '', rows = [] } = {}) {
  const queries = [], replies = [], deferrals = [], modals = [];
  const interaction = { customId: id, user: { id: actor }, guildId, isButton: () => !modal, isModalSubmit: () => modal,
    fields: { getTextInputValue: key => key === 'query' ? query : status },
    async reply(payload) { replies.push(payload); }, async deferReply(payload) { deferrals.push(payload); },
    async editReply(payload) { replies.push(payload); }, async showModal(payload) { modals.push(payload); } };
  const pool = { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql, params }); return { rows }; }, connect() { assert.fail('No transactions'); } };
  return { interaction, pool, queries, replies, deferrals, modals };
}
for (const options of [{ actor: '1223123544301633568' }, { guildId: null }, { guildId: '1339276399390887956' }]) {
  test(`browser denies unauthorized context ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await handleConsoleBrowser(f.interaction, f.pool, config, guild);
    assert.equal(f.queries.length, 0); assert.equal(f.deferrals.length, 0); assert.equal(f.replies[0].flags, 64);
  });
}
test('disabled browser denies access before queries', async () => {
  const f = fixture(); await handleConsoleBrowser(f.interaction, f.pool, { ...config, enabled: false }, guild);
  assert.equal(f.queries.length, 0); assert.match(f.replies[0].content, /Owner authorization/);
});
test('search modal opens without database access', async () => {
  const f = fixture({ id: 'cert:dir:search' }); await handleConsoleBrowser(f.interaction, f.pool, config, guild);
  assert.equal(f.modals.length, 1); assert.equal(f.queries.length, 0);
});
test('modal search uses parameters and resets pagination', async () => {
  const f = fixture({ id: 'cert:dir:search', modal: true, query: 'NG-PT-example', status: ' APPROVED ' });
  await handleConsoleBrowser(f.interaction, f.pool, config, guild);
  assert.deepEqual(f.queries[0].params, ['approved', 'NG-PT-example', 0]); assert.equal(f.deferrals[0].flags, 64);
  assert.ok(!f.queries[0].sql.includes('NG-PT-example'));
});
for (const options of [
  { id: 'cert:dir:search', modal: true, query: "x' OR 1=1" },
  { id: 'cert:dir:search', modal: true, status: '__proto__' },
  { id: 'cert:dir:all:10001:' }, { id: 'cert:dir:all:-1:' }, { id: 'cert:audit:10001' },
  { id: 'cert:dir:search', modal: true, query: 'x'.repeat(49) }
]) {
  test(`invalid input rejected ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await handleConsoleBrowser(f.interaction, f.pool, config, guild);
    assert.equal(f.queries.length, 0); assert.equal(f.replies[0].flags, 64);
  });
}
test('student pagination preserves filters and displays only five records', async () => {
  const rows = Array.from({ length: 6 }, (_, i) => ({ discord_user_id: String(1223123544301633560n + BigInt(i)), status: 'approved', student_id: `NG-${i}`, age_eligible: true }));
  const f = fixture({ id: 'cert:dir:approved:1:', rows }); await handleConsoleBrowser(f.interaction, f.pool, config, guild);
  assert.deepEqual(f.queries[0].params, ['approved', '', 5]);
  const payload = f.replies[0]; assert.equal(payload.embeds[0].fields.length, 5);
  assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.ok(payload.components.length <= 5);
  const buttons = payload.components.flatMap(x => x.components);
  assert.ok(buttons.some(x => x.custom_id === 'cert:dir:approved:2:' && !x.disabled));
  assert.equal(new Set(buttons.map(x => x.custom_id)).size, buttons.length);
  assert.ok(buttons.every(x => x.custom_id.length <= 100));
});
test('empty first page disables previous and next with distinct IDs', async () => {
  const f = fixture(); await handleConsoleBrowser(f.interaction, f.pool, config, guild);
  const buttons = f.replies[0].components.at(-1).components;
  assert.equal(buttons[0].disabled, true); assert.equal(buttons[2].disabled, true);
  assert.equal(new Set(buttons.map(x => x.custom_id)).size, 3);
});
test('audit displays metadata only and uses stable descending ordering', async () => {
  const secret = 'PRIVATE-DETAILS-OMITTED';
  const f = fixture({ id: 'cert:audit:1', rows: [{ event_id: '9', actor_discord_user_id: owner, action: 'enrollment_approved', details: { secret } }] });
  await handleConsoleBrowser(f.interaction, f.pool, config, guild);
  assert.deepEqual(f.queries[0].params, [5]); assert.match(f.queries[0].sql, /created_at DESC, event_id DESC/);
  assert.ok(!JSON.stringify(f.replies[0]).includes(secret));
});
test('unrelated interactions pass through', async () => {
  const f = fixture({ id: 'other:button' });
  assert.equal(await handleConsoleBrowser(f.interaction, f.pool, config, guild), false); assert.equal(f.queries.length, 0);
});
