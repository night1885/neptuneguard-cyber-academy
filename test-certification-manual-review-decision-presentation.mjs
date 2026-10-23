import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRowBuilder, EmbedBuilder, ModalBuilder } from 'discord.js';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { createManualReviewDecisionPresentation } from './certification-manual-review-decision-presentation.mjs';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333', channelId = '444444444444444444';
const token = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner, adminChannelId: channelId,
  activeAgreementVersion: 'agreement-v1', activeAgreementSha256: 'a'.repeat(64),
  comprehensionCheck: { version: 'check-v1', questions: [1, 2, 3].map(() => ({ prompt: 'Q'.repeat(300) })),
    correctAnswers: ['PRIVATE_GUIDE', 'PRIVATE_GUIDE', 'PRIVATE_GUIDE'] } };
const context = { actorId: owner, actualGuildId: guildId, actualChannelId: channelId };
function record() {
  const at = new Date();
  return { discord_user_id: student, student_id: null, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: config.activeAgreementVersion,
    agreement_content_sha256: config.activeAgreementSha256, acknowledged_at: at, learner_confirmed_read_at: at,
    comprehension_check_version: 'check-v1', comprehension_submitted_at: at, comprehension_passed_at: null,
    comprehension_review_snapshot: createManualReviewSnapshot(config, ['PRIVATE_RESPONSE', 'PRIVATE_RESPONSE', 'PRIVATE_RESPONSE']),
    age_eligible: true, age_declared_at: at, age_declaration_version: 'adult-18-v1', approved_by: null, approved_at: null };
}
const issued = action => ({ token, studentDiscordId: student, action, expiresAt: Date.now() + 300000 });
const ui = () => createManualReviewDecisionPresentation(config, { guildId });
function validateReply(payload) {
  assert.equal(payload.flags, 64);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  payload.embeds.forEach(embed => assert.doesNotThrow(() => new EmbedBuilder(embed).toJSON()));
  payload.components.forEach(component => assert.doesNotThrow(() => new ActionRowBuilder(component).toJSON()));
  const ids = payload.components.flatMap(component => component.components).map(component => component.custom_id);
  assert.ok(ids.every(value => value.length <= 100));
}
test('review screen is private, complete, and does not change the application', () => {
  const row = record(), before = structuredClone(row);
  const payload = ui().review(context, { record: row, reviewToken: token });
  validateReply(payload);
  assert.match(JSON.stringify(payload), /Awaiting owner review/);
  const fields = payload.embeds[1].fields;
  assert.equal(fields.length, 9);
  for (let index = 0; index < 3; index++) {
    assert.deepEqual(fields.slice(index * 3, index * 3 + 3), [
      { name: `Question ${index + 1}`, value: 'Q'.repeat(300) },
      { name: `Learner response ${index + 1}`, value: 'PRIVATE' + String.fromCharCode(92) + '_RESPONSE' },
      { name: `Expected answer / guide ${index + 1}`, value: 'PRIVATE' + String.fromCharCode(92) + '_GUIDE' }
    ]);
  }
  assert.deepEqual(payload.components[0].components.map(value => value.label), ['Approve...', 'Deny...']);
  assert.deepEqual(row, before);
});
for (const action of ['approve', 'deny']) test(`${action} form uses valid required reason and review-acknowledgment fields`, () => {
  const modal = ui().reasonModal(context, { action, reviewToken: token });
  assert.doesNotThrow(() => new ModalBuilder(modal).toJSON());
  assert.equal(modal.custom_id, `cert:review:reason:${action}:${token}`);
  const fields = modal.components.map(component => component.components[0]);
  assert.deepEqual(fields.map(field => field.custom_id), ['reason', 'review_ack']);
  assert.deepEqual(fields.map(field => field.max_length), [1000, 8]);
  assert.ok(fields.every(field => field.required));
});
for (const action of ['approve', 'deny']) test(`${action} confirmation names the exact learner and effects`, () => {
  const payload = ui().confirmation(context, { issued: issued(action), reason: '  Owner reviewed the application  ' });
  validateReply(payload);
  assert.match(payload.embeds[0].description, new RegExp(student));
  assert.match(payload.embeds[0].description, /No automatic comprehension pass/);
  assert.equal(payload.embeds[0].fields[0].value, 'Owner reviewed the application');
  assert.equal(payload.components[0].components[0].custom_id, `cert:review:confirm:${token}`);
  assert.equal(payload.components[0].components[1].custom_id, `cert:review:cancel:${token}`);
  if (action === 'approve') {
    assert.match(payload.embeds[0].description, /runtime gates/);
    assert.match(payload.embeds[0].description, /does not authorize labs or issue a certificate/);
  } else assert.match(payload.embeds[0].description, /does not issue a new permanent ID/);
});
test('maximum escaped reason is preserved without oversized embed fields', () => {
  const reason = '@'.repeat(1000), payload = ui().confirmation(context, { issued: issued('deny'), reason });
  validateReply(payload);
  assert.equal(payload.embeds[0].fields.length, 2);
  assert.ok(payload.embeds[0].fields.every(field => field.value.length <= 1024));
  assert.equal(payload.embeds[0].fields.map(field => field.value).join('').replaceAll(String.fromCharCode(92) + '@', '@'), reason);
});
for (const overrides of [{ actorId: student }, { actualGuildId: '555555555555555555' }, { actualChannelId: '555555555555555555' }]) {
  test(`unauthorized scope receives no review, form, or confirmation: ${JSON.stringify(overrides)}`, () => {
    const presentation = ui(), wrong = { ...context, ...overrides };
    assert.throws(() => presentation.review(wrong, { record: record(), reviewToken: token }));
    assert.throws(() => presentation.reasonModal(wrong, { action: 'approve', reviewToken: token }));
    assert.throws(() => presentation.confirmation(wrong, { issued: issued('approve'), reason: 'Reviewed' }));
  });
}
test('nonpending or incomplete records cannot display decision controls', () => {
  for (const overrides of [{ status: 'approved' }, { status: 'denied' }, { age_eligible: false },
    { agreement_content_sha256: 'b'.repeat(64) }, { approved_by: owner }, { student_id: '' }]) {
    assert.throws(() => ui().review(context, { record: { ...record(), ...overrides }, reviewToken: token }));
  }
});
test('invalid tokens, actions, reasons, and timestamps are rejected', () => {
  assert.throws(() => ui().reasonModal(context, { action: 'suspend', reviewToken: token }));
  assert.throws(() => ui().reasonModal(context, { action: 'approve', reviewToken: 'bad' }));
  for (const reason of ['', ' ', 'x'.repeat(1001)]) assert.throws(() => ui().confirmation(context, { issued: issued('approve'), reason }));
  assert.throws(() => ui().confirmation(context, { issued: { ...issued('approve'), expiresAt: NaN }, reason: 'Reviewed' }));
  assert.throws(() => ui().confirmation(context, { issued: { ...issued('approve'), studentDiscordId: 'bad' }, reason: 'Reviewed' }));
});
test('explicit enablement and valid private scope are required', () => {
  for (const field of ['enabled', 'manualReviewEnabled', 'manualReviewDecisionsEnabled']) {
    assert.throws(() => createManualReviewDecisionPresentation({ ...config, [field]: false }, { guildId }));
  }
  assert.throws(() => createManualReviewDecisionPresentation({ ...config, adminChannelId: 'bad' }, { guildId }));
});
