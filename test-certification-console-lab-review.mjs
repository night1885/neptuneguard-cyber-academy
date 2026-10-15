import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '100000000000000001', student = '100000000000000002', guild = '100000000000000003';
const request = '00000000-0000-4000-8000-000000000001';
const config = { enabled: true, ownerId: owner };
const json = item => typeof item?.toJSON === 'function' ? item.toJSON() : item;
const sample = { request_id: request, discord_user_id: student, lab_key: 'fixture-lab', status: 'pending',
  rules_version: 'fixture-rules', rules_acknowledged_at: new Date('2026-01-01T00:00:00Z'),
  enrollment_discord_user_id: student, enrollment_status: 'pending' };
function fixture({ records = [sample], actor = owner, guildId = guild, enabled = true, privateSource = true } = {}) {
  const queries = [], calls = []; let payload;
  const pool = { async query(sql, params) { assert.match(sql.trim(), /^SELECT\b/); queries.push({ sql, params }); return { rows: records }; },
    async connect() { assert.fail('No write transaction permitted'); } };
  const route = createCertificationRouter(pool, { ...config, enabled }, guild);
  const message = { flags: { has: () => privateSource } };
  return { queries, calls, get payload() { return payload; }, async run(id) {
    return route({ customId: id, message, user: { id: actor }, guildId,
      isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
      async deferUpdate() { calls.push('update'); },
      async deferReply(options) { assert.equal(options.flags, 64); calls.push('deferReply'); },
      async reply(value) { calls.push('reply'); payload = value; },
      async editReply(value) { calls.push('edit'); payload = value; },
      client: { users: { async fetch() { assert.fail('No learner notifications permitted'); } } }
    });
  } };
}
const items = f => f.payload.components.flatMap(item => json(item).components);
test('lab detail exposes Review prerequisites without adding an approval action', async () => {
  const f = fixture(); await f.run(`cert:labview:detail:${request}`);
  assert.deepEqual(f.calls, ['update', 'edit']);
  assert.ok(items(f).some(item => item.custom_id === `cert:labview:review:${request}`));
  assert.ok(!items(f).some(item => /approve/.test(item.custom_id)));
  assert.ok(f.payload.components.every(item => json(item).components.length <= 5));
});
test('review reads linked metadata in one parameterized SELECT and stays in place', async () => {
  const f = fixture(); await f.run(`cert:labview:review:${request}`);
  assert.deepEqual(f.calls, ['update', 'edit']); assert.equal(f.queries.length, 1);
  assert.deepEqual(f.queries[0].params, [request]);
  assert.match(f.queries[0].sql, /LEFT JOIN certification_enrollments/);
  assert.match(f.queries[0].sql, /CASE WHEN e.acknowledgment_name IS NULL THEN NULL ELSE 'present' END/);
  assert.match(f.queries[0].sql, /CASE WHEN e.signature_reference IS NULL THEN NULL ELSE 'present' END/);
  assert.ok(!/SELECT\s+\*/i.test(f.queries[0].sql));
  assert.ok(!/r\.scope|status_reason/.test(f.queries[0].sql));
  assert.match(json(f.payload.embeds[0]).description, /not an approval decision/);
  assert.deepEqual(f.payload.allowedMentions, { parse: [] });
  assert.equal(json(f.payload.embeds[0]).color, 0xf1c40f);
  const controls = items(f); assert.equal(new Set(controls.map(item => item.custom_id)).size, controls.length);
  assert.ok(controls.some(item => item.label === 'Back to request'));
  assert.ok(controls.some(item => item.label === 'Refresh review'));
  assert.ok(controls.every(item => !item.custom_id.startsWith('cert:labact:')));
});
for (const options of [{ actor: student }, { guildId: null }, { enabled: false }]) {
  test(`review rejects unauthorized context ${JSON.stringify(options)} before SQL`, async () => {
    const f = fixture(options); await f.run(`cert:labview:review:${request}`);
    assert.equal(f.queries.length, 0); assert.deepEqual(f.calls, ['reply']); assert.equal(f.payload.flags, 64);
  });
}
test('malformed review UUID is rejected before SQL', async () => {
  const f = fixture(); await f.run('cert:labview:review:invalid');
  assert.equal(f.queries.length, 0); assert.deepEqual(f.calls, ['reply']);
});
test('missing request leaves read-only back navigation in the same message', async () => {
  const f = fixture({ records: [] }); await f.run(`cert:labview:review:${request}`);
  assert.deepEqual(f.calls, ['update', 'edit']); assert.match(f.payload.content, /not found/);
  assert.deepEqual(f.payload.embeds, []); assert.ok(items(f).some(item => item.label === 'Back to request'));
});
test('public-source review retains private reply fallback', async () => {
  const f = fixture({ privateSource: false }); await f.run(`cert:labview:review:${request}`);
  assert.deepEqual(f.calls, ['deferReply', 'edit']);
});
test('mismatched enrollment data is not presented as the request learner', async () => {
  const f = fixture({ records: [{ ...sample, enrollment_discord_user_id: owner, enrollment_status: 'approved', student_id: 'NG-OTHER' }] });
  await f.run(`cert:labview:review:${request}`);
  assert.match(json(f.payload.embeds[0]).fields.find(item => item.name === 'Linked enrollment').value, /not found/);
});
