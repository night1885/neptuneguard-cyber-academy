import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAccessControls, createAccessActionHandler } from './certification-access-actions.js';
import { createCertificationRouter } from './certification-router.js';
const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887956';
function interaction(id, modal = false, actor = owner, server = guild) {
  return { customId: id, user: { id: actor }, guildId: server, replies: [], modal: null, isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: () => 'Fixture reason' }, async showModal(builder) { this.modal = builder.toJSON(); }, async deferReply(options) { this.options = options; }, async reply(payload) { this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); } };
}
function fixture() {
  let connects = 0; let clock = 0; const calls = []; const config = { enabled: true, ownerId: owner };
  const pool = { async query(sql, params) { calls.push({ sql, params }); return { rows: [{ discord_user_id: learner, status: 'approved', student_id: 'NG-PT-fixture' }] }; }, async connect() { connects++; return { async query(sql, params) { calls.push({ sql, params }); return { rows: sql.includes('FOR UPDATE') ? [{ status: 'approved', student_id: 'NG-PT-fixture' }] : [] }; }, release() {} }; } };
  return { pool, config, calls, handle: createAccessActionHandler(pool, config, guild, { now: () => clock }), get connects() { return connects; }, advance(ms) { clock += ms; } };
}
test('access controls have clear action labels', () => { const controls = buildAccessControls(learner, 'approved')[0].toJSON().components; assert.deepEqual(controls.map(c => c.label), ['Suspend access', 'Revoke access']); assert.equal(buildAccessControls(learner, 'revoked')[0].toJSON().components[0].label, 'Reinstate enrollment'); });
test('each access confirmation explains its own effect before database work', async () => {
  for (const [action, pattern] of [['deny', /Denies a pending/], ['suspend', /Suspends enrollment/], ['revoke', /Revokes enrollment/], ['reinstate', /does not restore lab permissions/]]) { const f = fixture(); const i = interaction(`cert:access:${action}:${learner}:directory:2`, true); await f.handle(i); assert.equal(f.connects, 0); assert.match(i.replies[0].content, pattern); assert.match(i.replies[0].content, /expires in five minutes/); assert.equal(i.replies[0].flags, 64); assert.deepEqual(i.replies[0].allowedMentions, { parse: [] }); }
});
test('record access control carries queue context into reason form and cancel return', async () => {
  const f = fixture(); const route = createCertificationRouter(f.pool, f.config, guild); const record = interaction(`cert:students:detail:${learner}:directory:2`); await route(record);
  const button = record.replies[0].components.flatMap(r => r.toJSON().components).find(c => c.custom_id === `cert:access:suspend:${learner}:directory:2`); assert.ok(button);
  const open = interaction(button.custom_id); await route(open); assert.equal(open.modal.custom_id, button.custom_id);
  const reason = interaction(open.modal.custom_id, true); await route(reason); const cancelId = reason.replies[0].components[0].toJSON().components[1].custom_id; const cancel = interaction(cancelId); await route(cancel);
  assert.match(cancel.replies[0].content, /Canceled/); assert.equal(f.connects, 0); const controls = cancel.replies[0].components[0].toJSON().components; assert.equal(controls[0].custom_id, `cert:students:detail:${learner}:directory:2`); assert.equal(controls[1].custom_id, 'cert:console:directory:2');
});
test('confirmed access change preserves queue navigation and consumes token once', async () => {
  const f = fixture(); const reason = interaction(`cert:access:suspend:${learner}:directory:3`, true); await f.handle(reason); const id = reason.replies[0].components[0].toJSON().components[0].custom_id;
  const confirmed = interaction(id); await f.handle(confirmed); assert.equal(f.connects, 1); assert.match(confirmed.replies[0].content, /Enrollment status: suspended/); const controls = confirmed.replies[0].components[0].toJSON().components; assert.equal(controls[0].custom_id, `cert:students:detail:${learner}:directory:3`); assert.equal(controls[1].custom_id, 'cert:console:directory:3');
  const replay = interaction(id); await f.handle(replay); assert.match(replay.replies[0].content, /expired/); assert.equal(f.connects, 1); assert.equal(f.calls.filter(c => c.sql === 'COMMIT').length, 1);
});
test('malformed context and unauthorized forms fail before database work', async () => {
  for (const suffix of ['directory:-1', 'labs:0', 'directory:1000000', 'restricted:2:extra']) { const f = fixture(); const i = interaction(`cert:access:suspend:${learner}:${suffix}`, true); await f.handle(i); assert.equal(f.connects, 0); assert.match(i.replies[0].content, /Invalid/); }
  for (const [actor, server] of [[learner, guild], [owner, learner]]) { const f = fixture(); const i = interaction(`cert:access:suspend:${learner}:directory:2`, true, actor, server); i.fields.getTextInputValue = () => assert.fail('Unauthorized field read'); await f.handle(i); assert.equal(f.connects, 0); assert.match(i.replies[0].content, /Owner authorization/); }
});
test('contextual confirmation retains exact five-minute expiry boundary', async () => { const f = fixture(); const reason = interaction(`cert:access:suspend:${learner}:restricted:2`, true); await f.handle(reason); const id = reason.replies[0].components[0].toJSON().components[0].custom_id; f.advance(300000); const expired = interaction(id); await f.handle(expired); assert.match(expired.replies[0].content, /expired/); assert.equal(f.connects, 0); });
