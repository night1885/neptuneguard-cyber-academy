import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleStudent } from './certification-console-student.js';
const admin = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const config = { enabled: true, ownerId: admin };
async function render(id, options = {}) {
  const queries = [], replies = [];
  const record = Object.freeze({ discord_user_id: student, status: 'pending', status_reason: 'Historical owner review note' });
  const event = Object.freeze({ event_id: '1', actor_discord_user_id: admin, action: 'student_registered_by_owner', details: { private: 'DO-NOT-RENDER' } });
  const pool = { async query(sql, values) {
    assert.match(sql, /^SELECT/); assert.equal(values[0], student); queries.push({ sql, values });
    return { rows: sql.includes('certification_audit_events') ? [event] : sql.includes('COUNT(*)') ? [{ total: '0' }] : [record] };
  }, connect() { assert.fail('Inspection cannot write'); } };
  const interaction = { customId: id, user: { id: options.actor || admin }, guildId: options.guildId === undefined ? guild : options.guildId, isButton: () => true,
    async deferReply(p) { assert.equal(p.flags, 64); }, async reply(p) { replies.push(p); }, async editReply(p) { replies.push(p); } };
  await handleConsoleStudent(interaction, pool, { ...config, ...options.config }, guild);
  return { queries, payload: replies.at(-1), record, event };
}
for (const id of [`cert:students:detail:${student}`, `cert:student-audit:${student}:0`]) {
  test(`student inspection uses admin footer without changing authorization or stored history: ${id}`, async () => {
    const result = await render(id), embed = result.payload.embeds[0].toJSON();
    assert.equal(embed.footer.text, 'Admin-only • Inspection is read-only • Separate confirmations for access changes');
    assert.deepEqual(result.payload.allowedMentions, { parse: [] });
    assert.equal(result.event.action, 'student_registered_by_owner'); assert.equal(result.record.status_reason, 'Historical owner review note');
    assert.doesNotMatch(JSON.stringify(result.payload), /DO-NOT-RENDER/);
    if (id.startsWith('cert:students:detail:')) assert.equal(embed.fields.find(field => field.name === 'Latest stored status reason').value, result.record.status_reason);
  });
  for (const options of [{ actor: student }, { guildId: null }, { guildId: '444444444444444444' }, { config: { enabled: false } }]) {
    test(`student inspection denies unauthorized context with admin wording: ${id} ${JSON.stringify(options)}`, async () => {
      const result = await render(id, options); assert.equal(result.queries.length, 0); assert.equal(result.payload.flags, 64);
      assert.equal(result.payload.content, 'Admin authorization in the configured server is required.'); assert.equal(result.payload.embeds, undefined);
    });
  }
}
