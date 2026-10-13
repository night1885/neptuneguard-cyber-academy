import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';
import { CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';
const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887956';
const row = { discord_user_id: learner, student_id: 'NG-PT-fixture', status: 'suspended', signature_method: 'typed_name', acknowledgment_name: 'Private Fixture Name', agreement_version: 'fixture-v1', comprehension_check_version: 'fixture-check', acknowledged_at: new Date('2026-10-13T18:00:00Z'), learner_confirmed_read_at: new Date(), comprehension_passed_at: new Date(), approved_by: owner, approved_at: new Date('2026-10-13T18:01:00Z'), age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date(), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION };
async function run(record = row, actor = owner, server = guild, enabled = true) {
  const calls = []; const replies = []; const pool = { async query(sql, params) { calls.push({ sql, params }); return { rows: record ? [record] : [] }; }, async connect() { assert.fail('Detail view cannot checkout a write connection'); } };
  const i = { customId: `cert:students:detail:${learner}`, user: { id: actor }, guildId: server, isButton: () => true, isModalSubmit: () => false, async deferReply(options) { this.options = options; }, async editReply(payload) { replies.push(payload); } };
  await createCertificationRouter(pool, { enabled, ownerId: owner }, guild)(i); return { calls, replies, i };
}
test('owner learner panel groups evidence, stays private and preserves restriction controls', async () => {
  const f = await run(); const payload = f.replies[0]; const embed = payload.embeds[0].toJSON(); const text = JSON.stringify(embed);
  assert.equal(f.i.options.flags, 64); assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.equal(embed.fields.length, 6); assert.match(text, /Current-policy self-reported confirmation recorded/); assert.match(text, /Enrollment remains restricted/); assert.match(text, /not independent age verification/); assert.ok(!text.includes('Private Fixture Name'));
  assert.deepEqual(f.calls[0].params, [learner]); assert.ok(f.calls.every(c => c.sql.startsWith('SELECT')));
  const controls = payload.components.flatMap(r => r.toJSON().components).map(c => c.custom_id); assert.ok(controls.includes(`cert:students:detail:${learner}`)); assert.ok(controls.includes(`cert:submit:status:${learner}`)); assert.ok(controls.includes('cert:console:directory:0'));
});
test('missing evidence and invalid approval timestamp are not displayed as current or approved', async () => {
  const f = await run({ ...row, acknowledgment_name: '', age_policy_version: 'retired', approved_at: 'invalid' }); const text = JSON.stringify(f.replies[0].embeds[0].toJSON()); assert.match(text, /Incomplete/); assert.match(text, /Missing, invalid or outdated/); assert.match(text, /Not recorded or invalid/); assert.ok(!text.includes('Current-policy self-reported confirmation recorded'));
});
test('non-owner, wrong guild and disabled detail routes cannot query evidence', async () => {
  for (const [actor, server, enabled] of [[learner, guild, true], [owner, learner, true], [owner, guild, false]]) { const f = await run(row, actor, server, enabled); assert.equal(f.calls.length, 0); assert.equal(f.replies[0].embeds.length, 0); }
});
test('missing, mismatched and unknown-status records do not expose evidence or action controls', async () => {
  for (const record of [null, { ...row, discord_user_id: owner }, { ...row, status: 'unknown' }]) { const f = await run(record); assert.equal(f.replies[0].embeds.length, 0); const controls = f.replies[0].components.flatMap(r => r.toJSON().components); assert.ok(!controls.some(c => c.custom_id?.startsWith('cert:access:'))); }
});
