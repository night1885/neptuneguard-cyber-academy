import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleLabs } from './certification-console-labs.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const request = '00000000-0000-4000-8000-000000000001';
async function render(studentId, status = 'pending', missing = false) {
  const replies = [], queries = [];
  await handleConsoleLabs({ customId: `cert:labview:detail:${request}`, user: { id: owner }, guildId: guild, isButton: () => true,
    async deferReply(value) { assert.equal(value.flags, 64); }, async editReply(value) { replies.push(value); }
  }, { async query(sql, params) {
    assert.match(sql, /^SELECT/); queries.push({ sql, params });
    return { rows: missing ? [] : [{ request_id: request, discord_user_id: studentId, status }] };
  }, connect() { assert.fail('Navigation must not mutate records'); } }, { enabled: true, ownerId: owner }, guild);
  return { payload: replies[0], queries };
}
for (const status of ['pending', 'approved', 'denied', 'suspended', 'revoked', 'expired']) {
  test(`lab ${status} links the exact student with status-appropriate action controls`, async () => {
    const { payload, queries } = await render(student, status);
    assert.equal(queries.length, 1); assert.deepEqual(queries[0].params, [request]);
    const controls = payload.components.flatMap(row => row.components);
    assert.ok(controls.some(control => control.custom_id === `cert:students:detail:${student}` && control.label === 'Student access record'));
    const expected = status === 'pending' ? ['deny'] : status === 'approved' ? ['revoke','suspend'] : status === 'suspended' ? ['revoke'] : [];
    assert.deepEqual(controls.filter(control => control.custom_id.startsWith('cert:labact:')).map(control => control.custom_id.split(':')[2]), expected);
    assert.equal(new Set(controls.map(control => control.custom_id)).size, controls.length);
    assert.ok(payload.components.length <= 5); assert.ok(payload.components.every(row => row.components.length <= 5));
    assert.ok(controls.every(control => control.custom_id.length <= 100));
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  });
}
for (const value of [null, '', 'invalid', '1'.repeat(21), 123456789012345678]) {
  test(`malformed stored learner ID does not create a link: ${JSON.stringify(value)}`, async () => {
    const { payload } = await render(value);
    assert.ok(!payload.components.flatMap(row => row.components).some(control => control.custom_id.startsWith('cert:students:detail:')));
  });
}
test('missing lab request does not create a learner link', async () => {
  const { payload } = await render(student, 'pending', true);
  assert.match(payload.content, /not found/);
  assert.ok(!payload.components.flatMap(row => row.components).some(control => control.custom_id.startsWith('cert:students:detail:')));
});
