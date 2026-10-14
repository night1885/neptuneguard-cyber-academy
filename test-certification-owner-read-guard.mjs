import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { createGuardedOwnerReads } from './certification-owner-read-guard.js';
import { createCertificationRouter } from './certification-router.js';
const owner = '1223123544301633567'; const guild = '1339276399390887956'; const config = { enabled: true, ownerId: owner };
function interaction(id = 'cert:console:overview:0') { return { customId: id, user: { id: owner }, guildId: guild, deferred: false, replied: false, replies: [], isButton: () => true, isModalSubmit: () => false, async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); } }; }
test('owner read budget is shared across overview, directory and review', async () => {
  let calls = 0; const handle = createGuardedOwnerReads(async () => { calls++; return true; }, config, guild, { limit: 2 });
  await handle(interaction()); await handle(interaction('cert:students:list:0')); const denied = interaction('cert:enrollment:review:1223123544301633568'); await handle(denied); assert.equal(calls, 2); assert.match(denied.replies[0].content, /Too many owner lookups/); assert.equal(denied.replies[0].flags, 64); assert.deepEqual(denied.replies[0].allowedMentions, { parse: [] });
});
test('budget resets at the one-minute boundary', async () => { let now = 0; let calls = 0; const handle = createGuardedOwnerReads(async () => { calls++; return true; }, config, guild, { limit: 1, now: () => now }); await handle(interaction()); now = 60000; await handle(interaction()); assert.equal(calls, 2); });
test('timeout suppresses late reply and keeps overlapping reads blocked until completion', { timeout: 5000 }, async () => {
  let release; let calls = 0; const gate = new Promise(resolve => { release = resolve; });
  const handle = createGuardedOwnerReads(async i => { calls++; await i.deferReply({ flags: 64 }); await gate; await i.editReply({ content: 'Late fixture result' }); return true; }, config, guild, { responseTimeoutMs: 20 });
  try { const first = interaction(); await handle(first); assert.equal(first.replies.length, 1); assert.match(first.replies[0].content, /result is not confirmed/); assert.match(first.replies[0].content, /does not cancel database work/); const blocked = interaction(); await handle(blocked); assert.match(blocked.replies[0].content, /still processing/); assert.equal(calls, 1); release(); await tick(); assert.equal(first.replies.length, 1); } finally { release(); }
});
test('approval and access mutations are not wrapped as reads', async () => { let calls = 0; const handle = createGuardedOwnerReads(async () => { calls++; return true; }, config, guild, { limit: 1 }); for (const id of ['cert:enrollment:approve:1223123544301633568', 'cert:access:confirm:00000000-0000-0000-0000-000000000000', 'cert:submit:start']) await handle(interaction(id)); assert.equal(calls, 3); });
test('invalid owner-read configuration is rejected', () => { for (const responseTimeoutMs of [0, 60001, 1.5]) assert.throws(() => createGuardedOwnerReads(async () => true, config, guild, { responseTimeoutMs })); assert.throws(() => createGuardedOwnerReads(async () => true, config, guild, { limit: 0 })); });
test('router prevents overlapping overview queries while delayed first read completes', { timeout: 5000 }, async () => {
  let release; let queries = 0; const gate = new Promise(resolve => { release = resolve; });
  const pool = { async query() { queries++; await gate; return { rows: [{ pending_enrollments: '0', approved_enrollments: '0', suspended_enrollments: '0', revoked_enrollments: '0', awaiting_acknowledgment: '0', pending_labs: '0' }] }; } };
  const route = createCertificationRouter(pool, config, guild, { ownerReadTimeoutMs: 20 });
  try { const first = interaction(); await route(first); const overlap = interaction(); await route(overlap); assert.equal(queries, 1); assert.match(overlap.replies[0].content, /still processing/); release(); await tick(); assert.equal(first.replies.length, 1); assert.equal(first.replies[0].embeds.length, 0); } finally { release(); }
});
