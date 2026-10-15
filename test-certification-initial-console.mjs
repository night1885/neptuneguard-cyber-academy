import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialConsoleHandler } from './certification-initial-console.js';
const student = '222222222222222222', guild = '333333333333333333';
async function render(status, enabled = true, options = {}) {
  const queries = [], replies = [];
  const pool = { async query(sql, values) { queries.push({ sql, values }); return { rows: sql.startsWith('SELECT status') && status ? [{ status }] : [] }; } };
  const handler = createInitialConsoleHandler(pool, { enabled: true, enrollmentSubmissionEnabled: enabled }, guild);
  await handler({ customId: options.id || 'cert:initial:home', user: { id: student }, guildId: options.guild || guild, isButton: () => true, message: options.message, async deferReply(p) { assert.equal(p.flags, 64); }, async reply(p) { replies.push(p); }, async editReply(p) { replies.push(p); } });
  return { payload: replies.at(-1), queries };
}
const controls = payload => payload.components[0].toJSON().components;
test('unregistered learner gets registration control without course access or writes', async () => {
  const { payload, queries } = await render();
  assert.equal(controls(payload).find(c => c.custom_id === 'cert:submit:start').disabled, false);
  assert.equal(controls(payload).find(c => c.custom_id === 'cert:learner:home').disabled, true);
  assert.equal(payload.embeds[0].fields[0].value, 'Not registered');
  assert.ok(queries.every(q => q.sql.startsWith('SELECT') && q.values[0] === student));
});
test('awaiting acknowledgment can continue only when submissions are enabled', async () => {
  for (const enabled of [true, false]) {
    const { payload } = await render('awaiting_acknowledgment', enabled);
    assert.equal(controls(payload)[0].disabled, !enabled);
  }
});
test('pending approved denied suspended and revoked records cannot resubmit', async () => {
  for (const status of ['pending', 'approved', 'denied', 'suspended', 'revoked']) {
    const { payload } = await render(status);
    assert.equal(controls(payload)[0].disabled, true);
    assert.equal(controls(payload).at(-1).disabled, true);
  }
});
test('wrong server and another user source are denied before queries', async () => {
  for (const options of [{ guild: '444444444444444444' }, { message: { interactionMetadata: { user: { id: '444444444444444444' } } } }]) {
    const result = await render(undefined, true, options);
    assert.equal(result.queries.length, 0);
    assert.equal(result.payload.flags, 64);
  }
});
test('help and status remain available before approval', async () => {
  for (const id of ['cert:initial:help', 'cert:initial:status']) {
    const { payload } = await render(undefined, false, { id });
    assert.equal(payload.embeds[0].fields[0].value, 'Not registered');
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  }
});
