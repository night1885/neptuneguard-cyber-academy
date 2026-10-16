import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleBrowser, formatAuditAction } from './certification-console-browser.js';
import { handleConsoleLabs } from './certification-console-labs.js';
import { handleLabReview } from './certification-console-lab-review.js';
import { buildLabReviewSummary } from './certification-lab-review-summary.js';
const admin = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const request = '00000000-0000-4000-8000-000000000001';
const routes = [
  ['directory', handleConsoleBrowser, 'cert:dir:all:0:'],
  ['audit', handleConsoleBrowser, 'cert:audit:0'],
  ['labs', handleConsoleLabs, 'cert:labview:all:0'],
  ['review', handleLabReview, `cert:labview:review:${request}`]
];
for (const [label, handle, id] of routes) {
  for (const options of [{ actor: student }, { server: null }, { server: '444444444444444444' }, { enabled: false }]) {
    test(`${label}: admin wording preserves authorization boundary ${JSON.stringify(options)}`, async () => {
      const replies = [];
      const pool = { query() { assert.fail('Denied inspection cannot query'); }, connect() { assert.fail('Denied inspection cannot write'); } };
      const interaction = { customId: id, user: { id: options.actor || admin }, guildId: Object.hasOwn(options, 'server') ? options.server : guild,
        memberPermissions: { has: () => true }, isButton: () => true, isModalSubmit: () => false,
        async reply(payload) { replies.push(payload); }, async deferReply() { assert.fail('Denied inspection cannot defer'); },
        async showModal() { assert.fail('Denied inspection cannot open a modal'); } };
      assert.equal(await handle(interaction, pool, { enabled: options.enabled ?? true, ownerId: admin }, guild), true);
      assert.equal(replies.length, 1);
      assert.equal(replies[0].content, 'Admin authorization in the configured server is required.');
      assert.equal(replies[0].flags, 64); assert.deepEqual(replies[0].allowedMentions, { parse: [] });
    });
  }
  test(`${label}: authorized inspection uses admin footer and SELECT only`, async () => {
    const replies = [], queries = [];
    const event = Object.freeze({ event_id: '1', action: 'student_registered_by_owner', actor_discord_user_id: admin, subject_discord_user_id: student, details: { secret: 'PRIVATE-NOTE' } });
    const record = Object.freeze({ request_id: request, discord_user_id: student, lab_key: 'fixture', status: 'pending', enrollment_discord_user_id: student, enrollment_status: 'pending' });
    const pool = { async query(sql, values) { assert.match(sql, /^SELECT/); queries.push({ sql, values }); return { rows: label === 'audit' ? [event] : label === 'review' ? [record] : [] }; }, connect() { assert.fail('Inspection cannot write'); } };
    const interaction = { customId: id, user: { id: admin }, guildId: guild, isButton: () => true, isModalSubmit: () => false,
      async deferReply(payload) { assert.equal(payload.flags, 64); }, async reply() { assert.fail('Authorized inspection denied'); }, async editReply(payload) { replies.push(payload); } };
    assert.equal(await handle(interaction, pool, { enabled: true, ownerId: admin }, guild), true);
    assert.equal(queries.length, 1); assert.deepEqual(replies[0].allowedMentions, { parse: [] });
    assert.match(replies[0].embeds[0].footer.text, /^Admin-only/);
    assert.doesNotMatch(JSON.stringify(replies[0]), /PRIVATE-NOTE/);
    assert.equal(event.action, 'student_registered_by_owner');
  });
}
test('summary remains read-only and audit identifiers retain historical formatting', () => {
  const summary = buildLabReviewSummary({ request_id: request, discord_user_id: student, status: 'pending' }, null, {});
  assert.equal(summary.footer.text, 'Admin-only • Read-only • No approval • No provider calls');
  assert.match(summary.description, /No authorization is granted or changed/);
  assert.equal(formatAuditAction('student_registered_by_owner'), 'student registered by owner');
});
