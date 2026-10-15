import test from 'node:test';
import assert from 'node:assert/strict';
import { handleCertificationLearner, certificationLearnerEntry } from './certification-learner.js';
const student = '100000000000000002', guild = '100000000000000003';
const ids = ['cert:learner:home', 'cert:learner:status', 'cert:contents', 'cert:lesson:training-readiness:0', 'cert:help:training-readiness:1'];
async function run(id, { privateSource = true, origin = student, enabled = true, guildId = guild, authorized = true } = {}) {
  const calls = [], subjects = []; let payload;
  const interaction = { customId: id, guildId, user: { id: student }, isButton: () => true,
    message: { flags: { has: flag => privateSource && flag === 64 }, interactionMetadata: { user: { id: origin } } },
    async deferUpdate() { calls.push('update'); }, async deferReply(value) { assert.equal(value.flags, 64); calls.push('private'); },
    async editReply(value) { calls.push('edit'); payload = value; } };
  const service = { async getCourseAuthorization(subject) { subjects.push(subject); return authorized ? { student_id: 'NG-FIXTURE-STUDENT' } : null; } };
  const handled = await handleCertificationLearner(interaction, { enabled }, guild, service);
  return { calls, subjects, payload, handled };
}
for (const id of ids) {
  test(`private navigation updates in place: ${id}`, async () => {
    const result = await run(id);
    assert.equal(result.handled, true); assert.deepEqual(result.calls, ['update', 'edit']);
    assert.deepEqual(result.subjects, [student]); assert.deepEqual(result.payload.allowedMentions, { parse: [] });
    const rows = result.payload.components.map(row => row.toJSON ? row.toJSON() : row);
    assert.ok(rows.length <= 5); assert.ok(rows.every(row => row.components.length <= 5));
    const controls = rows.flatMap(row => row.components);
    assert.ok(!controls.some(control => /cert:(admin|labact|enrollment|access):/.test(control.custom_id || '')));
    assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
  });
}
test('public source opens a private response', async () => {
  assert.deepEqual((await run(ids[0], { privateSource: false })).calls, ['private', 'edit']);
});
test('different source owner never updates that source', async () => {
  const result = await run(ids[1], { origin: '100000000000000099' });
  assert.deepEqual(result.calls, ['private', 'edit']); assert.deepEqual(result.subjects, [student]);
});
for (const options of [{ enabled: false }, { guildId: '100000000000000099' }]) {
  test(`invalid context performs no student query ${JSON.stringify(options)}`, async () => {
    const result = await run(ids[0], options); assert.deepEqual(result.subjects, []);
    assert.deepEqual(result.calls, ['private', 'edit']); assert.deepEqual(result.payload.components, []);
  });
}
test('lost course authorization clears the existing private panel', async () => {
  const result = await run(ids[0], { authorized: false });
  assert.deepEqual(result.calls, ['update', 'edit']); assert.deepEqual(result.payload.embeds, []);
  assert.deepEqual(result.payload.components, []); assert.match(result.payload.content, /approved certification enrollment/);
});
test('status describes only authorized course access, not progress or lab approval', async () => {
  const result = await run(ids[1]); const text = JSON.stringify(result.payload);
  assert.match(text, /NG-FIXTURE-STUDENT/); assert.match(text, /Completion reporting is not connected/);
  assert.match(text, /Course approval does not grant lab access/);
});
test('entry opens student home', () => {
  assert.equal(certificationLearnerEntry().components[0].toJSON().components[0].custom_id, 'cert:learner:home');
});
