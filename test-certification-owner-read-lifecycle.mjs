import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { createGuardedOwnerReads } from './certification-owner-read-guard.js';
import { createCertificationRouter } from './certification-router.js';
const owner = '1223123544301633567'; const learner = '1223123544301633568'; const guild = '1339276399390887956';
const config = { enabled: true, ownerId: owner };
function interaction(id, kind = 'button') {
  return { customId: id, user: { id: owner }, guildId: guild, deferred: false, replied: false, replies: [], values: ['directory'],
    fields: { getTextInputValue: () => learner }, isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'select',
    async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); }, async showModal(modal) { this.modal = modal.toJSON(); } };
}
test('lookup modal opening is free and submitted lookup is charged exactly once', async () => {
  let queries = 0; const pool = { async query() { queries++; return { rows: [] }; } }; const route = createCertificationRouter(pool, config, guild, { ownerReadLimit: 1 });
  const open = interaction('cert:owner:lookup'); await route(open); assert.equal(open.modal.custom_id, 'cert:owner:lookup:submit'); assert.equal(queries, 0);
  const submitted = interaction('cert:owner:lookup:submit', 'modal'); await route(submitted); assert.equal(queries, 1); assert.match(submitted.replies[0].content, /Student record not found/); assert.equal(submitted.options.flags, 64);
  const blocked = interaction(`cert:students:detail:${learner}`); await route(blocked); assert.equal(queries, 1); assert.match(blocked.replies[0].content, /Too many owner lookups/);
});
test('section selection shares its budget with contextual learner-record reads', async () => {
  let calls = 0; const handle = createGuardedOwnerReads(async () => { calls++; return true; }, config, guild, { limit: 1 });
  await handle(interaction('cert:console:section', 'select')); const blocked = interaction(`cert:students:detail:${learner}:restricted:2`); await handle(blocked); assert.equal(calls, 1); assert.match(blocked.replies[0].content, /Too many owner lookups/);
});
test('unauthorized lookup submissions never read fields or query the database', async () => {
  for (const boundary of ['actor', 'guild', 'disabled']) {
    const pool = { async query() { assert.fail('Unauthorized SQL'); } }; const route = createCertificationRouter(pool, boundary === 'disabled' ? { ...config, enabled: false } : config, guild);
    const i = interaction('cert:owner:lookup:submit', 'modal'); if (boundary === 'actor') i.user.id = learner; if (boundary === 'guild') i.guildId = learner; i.fields.getTextInputValue = () => assert.fail('Unauthorized field read');
    await route(i); assert.match(i.replies[0].content, /Owner authorization/); assert.equal(i.replies[0].flags, 64); assert.deepEqual(i.replies[0].allowedMentions, { parse: [] });
  }
});
test('denied actor does not consume the configured owner budget', async () => {
  let queries = 0; const route = createCertificationRouter({ async query() { queries++; return { rows: [] }; } }, config, guild, { ownerReadLimit: 1 });
  const denied = interaction(`cert:students:detail:${learner}`); denied.user.id = learner; await route(denied); assert.equal(queries, 0); assert.match(denied.replies[0].content, /Owner authorization/);
  const allowed = interaction(`cert:students:detail:${learner}`); await route(allowed); assert.equal(queries, 1); assert.match(allowed.replies[0].content, /Student record not found/);
});
test('failed read releases busy state but still counts toward the budget', async () => {
  let calls = 0; const failure = new Error('Synthetic read failure'); const handle = createGuardedOwnerReads(async () => { calls++; if (calls === 1) throw failure; return true; }, config, guild, { limit: 2 });
  await assert.rejects(handle(interaction('cert:console:overview:0')), error => error === failure); assert.equal(await handle(interaction('cert:console:directory:0')), true);
  const blocked = interaction('cert:console:restricted:0'); await handle(blocked); assert.equal(calls, 2); assert.match(blocked.replies[0].content, /Too many owner lookups/);
});
test('late read rejection is observed and admission recovers without a second reply', { timeout: 5000 }, async () => {
  let rejectRead; let calls = 0; const gate = new Promise((resolve, reject) => { rejectRead = reject; });
  const handle = createGuardedOwnerReads(async i => { calls++; if (calls === 1) { await i.deferReply({ flags: 64 }); await gate; } return true; }, config, guild, { responseTimeoutMs: 20 });
  try {
    const first = interaction('cert:console:overview:0'); await handle(first); assert.equal(first.replies.length, 1); assert.match(first.replies[0].content, /result is not confirmed/);
    const busy = interaction('cert:console:directory:0'); await handle(busy); assert.match(busy.replies[0].content, /still processing/); assert.equal(calls, 1);
    rejectRead(new Error('Synthetic late read failure')); await tick(); assert.equal(first.replies.length, 1); assert.equal(await handle(interaction('cert:console:overview:0')), true); assert.equal(calls, 2);
  } finally { rejectRead(new Error('Fixture cleanup')); }
});
test('deadline notification failure does not release an underlying pending read', { timeout: 5000 }, async () => {
  let release; let calls = 0; const gate = new Promise(resolve => { release = resolve; }); const transportFailure = new Error('Synthetic transport failure');
  const handle = createGuardedOwnerReads(async i => { calls++; await i.deferReply({ flags: 64 }); await gate; return true; }, config, guild, { responseTimeoutMs: 20 });
  try { const first = interaction('cert:console:overview:0'); first.editReply = async () => { throw transportFailure; }; await assert.rejects(handle(first), error => error === transportFailure); const busy = interaction('cert:console:directory:0'); await handle(busy); assert.match(busy.replies[0].content, /still processing/); assert.equal(calls, 1); } finally { release(); await tick(); }
});
