import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnrollmentAction } from './certification-enrollment-actions.js';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const admin = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const config = { enabled: true, ownerId: admin, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
for (const [label, id, ready] of [['empty', '', false], ['whitespace', ' \t\n ', false], ['zero', 0, false], ['number', 123, false], ['object', {}, false], ['boolean', false, false], ['not issued', null, true], ['existing', 'NG-PT-existing', true]]) {
  test(`approval screen ${label} ID matches shared readiness without approving`, async () => {
    const record = Object.freeze({ discord_user_id: student, status: 'pending', student_id: id, approved_by: null, approved_at: null, signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION });
    const queries = [], replies = [];
    const pool = { async query(sql, params) { assert.match(sql, /^SELECT/); queries.push({ sql, params }); return { rows: [record] }; }, connect() { assert.fail('Review cannot write'); } };
    const interaction = { customId: `cert:enrollment:review:${student}`, user: { id: admin }, guildId: guild, isButton: () => true,
      async deferReply(payload) { assert.equal(payload.flags, 64); }, async editReply(payload) { replies.push(payload); },
      client: { users: { fetch() { assert.fail('Review cannot notify a student'); } } } };
    const service = { approveEnrollment() { assert.fail('Review cannot approve'); } };
    assert.equal(await handleEnrollmentAction(interaction, pool, config, guild, service), true);
    assert.equal(queries.length, 1); assert.deepEqual(queries[0].params, [student]); assert.equal(replies.length, 1);
    const payload = replies[0], controls = payload.components[0].toJSON().components;
    const approve = controls.find(control => control.custom_id === `cert:enrollment:approve:${student}`);
    const cancel = controls.find(control => control.custom_id === `cert:enrollment:cancel:${student}`);
    assert.equal(evaluateCourseAccessReadiness(record, config).readyForApproval, ready);
    assert.equal(approve.disabled, !ready); assert.ok(cancel); assert.notEqual(cancel.disabled, true);
    assert.match(payload.embeds[0].toJSON().description, new RegExp(`Required records complete: ${ready ? 'Yes' : 'No'}`));
    assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.equal(record.student_id, id);
  });
}
