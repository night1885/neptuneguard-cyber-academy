import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleLabs } from './certification-console-labs.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const statuses = ['all','pending','approved','denied','suspended','revoked','expired'];
const request = '00000000-0000-4000-8000-000000000001';
async function render({ id = `cert:labview:student:${student}:all:0`, actor = owner, guildId = guild, enabled = true, rows = [] } = {}) {
  const queries = [], replies = [];
  await handleConsoleLabs({ customId: id, user: { id: actor }, guildId, isButton: () => true,
    async deferReply(payload) { assert.equal(payload.flags, 64); }, async reply(payload) { replies.push(payload); }, async editReply(payload) { replies.push(payload); }
  }, { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql, params }); return { rows }; }, connect() { assert.fail('Browser must not mutate'); } }, { enabled, ownerId: owner }, guild);
  return { queries, payload: replies[0] };
}
for (const status of statuses) for (const page of [0,1,10000]) for (const count of [0,6]) {
  test(`scoped labs ${status} page ${page} count ${count} preserve subject and filters`, async () => {
    const rows = Array.from({ length: count }, (_, index) => ({ request_id: `00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`, discord_user_id: student, status }));
    const { queries, payload } = await render({ id: `cert:labview:student:${student}:${status}:${page}`, rows });
    assert.equal(queries.length, 1); assert.deepEqual(queries[0].params, [student,status,page*5]);
    assert.match(queries[0].sql, /WHERE discord_user_id=\$1 AND \(\$2::text='all' OR status=\$2\)/);
    assert.match(queries[0].sql, /ORDER BY created_at DESC, request_id DESC LIMIT 6 OFFSET \$3/);
    const controls = payload.components.flatMap(row => row.components);
    assert.ok(controls.some(control => control.custom_id === `cert:students:detail:${student}`));
    assert.ok(controls.some(control => control.label === 'Refresh' && control.custom_id === `cert:labview:student:${student}:${status}:${page}`));
    for (const filter of statuses.filter(value => value !== status)) assert.ok(controls.some(control => control.custom_id === `cert:labview:student:${student}:${filter}:0`));
    assert.equal(controls.find(control => control.label === 'Previous').disabled, page === 0);
    assert.equal(controls.find(control => control.label === 'Next').disabled, count <= 5 || page === 10000);
    if (page > 0) assert.ok(controls.some(control => control.custom_id === `cert:labview:student:${student}:${status}:${page-1}`));
    if (count > 5 && page < 10000) assert.ok(controls.some(control => control.custom_id === `cert:labview:student:${student}:${status}:${page+1}`));
    assert.equal(payload.embeds[0].fields.length, Math.min(count,5));
    assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
    assert.ok(payload.components.length <= 5); assert.ok(payload.components.every(row => row.components.length <= 5));
    assert.ok(controls.every(control => control.custom_id.length <= 100));
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  });
}
for (const options of [{ actor: student },{ guildId: null },{ enabled: false },{ id: `cert:labview:student:${student}:all:10001` },{ id: 'cert:labview:student:invalid:all:0' },{ id: `cert:labview:student:${student}:invalid:0` }]) {
  test(`scoped labs reject invalid access or input ${JSON.stringify(options)}`, async () => {
    const { queries, payload } = await render(options); assert.equal(queries.length, 0); assert.equal(payload.flags, 64);
  });
}
test('lab detail exposes learner-scoped records without another query', async () => {
  const { queries, payload } = await render({ id: `cert:labview:detail:${request}`, rows: [{ request_id: request, discord_user_id: student, status: 'pending' }] });
  assert.equal(queries.length, 1);
  assert.ok(payload.components.flatMap(row => row.components).some(control => control.custom_id === `cert:labview:student:${student}:all:0`));
});
