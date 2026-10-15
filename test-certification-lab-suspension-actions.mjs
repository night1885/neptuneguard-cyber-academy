import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabActionHandler, buildLabActionControls } from './certification-lab-actions.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const request = '00000000-0000-4000-8000-000000000001', id = `cert:labact:suspend:${request}`;
function fixture(status = 'approved', enabled = true) {
  const queries = [], writes = []; let clock = 0;
  const pool = { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql,params }); return { rows: [{ request_id: request,discord_user_id: student,status }] }; } };
  const options = { now: () => clock, service: { async changeLabStatus(...args) { writes.push(args); return { requestId: request,status: 'suspended',alreadyApplied: false,sessionTerminationRequired: true }; } } };
  const handler = createLabActionHandler(pool, { enabled,ownerId: owner }, guild, options);
  async function send(customId, { modal = false, actor = owner, guildId = guild, reason = 'Suspension review' } = {}, target = handler) {
    const replies = [], modals = [];
    await target({ customId,user: { id: actor },guildId,isButton: () => !modal,isModalSubmit: () => modal,fields: { getTextInputValue: () => reason },
      async reply(value) { replies.push(value); },async deferReply(value) { assert.equal(value.flags,64); },async editReply(value) { replies.push(value); },async showModal(value) { modals.push(value); } });
    return { replies,modals };
  }
  return { handler,send,pool,options,queries,writes,setClock(value) { clock = value; } };
}
test('suspension opens a reason form then requires a separate single-use confirmation', async () => {
  const f = fixture(); const opened = await f.send(id);
  assert.equal(opened.modals[0].title,'Suspend lab authorization'); assert.equal(f.queries.length,0);
  const preview = await f.send(id,{ modal: true });
  assert.equal(f.writes.length,0); assert.deepEqual(f.queries[0].params,[request]);
  assert.ok(preview.replies[0].content.includes(student));
  assert.match(preview.replies[0].content,/Course enrollment and permanent student ID are unchanged/);
  assert.match(preview.replies[0].content,/No provider session will be launched or terminated/);
  const token = preview.replies[0].components[0].components[0].custom_id;
  const result = await f.send(token);
  assert.deepEqual(f.writes,[[owner,request,'suspend','Suspension review']]);
  assert.match(result.replies[0].content,/status: suspended/); assert.match(result.replies[0].content,/did not terminate a running session/);
  assert.deepEqual(result.replies[0].allowedMentions,{ parse: [] });
  await f.send(token); assert.equal(f.writes.length,1);
});
test('cancellation consumes suspension confirmation without a mutation', async () => {
  const f = fixture(), preview = await f.send(id,{ modal: true });
  const controls = preview.replies[0].components[0].components;
  await f.send(controls[1].custom_id); await f.send(controls[0].custom_id); assert.equal(f.writes.length,0);
});
test('suspension confirmation expires at five minutes', async () => {
  const f = fixture(), preview = await f.send(id,{ modal: true }); f.setClock(300000);
  const response = await f.send(preview.replies[0].components[0].components[0].custom_id);
  assert.match(response.replies[0].content,/expired/); assert.equal(f.writes.length,0);
});
for (const status of ['pending','suspended','denied','revoked','expired']) {
  test(`stale or ineligible ${status} cannot create suspension confirmation`, async () => {
    const f = fixture(status), response = await f.send(id,{ modal: true });
    assert.equal(response.replies[0].components.length,0); assert.equal(f.writes.length,0);
  });
}
for (const options of [{ actor: student },{ guildId: null },{ guildId: '1339276399390887956' }]) {
  test(`suspension action rejects unauthorized context ${JSON.stringify(options)}`, async () => {
    const f = fixture(), response = await f.send(id,options);
    assert.equal(response.modals.length,0); assert.equal(f.queries.length,0); assert.equal(f.writes.length,0);
  });
}
test('disabled suspension action and blank reason make no query or service call', async () => {
  const disabled = fixture('approved',false); await disabled.send(id); assert.equal(disabled.queries.length,0);
  const f = fixture(); await f.send(id,{ modal: true,reason: ' ' }); assert.equal(f.queries.length,0); assert.equal(f.writes.length,0);
});
test('restart invalidates suspension confirmation', async () => {
  const f = fixture(), preview = await f.send(id,{ modal: true });
  const restarted = createLabActionHandler(f.pool,{ enabled: true,ownerId: owner },guild,f.options);
  const response = await f.send(preview.replies[0].components[0].components[0].custom_id,{},restarted);
  assert.match(response.replies[0].content,/restart/); assert.equal(f.writes.length,0);
});
test('only approved lab records expose suspension and keep revocation available', () => {
  for (const status of ['pending','approved','denied','suspended','revoked','expired']) {
    const controls = buildLabActionControls(request,status).flatMap(row => row.components);
    assert.equal(controls.some(control => control.custom_id === id),status === 'approved');
    if (['approved','suspended'].includes(status)) assert.ok(controls.some(control => control.custom_id === `cert:labact:revoke:${request}`));
  }
});
