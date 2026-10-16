import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessActionHandler } from './certification-access-actions.js';

const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887957';
const config = { enabled: true, ownerId: owner };
function fixture({ failAudit = false } = {}) {
  let time = 0; let connects = 0; const queries = []; const releases = [];
  const pool = { async connect() { connects++; return {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FOR UPDATE')) return { rows: [{ status: 'approved', student_id: 'NG-PT-fixture' }] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Synthetic audit failure');
      return { rows: [] };
    }, release(discard) { releases.push(discard); }
  }; } };
  const handler = createAccessActionHandler(pool, config, guild, { now: () => time });
  function interaction(id, modal = false, actor = owner) {
    return { customId: id, user: { id: actor }, guildId: guild, replies: [], deferrals: [],
      isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: () => 'Fixture reason' },
      async reply(payload) { this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); },
      async deferReply(payload) { this.deferrals.push(payload); }, async showModal() {} };
  }
  async function issue() {
    const i = interaction(`cert:access:suspend:${learner}`, true); await handler(i);
    return { interaction: i, id: i.replies[0].components?.[0]?.components[0]?.data.custom_id };
  }
  return { pool, handler, interaction, issue, queries, releases, get connects() { return connects; },
    advance(value) { time = value; }, restart: () => createAccessActionHandler(pool, config, guild, { now: () => time }) };
}
function assertExpired(i) { assert.match(i.replies[0].content, /expired|restart/); assert.equal(i.replies[0].flags, 64); }

test('reason form creates a private confirmation without database work', async () => {
  const f = fixture(); const issued = await f.issue(); assert.match(issued.id, /^cert:access:confirm:[a-f0-9-]{36}$/);
  assert.equal(f.connects, 0); assert.equal(issued.interaction.replies[0].flags, 64);
  assert.deepEqual(issued.interaction.replies[0].allowedMentions, { parse: [] });
});
test('valid confirmation changes access once and a replay cannot checkout a connection', async () => {
  const f = fixture(); const { id } = await f.issue(); const first = f.interaction(id); await f.handler(first);
  assert.equal(f.connects, 1); assert.equal(first.deferrals[0].flags, 64);
  assert.match(first.replies[0].content, /Enrollment status: suspended/); assert.match(first.replies[0].content, /lab provider/);
  const replay = f.interaction(id); await f.handler(replay); assertExpired(replay); assert.equal(f.connects, 1);
  assert.equal(f.queries.filter(q => q.sql === 'COMMIT').length, 1); assert.deepEqual(f.releases, [false]);
});
test('concurrent confirmation clicks consume one token before awaiting work', async () => {
  const f = fixture(); const { id } = await f.issue(); const clicks = [f.interaction(id), f.interaction(id)];
  await Promise.all(clicks.map(i => f.handler(i))); assert.equal(f.connects, 1);
  assert.equal(f.queries.filter(q => q.sql === 'COMMIT').length, 1);
  assert.equal(clicks.filter(i => i.replies[0].content.includes('expired')).length, 1);
});
test('non-owner cannot consume owner confirmation', async () => {
  const f = fixture(); const { id } = await f.issue(); const denied = f.interaction(id, false, learner);
  await f.handler(denied); assert.match(denied.replies[0].content, /Admin authorization/); assert.equal(f.connects, 0);
  await f.handler(f.interaction(id)); assert.equal(f.connects, 1);
});
test('cancel invalidates the token without changing access', async () => {
  const f = fixture(); const { id } = await f.issue(); const canceled = f.interaction(id.replace(':confirm:', ':cancel:'));
  await f.handler(canceled); assert.match(canceled.replies[0].content, /Canceled/);
  const replay = f.interaction(id); await f.handler(replay); assertExpired(replay); assert.equal(f.connects, 0);
});
test('confirmation expires exactly at the five-minute boundary', async () => {
  const f = fixture(); const { id } = await f.issue(); f.advance(300000);
  const expired = f.interaction(id); await f.handler(expired); assertExpired(expired); assert.equal(f.connects, 0);
});
test('handler recreation invalidates previously issued tokens', async () => {
  const f = fixture(); const { id } = await f.issue(); const old = f.interaction(id);
  await f.restart()(old); assertExpired(old); assert.equal(f.connects, 0);
});
test('database failure consumes token and replay cannot retry the transaction', async () => {
  const f = fixture({ failAudit: true }); const { id } = await f.issue();
  await assert.rejects(f.handler(f.interaction(id)), /Synthetic audit failure/);
  assert.equal(f.queries.filter(q => q.sql === 'ROLLBACK').length, 1);
  assert.ok(!f.queries.some(q => q.sql === 'COMMIT'));
  const replay = f.interaction(id); await f.handler(replay); assertExpired(replay); assert.equal(f.connects, 1);
});
test('pending confirmation capacity rejects new forms and expired entries are reclaimed', async () => {
  const f = fixture(); for (let index = 0; index < 100; index++) assert.ok((await f.issue()).id);
  const blocked = await f.issue(); assert.equal(blocked.id, undefined);
  assert.match(blocked.interaction.replies[0].content, /Too many pending confirmations/);
  f.advance(300000); assert.ok((await f.issue()).id); assert.equal(f.connects, 0);
});
test('invalid clock injection is rejected', () => {
  assert.throws(() => createAccessActionHandler({}, config, guild, { now: null }), /clock/);
});
