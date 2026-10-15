import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '1223123544301633567', guild = '1330353166830665859';
async function render({ actor = owner, guildId = guild, enabled = true, submissions = false, counts = {} } = {}) {
  const queries = [], replies = [];
  const pool = { async query(sql) { assert.match(sql, /^SELECT/); queries.push(sql); return { rows: [counts] }; }, connect() { assert.fail('Overview must not start transactions'); } };
  const interaction = { customId: 'cert:admin:overview:0', user: { id: actor }, guildId,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async deferReply(options) { assert.equal(options.flags, 64); },
    async editReply(payload) { replies.push(payload); } };
  await createCertificationRouter(pool, { enabled, ownerId: owner, enrollmentSubmissionEnabled: submissions }, guild)(interaction);
  return { queries, payload: replies[0] };
}
test('overview displays aggregate counts and operational boundaries', async () => {
  const { queries, payload } = await render({ counts: { total_students: '11', pending_enrollments: '2', enrolled_students: '3', pending_labs: '4', current_lab_authorizations: '5', declaration_review_candidates: '6', audit_events: '7' } });
  assert.equal(queries.length, 1);
  assert.match(queries[0], /COUNT\(\*\) FILTER/);
  const embed = payload.embeds[0].toJSON(), text = JSON.stringify(embed);
  assert.match(embed.description, /Pending enrollments: 2/);
  assert.match(text, /Total: 11/); assert.match(text, /time window: 5/);
  assert.match(text, /declaration: 6/); assert.match(text, /audit events: 7/);
  assert.match(text, /not running provider sessions/); assert.match(text, /Disabled/);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
});
test('overview routes status shortcuts and utility controls without duplicate IDs', async () => {
  const { payload } = await render();
  const rows = payload.components.map(row => row.toJSON()), controls = rows.flatMap(row => row.components);
  for (const status of ['pending', 'approved', 'suspended', 'revoked']) assert.ok(controls.some(control => control.custom_id === `cert:dir:${status}:0:`));
  for (const id of ['cert:console:settings', 'cert:dir:search', 'cert:audit:0']) assert.ok(controls.some(control => control.custom_id === id));
  assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
  assert.ok(rows.length <= 5); assert.ok(rows.every(row => row.components.length <= 5));
});
for (const scenario of [{ actor: '1223123544301633568' }, { guildId: null }, { enabled: false }]) {
  test(`overview denies access before querying ${JSON.stringify(scenario)}`, async () => {
    const { queries, payload } = await render(scenario); assert.equal(queries.length, 0); assert.equal(payload.embeds.length, 0);
  });
}
test('submission flag is explicit and does not imply provider readiness', async () => {
  const { payload } = await render({ submissions: true });
  const text = JSON.stringify(payload.embeds[0].toJSON());
  assert.match(text, /submissions: Enabled/); assert.match(text, /does not test provider health/);
});
