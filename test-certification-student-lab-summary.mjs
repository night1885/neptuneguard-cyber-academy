import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleStudent } from './certification-console-student.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
async function render({ status = 'approved', counts = {}, missing = false, actor = owner, enabled = true, guildId = guild, audit = false } = {}) {
  const queries = [], replies = [];
  const pool = { async query(sql, params) {
    assert.match(sql, /^SELECT/); queries.push({ sql, params });
    if (sql.includes('FROM certification_lab_requests')) return { rows: [counts] };
    if (audit || missing) return { rows: [] };
    return { rows: [{ discord_user_id: student, student_id: 'NG-FIXTURE', status }] };
  }, connect() { assert.fail('Inspection must not begin a mutation transaction'); } };
  await handleConsoleStudent({ customId: audit ? `cert:student-audit:${student}:0` : `cert:students:detail:${student}`, user: { id: actor }, guildId, isButton: () => true,
    async deferReply(value) { assert.equal(value.flags, 64); }, async reply(value) { replies.push(value); }, async editReply(value) { replies.push(value); }
  }, pool, { enabled, ownerId: owner }, guild);
  return { queries, payload: replies[0] };
}
for (const status of ['awaiting_acknowledgment', 'pending', 'approved', 'denied', 'suspended', 'revoked']) {
  test(`student ${status} shows scoped authorization totals without changing controls`, async () => {
    const { queries, payload } = await render({ status, counts: { total: '12', pending: '2', approved: '5', within_window: '3', elapsed_approved: '1', revoked: '2', expired: '1' } });
    assert.equal(queries.length, 2); assert.deepEqual(queries[1].params, [student]);
    assert.match(queries[1].sql, /FROM certification_lab_requests WHERE discord_user_id=\$1/);
    assert.match(queries[1].sql, /starts_at <= NOW\(\) AND expires_at > NOW\(\)/);
    assert.match(queries[1].sql, /status='approved' AND expires_at <= NOW\(\)/);
    const summary = payload.embeds[0].toJSON().fields.find(field => field.name === 'This student — lab authorization records');
    for (const text of ['Total requests: 12', 'Pending: 2', 'Approved records: 5', 'Within recorded time window: 3', 'Approved but elapsed: 1', 'Revoked: 2', 'Stored expired status: 1', 'not running sessions', 'not running sessions or a full eligibility decision']) assert.ok(summary.value.includes(text));
    const expected = { pending: ['deny'], approved: ['suspend', 'revoke'], suspended: ['revoke', 'reinstate'], revoked: ['reinstate'] }[status] || [];
    const controls = payload.components.flatMap(row => row.toJSON().components);
    assert.deepEqual(controls.filter(control => control.custom_id.startsWith('cert:access:')).map(control => control.custom_id.split(':')[2]), expected);
    assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
    assert.ok(payload.components.length <= 5); assert.deepEqual(payload.allowedMentions, { parse: [] });
  });
}
test('zero totals are displayed without granting lab access', async () => {
  const { payload } = await render();
  const summary = payload.embeds[0].toJSON().fields.at(-1).value;
  assert.match(summary, /Total requests: 0/); assert.match(summary, /Within recorded time window: 0/);
});
for (const options of [{ actor: student }, { enabled: false }, { guildId: null }]) {
  test(`unauthorized summary performs no queries ${JSON.stringify(options)}`, async () => {
    const { queries, payload } = await render(options); assert.equal(queries.length, 0); assert.equal(payload.flags, 64);
  });
}
for (const options of [{ missing: true }, { audit: true }]) {
  test(`no unnecessary lab query for ${JSON.stringify(options)}`, async () => {
    const { queries } = await render(options); assert.equal(queries.length, 1); assert.ok(!queries[0].sql.includes('certification_lab_requests'));
  });
}
