import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabActionHandler, buildLabActionControls } from './certification-lab-actions.js';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const request = '00000000-0000-4000-8000-000000000001', config = { enabled: true, ownerId: owner };
function fixture(status = 'pending') {
  const queries = [], writes = []; let clock = 0;
  const pool = { async query(sql, params) { queries.push({ sql, params }); return { rows: [{ request_id: request, discord_user_id: student, status }] }; } };
  const service = { async changeLabStatus(...args) { writes.push(args); return { requestId: request, status: args[2] === 'deny' ? 'denied' : 'revoked', alreadyApplied: false, sessionTerminationRequired: args[2] === 'revoke' }; } };
  const options = { now: () => clock, service };
  const handler = createLabActionHandler(pool, config, guild, options);
  async function send(id, { modal = false, actor = owner, guildId = guild, reason = 'Owner reason' } = {}) {
    const replies = [], modals = [];
    const interaction = { customId: id, user: { id: actor }, guildId, isButton: () => !modal, isModalSubmit: () => modal,
      fields: { getTextInputValue: () => reason }, async reply(payload) { replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); }, async editReply(payload) { replies.push(payload); }, async showModal(payload) { modals.push(payload); } };
    await handler(interaction); return { replies, modals, interaction };
  }
  return { handler, send, pool, options, writes, queries, setClock(value) { clock = value; } };
}
for (const [action, status] of [['deny', 'pending'], ['revoke', 'approved']]) {
  test(`${action} requires reason and separate confirmation before service call`, async () => {
    const f = fixture(status), id = `cert:labact:${action}:${request}`;
    const opened = await f.send(id); assert.equal(opened.modals.length, 1); assert.equal(f.queries.length, 0);
    const preview = await f.send(id, { modal: true });
    assert.equal(f.writes.length, 0); assert.match(preview.replies[0].content, new RegExp(student));
    const confirm = preview.replies[0].components[0].components[0].custom_id;
    const result = await f.send(confirm); assert.deepEqual(f.writes[0], [owner, request, action, 'Owner reason']);
    assert.deepEqual(result.replies[0].allowedMentions, { parse: [] });
    if (action === 'revoke') assert.match(result.replies[0].content, /did not terminate/);
    await f.send(confirm); assert.equal(f.writes.length, 1);
  });
}
test('cancel consumes confirmation without changing authorization', async () => {
  const f = fixture(), preview = await f.send(`cert:labact:deny:${request}`, { modal: true });
  await f.send(preview.replies[0].components[0].components[1].custom_id); assert.equal(f.writes.length, 0);
});
test('confirmation expires after five minutes', async () => {
  const f = fixture(), preview = await f.send(`cert:labact:deny:${request}`, { modal: true }); f.setClock(300000);
  const result = await f.send(preview.replies[0].components[0].components[0].custom_id);
  assert.equal(f.writes.length, 0); assert.match(result.replies[0].content, /expired/);
});
test('restart invalidates pending confirmation', async () => {
  const f = fixture(), preview = await f.send(`cert:labact:deny:${request}`, { modal: true });
  const interaction = { customId: preview.replies[0].components[0].components[0].custom_id, user: { id: owner }, guildId: guild, isButton: () => true, async reply(payload) { assert.match(payload.content, /restart/); } };
  await createLabActionHandler(f.pool, config, guild, f.options)(interaction); assert.equal(f.writes.length, 0);
});
for (const options of [{ actor: student }, { guildId: null }]) {
  test(`unauthorized action cannot open a form or query ${JSON.stringify(options)}`, async () => {
    const f = fixture(), result = await f.send(`cert:labact:deny:${request}`, options);
    assert.equal(result.modals.length, 0); assert.equal(f.queries.length, 0); assert.equal(f.writes.length, 0);
  });
}
test('empty reason and stale status do not create confirmations', async () => {
  const f = fixture('approved');
  await f.send(`cert:labact:deny:${request}`, { modal: true, reason: ' ' }); assert.equal(f.queries.length, 0);
  const result = await f.send(`cert:labact:deny:${request}`, { modal: true }); assert.equal(result.replies[0].components.length, 0);
});
test('controls expose only status-appropriate actions', () => {
  assert.match(buildLabActionControls(request, 'pending')[0].components[0].custom_id, /:deny:/);
  for (const status of ['approved', 'suspended']) assert.match(buildLabActionControls(request, status)[0].components[0].custom_id, /:revoke:/);
  for (const status of ['denied', 'revoked', 'expired']) assert.deepEqual(buildLabActionControls(request, status), []);
});
test('router lab detail exposes denial without performing a write', async () => {
  const f = fixture(), replies = [];
  await createCertificationRouter(f.pool, config, guild)({ customId: `cert:labview:detail:${request}`, user: { id: owner }, guildId: guild,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false, async deferReply() {}, async editReply(payload) { replies.push(payload); } });
  assert.ok(replies[0].components.flatMap(row => row.components).some(component => component.custom_id === `cert:labact:deny:${request}`));
  assert.equal(f.writes.length, 0);
});
