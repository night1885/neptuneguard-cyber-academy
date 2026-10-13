import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnerLearnerRecord } from './certification-owner-record.js';

test('learner panel provides state-specific next-step guidance without implying access', () => {
  const expected = { pending: /Review acknowledgment/, awaiting_acknowledgment: /acknowledgment is still required/, approved: /check current eligibility/, suspended: /separate owner reinstatement/, revoked: /separate owner reinstatement/, denied: /does not reopen/ };
  for (const [status, pattern] of Object.entries(expected)) { const embed = buildOwnerLearnerRecord({ status }).toJSON(); assert.match(embed.description, pattern); assert.match(embed.description, /read-only/); assert.match(embed.description, /not effective authorization/); assert.equal(embed.fields.length, 6); }
});
test('valid Date and ISO timestamps use matching absolute and relative Discord tokens', () => {
  const date = new Date('2026-10-13T18:01:00Z'); const seconds = Math.floor(date.getTime() / 1000);
  const embed = buildOwnerLearnerRecord({ status: 'approved', approved_at: date, acknowledged_at: date.toISOString() }).toJSON();
  for (const name of ['Original approval', 'Acknowledgment and comprehension']) { const field = embed.fields.find(f => f.name === name); assert.ok(field.value.includes(`<t:${seconds}:f>`)); assert.ok(field.value.includes(`<t:${seconds}:R>`)); }
});
test('missing and malformed timestamps never render invalid Discord tokens', () => {
  for (const value of [undefined, null, 'invalid', new Date(NaN), '2026-99-99T00:00:00Z']) { const embed = buildOwnerLearnerRecord({ status: 'pending', approved_at: value, acknowledged_at: value }).toJSON(); for (const name of ['Original approval', 'Acknowledgment and comprehension']) { const text = embed.fields.find(f => f.name === name).value; assert.match(text, /Not recorded or invalid/); assert.ok(!text.includes('<t:')); } }
});
test('untrusted reference text is bounded and cannot inject mentions or formatting', () => {
  const embed = buildOwnerLearnerRecord({ status: 'suspended', discord_user_id: '<@everyone>', agreement_version: '`'.repeat(1000) + 'x'.repeat(1000), comprehension_check_version: '@everyone' }).toJSON();
  const text = JSON.stringify(embed); assert.ok(!text.includes('@everyone')); assert.ok(embed.fields.every(field => field.value.length <= 1024)); assert.match(embed.description, /Renewal alone cannot restore access/);
});
