import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';
import { CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';
const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887956';
function fixture(rows = [], counts = {}) {
  const calls = []; const config = { enabled: true, ownerId: owner };
  const pool = { async query(sql, params) { calls.push({ sql, params }); return { rows: sql.includes('COUNT(*)') ? [counts] : rows }; } };
  return { calls, config, route: createCertificationRouter(pool, config, guild) };
}
function interaction(id = 'cert:admin:overview:0', values = null, actor = owner, server = guild) {
  return { customId: id, values, user: { id: actor }, guildId: server, replies: [], isButton: () => values === null, isModalSubmit: () => false, isStringSelectMenu: () => values !== null, async deferReply(options) { this.options = options; }, async reply(payload) { this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); } };
}
test('legacy dashboard entry opens metrics and a five-section dropdown privately', async () => {
  const f = fixture([], { pending_enrollments: '4', approved_enrollments: '2', suspended_enrollments: '1', revoked_enrollments: '0', awaiting_acknowledgment: '3', pending_labs: '5' }); const i = interaction(); await f.route(i);
  const payload = i.replies.at(-1); const embed = payload.embeds[0].toJSON(); const dropdown = payload.components[0].toJSON().components[0];
  assert.equal(i.options.flags, 64); assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.equal(dropdown.type, 3); assert.equal(dropdown.options.length, 5); assert.equal(embed.fields.find(x => x.name === 'Pending enrollments').value, '4'); assert.match(embed.fields.at(-1).value, /remain separate/); assert.ok(f.calls.every(x => x.sql.startsWith('SELECT')));
});
test('dropdown enrollment queue shows evidence and wired review controls', async () => {
  const f = fixture([{ discord_user_id: learner, status: 'pending', agreement_version: 'fixture', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date(), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION }]); const i = interaction('cert:console:section', ['enrollments']); await f.route(i);
  const payload = i.replies.at(-1); assert.match(payload.embeds[0].toJSON().fields[0].value, /Current-policy self-report recorded/); assert.equal(payload.components[2].toJSON().components[0].custom_id, `cert:enrollment:review:${learner}`); assert.deepEqual(f.calls[0].params, [0]);
});
test('restricted queue preserves distinction between missing evidence and access status', async () => {
  const f = fixture([{ discord_user_id: learner, status: 'revoked' }]); const i = interaction('cert:console:section', ['restricted']); await f.route(i); assert.match(f.calls[0].sql, /suspended.*revoked/); const payload = i.replies.at(-1); assert.match(payload.embeds[0].toJSON().fields[0].value, /Status: revoked/); assert.match(payload.embeds[0].toJSON().fields[0].value, /review required/); assert.equal(payload.components[2].toJSON().components[0].custom_id, `cert:students:detail:${learner}`);
});
test('forged selections, non-owner, foreign guild and disabled console do not query', async () => {
  for (const [values, actor, server, enabled] of [[['invalid'], owner, guild, true], [['overview','labs'], owner, guild, true], [['overview'], learner, guild, true], [['overview'], owner, learner, true], [['overview'], owner, guild, false]]) { const f = fixture(); f.config.enabled = enabled; const i = interaction('cert:console:section', values, actor, server); await f.route(i); assert.equal(f.calls.length, 0); assert.equal(i.replies.at(-1).components.length, 0); }
});
test('pagination renders only five records, enables lookahead and bounds parameters', async () => {
  const rows = Array.from({ length: 6 }, () => ({ discord_user_id: learner, status: 'pending' })); const f = fixture(rows); const i = interaction('cert:console:directory:2'); await f.route(i); const payload = i.replies.at(-1); assert.equal(payload.embeds[0].toJSON().fields.length, 5); assert.equal(payload.components[1].toJSON().components[2].disabled, false); assert.deepEqual(f.calls[0].params, [10]);
});
test('empty lab queue offers no approval or provider controls', async () => {
  const f = fixture(); const i = interaction('cert:console:section', ['labs']); await f.route(i); const payload = i.replies.at(-1); assert.match(payload.embeds[0].toJSON().description, /No records/); assert.equal(payload.components.length, 2); assert.equal(payload.components[1].toJSON().components[2].disabled, true); assert.ok(f.calls.every(x => x.sql.startsWith('SELECT')));
});
test('missing counts are unavailable, not fabricated zeroes', async () => {
  const f = fixture(); const i = interaction(); await f.route(i); assert.equal(i.replies.at(-1).embeds[0].toJSON().fields[0].value, 'Unavailable');
});
