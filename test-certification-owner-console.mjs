import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';
import { handleContextualOwnerRecord } from './certification-owner-context.js';
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
  const payload = i.replies.at(-1); assert.match(payload.embeds[0].toJSON().fields[0].value, /Current-policy self-report recorded/); assert.equal(payload.components[2].toJSON().components[0].custom_id, `cert:enrollment:review:${learner}:enrollments:0`); assert.deepEqual(f.calls[0].params, [0]);
});
test('restricted queue preserves distinction between missing evidence and access status', async () => {
  const f = fixture([{ discord_user_id: learner, status: 'revoked' }]); const i = interaction('cert:console:section', ['restricted']); await f.route(i); assert.match(f.calls[0].sql, /suspended.*revoked/); const payload = i.replies.at(-1); assert.match(payload.embeds[0].toJSON().fields[0].value, /Status: revoked/); assert.match(payload.embeds[0].toJSON().fields[0].value, /review required/); assert.equal(payload.components[2].toJSON().components[0].custom_id, `cert:students:detail:${learner}:restricted:0`);
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
test('queue to record to refresh and back preserves section and page', async () => {
  for (const view of ['directory', 'restricted']) {
    const f = fixture([{ discord_user_id: learner, status: 'revoked' }]); const queue = interaction(`cert:console:${view}:3`); await f.route(queue);
    const detailId = queue.replies[0].components[2].toJSON().components[0].custom_id; assert.equal(detailId, `cert:students:detail:${learner}:${view}:3`); assert.ok(detailId.length <= 100);
    const record = interaction(detailId); await f.route(record); assert.deepEqual(f.calls.at(-1).params, [learner]); const payload = record.replies[0]; assert.equal(record.options.flags, 64); assert.deepEqual(payload.allowedMentions, { parse: [] });
    const controls = payload.components.flatMap(row => row.toJSON().components); const back = controls.find(control => control.custom_id === `cert:console:${view}:3`); assert.ok(back); assert.match(back.label, /page 4/); assert.ok(controls.some(control => control.custom_id === detailId));
    const refreshed = interaction(detailId); await f.route(refreshed); assert.ok(refreshed.replies[0].components.flatMap(row => row.toJSON().components).some(control => control.custom_id === `cert:console:${view}:3`));
    await f.route(interaction(back.custom_id)); assert.deepEqual(f.calls.at(-1).params, [15]); assert.ok(f.calls.every(call => call.sql.startsWith('SELECT')));
  }
});
test('contextual detail cannot bypass owner or guild checks', async () => {
  for (const [actor, server, enabled] of [[learner, guild, true], [owner, learner, true], [owner, guild, false]]) { const f = fixture([{ discord_user_id: learner, status: 'revoked' }]); f.config.enabled = enabled; const i = interaction(`cert:students:detail:${learner}:restricted:2`, null, actor, server); await f.route(i); assert.equal(f.calls.length, 0); assert.equal(i.replies[0].embeds.length, 0); }
});
test('malformed contextual detail is rejected before querying a learner', async () => {
  for (const suffix of ['directory:-1', 'restricted:1000000', 'labs:0', 'directory:2:extra']) { const f = fixture(); const i = interaction(`cert:students:detail:${learner}:${suffix}`); await f.route(i); assert.equal(f.calls.length, 0); assert.match(i.replies[0].content, /Invalid/); }
});
test('pending review and cancel retain original queue page without approval writes', async () => {
  const row = { discord_user_id: learner, status: 'pending', signature_method: 'typed_name', acknowledgment_name: 'Fixture Learner', agreement_version: 'fixture', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date(), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION };
  const f = fixture([row]); const queue = interaction('cert:console:enrollments:2'); await f.route(queue); const reviewId = queue.replies[0].components[2].toJSON().components[0].custom_id; assert.equal(reviewId, `cert:enrollment:review:${learner}:enrollments:2`);
  const review = interaction(reviewId); await f.route(review); assert.equal(review.options.flags, 64); const controls = review.replies[0].components.flatMap(r => r.toJSON().components);
  assert.ok(controls.some(c => c.custom_id === `cert:enrollment:approve:${learner}:enrollments:2` && c.disabled === false));
  const cancel = controls.find(c => c.label === 'Cancel and return to queue'); assert.equal(cancel.custom_id, 'cert:console:enrollments:2');
  const detail = controls.find(c => c.label === 'View learner record'); assert.equal(detail.custom_id, `cert:students:detail:${learner}:enrollments:2`);
  const record = interaction(detail.custom_id); await f.route(record); assert.ok(record.replies[0].components.flatMap(r => r.toJSON().components).some(c => c.custom_id === reviewId));
  await f.route(interaction(cancel.custom_id)); assert.deepEqual(f.calls.at(-1).params, [10]); assert.ok(f.calls.every(c => c.sql.startsWith('SELECT')));
});
test('contextual review still denies non-owner, foreign guild and disabled configuration', async () => {
  for (const [actor, server, enabled] of [[learner, guild, true], [owner, learner, true], [owner, guild, false]]) { const f = fixture([{ status: 'pending' }]); f.config.enabled = enabled; const i = interaction(`cert:enrollment:review:${learner}:enrollments:1`, null, actor, server); await f.route(i); assert.equal(f.calls.length, 0); assert.equal(i.replies[0].components.length, 0); }
});
test('contextual approval forwards unchanged target and preserves navigation on success replies', async () => {
  for (const content of ['Enrollment approved. Permanent student ID: NG-PT-fixture.', 'Already approved. Permanent student ID: NG-PT-fixture.']) {
    const i = interaction(`cert:enrollment:approve:${learner}:enrollments:2`); let calls = 0;
    await handleContextualOwnerRecord(i, async forwarded => { calls++; assert.equal(forwarded.customId, `cert:enrollment:approve:${learner}`); assert.equal(forwarded.user.id, owner); assert.equal(forwarded.guildId, guild); await forwarded.deferReply({ flags: 64 }); await forwarded.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } }); return true; });
    assert.equal(calls, 1); assert.equal(i.replies[0].content, content); const controls = i.replies[0].components[0].toJSON().components; assert.equal(controls[0].custom_id, 'cert:console:enrollments:2'); assert.equal(controls[1].custom_id, `cert:students:detail:${learner}:enrollments:2`); assert.equal(i.options.flags, 64);
  }
});
test('contextual approval cannot bypass owner/guild checks or decorate denial as success', async () => {
  for (const [actor, server, enabled] of [[learner, guild, true], [owner, learner, true], [owner, guild, false]]) { const f = fixture(); f.config.enabled = enabled; const i = interaction(`cert:enrollment:approve:${learner}:enrollments:2`, null, actor, server); await f.route(i); assert.equal(f.calls.length, 0); assert.equal(i.replies[0].components.length, 0); assert.match(i.replies[0].content, /Owner authorization/); }
  const i = interaction(`cert:enrollment:approve:${learner}:enrollments:2`); await handleContextualOwnerRecord(i, async forwarded => { await forwarded.editReply({ content: 'Approval outcome unconfirmed.', components: [] }); return true; }); assert.equal(i.replies[0].components.length, 0);
});
