import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnrollmentStatus } from './certification-enrollment-status.js';
import { CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';

const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887956';
const config = { enabled: true, ownerId: owner };
const evidence = { age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date('2026-10-13T18:00:00Z'), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION };
function fixture(row, actor = owner, target = learner, server = guild) {
  const calls = []; const replies = [];
  const pool = { async query(sql, params) { calls.push({ sql, params }); return { rows: row ? [row] : [] }; } };
  const interaction = { customId: target ? `cert:submit:status:${target}` : 'cert:submit:status', user: { id: actor }, guildId: server, isButton: () => true, async deferReply(options) { this.options = options; }, async editReply(payload) { replies.push(payload); } };
  return { calls, replies, interaction, async run() { return handleEnrollmentStatus(interaction, pool, config, guild); } };
}
test('owner sees current self-report evidence without restoring suspended or revoked access', async () => {
  for (const status of ['suspended', 'revoked']) {
    const f = fixture({ status, student_id: 'NG-PT-fixture', ...evidence }); await f.run();
    const reply = f.replies.at(-1); assert.match(reply.content, /Current-policy self-reported confirmation recorded/); assert.match(reply.content, /not independent age verification/); assert.match(reply.content, /Owner reinstatement remains separate/); assert.match(reply.content, new RegExp(`Enrollment status: ${status}`));
    assert.equal(f.interaction.options.flags, 64); assert.deepEqual(reply.allowedMentions, { parse: [] }); assert.deepEqual(f.calls[0].params, [learner]); assert.ok(f.calls.every(c => c.sql.startsWith('SELECT ')));
    assert.ok(!reply.content.includes('2026-10-13') && !reply.content.includes(CERTIFICATION_AGE_POLICY_VERSION));
  }
});
test('owner evidence view rejects missing, malformed, and outdated evidence', async () => {
  for (const change of [{ age_eligibility_confirmed: null }, { age_eligibility_confirmed: false }, { age_eligibility_confirmed_at: 'invalid' }, { age_policy_version: 'retired-policy' }]) {
    const f = fixture({ status: 'pending', student_id: null, ...evidence, ...change }); await f.run();
    assert.match(f.replies.at(-1).content, /Missing, invalid, or outdated; owner review required/); assert.ok(!f.replies.at(-1).content.includes('Current-policy self-reported confirmation recorded'));
  }
});
test('learner own-status query does not select or display eligibility metadata', async () => {
  const f = fixture({ status: 'suspended', student_id: 'NG-PT-fixture', ...evidence }, learner, null); await f.run();
  assert.equal(f.calls[0].sql, 'SELECT status, student_id FROM certification_enrollments WHERE discord_user_id=$1'); assert.deepEqual(f.calls[0].params, [learner]); assert.ok(!f.replies.at(-1).content.includes('Age eligibility evidence'));
});
test('foreign learner and foreign guild cannot query specified learner eligibility', async () => {
  for (const [actor, server] of [[learner, guild], [owner, '1339276399390887957']]) {
    const f = fixture({ status: 'suspended', ...evidence }, actor, learner, server); await f.run(); assert.equal(f.calls.length, 0); assert.ok(!f.replies.at(-1).content.includes('Age eligibility evidence'));
  }
});
test('missing record and unknown status do not claim confirmed evidence', async () => {
  for (const row of [null, { status: 'unrecognized', ...evidence }]) { const f = fixture(row); await f.run(); assert.ok(!f.replies.at(-1).content.includes('Current-policy self-reported confirmation recorded')); }
});
