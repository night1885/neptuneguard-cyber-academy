import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAuditAction, handleConsoleBrowser } from './certification-console-browser.js';
for (const [action, expected] of [['lab_request_denied', 'lab request denied'], ['lab_request_revoked', 'lab request revoked'], ['enrollment_approved', 'enrollment approved'], [null, 'Not supplied']]) {
  test(`audit label preserves word boundaries for ${action}`, () => assert.equal(formatAuditAction(action), expected));
}
test('audit labels remain sanitized and bounded', () => {
  assert.doesNotMatch(formatAuditAction('@everyone_<unsafe>_**action**'), /[`*_~|<>@]/);
  assert.equal(formatAuditAction('x'.repeat(500)).length, 100);
});
test('rendered audit event uses human-readable label without altering stored code', async () => {
  const owner = '1223123544301633567', guild = '1330353166830665859';
  const entry = Object.freeze({ event_id: '1', actor_discord_user_id: owner, action: 'lab_request_denied' });
  const replies = [];
  await handleConsoleBrowser({ customId: 'cert:audit:0', user: { id: owner }, guildId: guild, isButton: () => true, isModalSubmit: () => false,
    async deferReply() {}, async editReply(payload) { replies.push(payload); }
  }, { async query(sql) { assert.match(sql, /^SELECT/); return { rows: [entry] }; } }, { enabled: true, ownerId: owner }, guild);
  assert.equal(replies[0].embeds[0].fields[0].name, 'Event 1 — lab request denied');
  assert.equal(entry.action, 'lab_request_denied');
});
