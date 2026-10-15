import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
async function render({ id = `cert:students:detail:${student}`, actor = owner, guildId = guild, enabled = true, rows = [{ discord_user_id: student, student_id: 'NG-TEST', status: 'pending', age_eligible: true, signature_method: 'discord_account' }] } = {}) {
  const replies = [], queries = [];
  const pool = { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql, params }); return { rows }; }, connect() { assert.fail('No student inspection mutations'); } };
  await createCertificationRouter(pool, { enabled, ownerId: owner }, guild)({ customId: id, user: { id: actor }, guildId,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); }, async reply(payload) { replies.push(payload); }, async editReply(payload) { replies.push(payload); } });
  return { payload: replies[0], queries };
}
test('student detail displays declarations and retains existing access controls', async () => {
  const { payload, queries } = await render();
  assert.deepEqual(queries[0].params, [student]);
  const embed = payload.embeds[0].toJSON(), controls = payload.components.flatMap(row => row.toJSON().components);
  assert.match(JSON.stringify(embed), /Age 18\+: Yes/); assert.match(embed.description, /not independent/);
  for (const id of [`cert:access:deny:${student}`, `cert:enrollment:review:${student}`, `cert:student-audit:${student}:0`]) assert.ok(controls.some(control => control.custom_id === id));
  assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length); assert.ok(payload.components.length <= 5);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
});
for (const options of [{ actor: student }, { guildId: null }, { enabled: false }, { id: 'cert:students:detail:invalid' }, { id: `cert:student-audit:${student}:10001` }]) {
  test(`student view rejects invalid context/input ${JSON.stringify(options)}`, async () => {
    const { payload, queries } = await render(options); assert.equal(queries.length, 0); assert.equal(payload.flags, 64);
  });
}
test('missing student returns navigation without private fields', async () => {
  const { payload } = await render({ rows: [] }); assert.match(payload.content, /not found/); assert.equal(payload.embeds.length, 0);
});
for (const page of [0, 1]) {
  test(`student timeline page ${page} scopes query and has unique controls`, async () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ event_id: String(i + 1), action: 'lab_request_denied', actor_discord_user_id: owner, details: { secret: 'HIDDEN-DETAILS' } }));
    const { payload, queries } = await render({ id: `cert:student-audit:${student}:${page}`, rows });
    assert.match(queries[0].sql, /WHERE subject_discord_user_id=\$1/); assert.deepEqual(queries[0].params, [student, page * 5]);
    const embed = payload.embeds[0].toJSON(), controls = payload.components.flatMap(row => row.toJSON().components);
    assert.equal(embed.fields.length, 5); assert.ok(!JSON.stringify(payload).includes('HIDDEN-DETAILS'));
    assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
    assert.equal(controls.find(control => control.label === 'Previous').disabled, page === 0);
  });
}
