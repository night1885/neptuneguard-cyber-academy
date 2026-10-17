import test from 'node:test';
import assert from 'node:assert/strict';
import { createClosureEnabledAdminRouter, buildApplicationClosureEntry } from './certification-application-closure-ui.js';

const owner = '1223123544301633567', student = '1223123544301633568', guild = '1223123544301633569';
const config = { enabled: true, ownerId: owner };
const record = () => ({ discord_user_id: student, status: 'pending', student_id: null, approved_by: null, approved_at: null,
  application_closed_at: null, application_closed_by: null, application_closed_as: null });
function interaction(customId, changes = {}) {
  const calls = [];
  return { customId, user: { id: owner }, guildId: guild, deferred: false, replied: false, calls,
    isButton: () => true,
    async reply(payload) { this.replied = true; calls.push({ kind: 'reply', payload }); },
    async deferReply(payload) { this.deferred = true; calls.push({ kind: 'defer', payload }); },
    async editReply(payload) { calls.push({ kind: 'edit', payload }); }, ...changes };
}
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const last = i => i.calls.at(-1).payload;
function confirmationId(i, action = 'confirm') {
  return last(i).components.flatMap(row => json(row).components).find(component => component.custom_id.startsWith(`cert:closure:${action}:`)).custom_id;
}
async function setup({ current = record(), readinessFailure = false, closeFailure = false, fullRows = false } = {}) {
  const queries = [], closes = [], baseCalls = []; let factories = 0, baseFactories = 0, time = 1000;
  const pool = { async query(sql, params) { queries.push({ sql, params }); return { rows: current ? [{ ...current }] : [] }; } };
  const route = await createClosureEnabledAdminRouter(pool, config, guild, { now: () => time,
    async createService(receivedPool, receivedConfig) {
      factories++; assert.equal(receivedPool, pool); assert.equal(receivedConfig.ownerId, owner);
      if (readinessFailure) throw new Error('Readiness blocked');
      return { async closeApplication(...args) {
        closes.push(args); if (closeFailure) throw new Error('Private database failure');
        return { closureCategory: args[2], closedAt: '2026-10-17T18:00:00.000Z', deletionEligibleAt: '2026-10-22T04:00:00.000Z', alreadyClosed: false };
      } };
    },
    createBaseRouter() { baseFactories++; return async i => {
      baseCalls.push(i.customId);
      if (!i.customId.startsWith('cert:students:detail:')) return false;
      await i.deferReply({ flags: 64 });
      await i.editReply({ content: '', embeds: [{ title: 'Student record' }], components: fullRows ? Array.from({ length: 5 }, (_, n) => ({ type: 1, components: [{ type: 2, style: 2, custom_id: `fixture:${n}`, label: 'Fixture' }] })) : [] });
      return true;
    }; }
  });
  return { route, queries, closes, baseCalls, get factories() { return factories; }, get baseFactories() { return baseFactories; }, advance(ms) { time += ms; } };
}

test('closure composition refuses invalid context and never constructs base routing on readiness failure', async () => {
  let touched = 0;
  const options = { async createService() { touched++; throw new Error('Readiness blocked'); }, createBaseRouter() { throw new Error('Base must not be constructed'); } };
  await assert.rejects(createClosureEnabledAdminRouter({}, { enabled: false }, guild, options), /Explicit enabled owner/);
  assert.equal(touched, 0);
  await assert.rejects(createClosureEnabledAdminRouter({}, config, guild, options), /Readiness blocked/);
  assert.equal(touched, 1);
  assert.throws(() => buildApplicationClosureEntry('invalid'), /Invalid student/);
});

test('student detail gains a closure entry only for the configured owner/server and within component limits', async () => {
  const h = await setup(), i = interaction(`cert:students:detail:${student}`);
  await h.route(i); assert.equal(json(last(i).components[0]).components[0].custom_id, `cert:closure:open:${student}`);
  const other = interaction(`cert:students:detail:${student}`, { user: { id: student } });
  await h.route(other); assert.equal(last(other).components.length, 0);
  const full = await setup({ fullRows: true }), page = interaction(`cert:students:detail:${student}`);
  await full.route(page); assert.equal(last(page).components.length, 5);
  assert.equal(h.factories, 1); assert.equal(h.baseFactories, 1);
});

test('unauthorized, wrong-guild, non-button, and malformed closure actions never query or close', async () => {
  const h = await setup();
  for (const i of [interaction(`cert:closure:open:${student}`, { user: { id: student } }),
    interaction(`cert:closure:open:${student}`, { guildId: student }),
    interaction(`cert:closure:open:${student}`, { isButton: () => false }), interaction('cert:closure:choose:invalid:123')]) {
    assert.equal(await h.route(i), true); assert.equal(last(i).flags, 64);
    assert.deepEqual(last(i).allowedMentions, { parse: [] });
  }
  assert.equal(h.queries.length, 0); assert.equal(h.closes.length, 0);
  assert.equal(await h.route(interaction('unrelated')), false);
});

test('opening and choosing only read; confirmation uses the bound owner, subject, and category once', async () => {
  const h = await setup(), open = interaction(`cert:closure:open:${student}`);
  await h.route(open); assert.equal(last(open).components.length, 1);
  const choose = interaction(`cert:closure:choose:withdrawn:${student}`); await h.route(choose);
  assert.equal(h.closes.length, 0); assert.equal(h.queries.length, 2);
  assert.ok(h.queries.every(query => query.sql.startsWith('SELECT') && query.params[0] === student));
  assert.match(last(choose).content, new RegExp(student)); assert.match(last(choose).content, /Category: withdrawn/);
  const token = confirmationId(choose);
  const confirm = interaction(token); await h.route(confirm);
  assert.deepEqual(h.closes, [[owner, student, 'withdrawn']]);
  assert.match(last(confirm).content, /No record was deleted/);
  const replay = interaction(token); await h.route(replay);
  assert.match(last(replay).content, /already used/); assert.equal(h.closes.length, 1);
});

test('wrong owner or guild cannot consume another context confirmation', async () => {
  const h = await setup(), choose = interaction(`cert:closure:choose:denied:${student}`);
  await h.route(choose); const token = confirmationId(choose);
  await h.route(interaction(token, { user: { id: student } }));
  await h.route(interaction(token, { guildId: student }));
  assert.equal(h.closes.length, 0);
  await h.route(interaction(token)); assert.deepEqual(h.closes, [[owner, student, 'denied']]);
});

test('cancel, expiration, unknown token, and process restart never close applications', async () => {
  const h = await setup(), choice = interaction(`cert:closure:choose:abandoned:${student}`);
  await h.route(choice); const confirm = confirmationId(choice);
  const cancel = interaction(confirmationId(choice, 'cancel')); await h.route(cancel);
  assert.match(last(cancel).content, /Canceled/); await h.route(interaction(confirm));
  const expiring = interaction(`cert:closure:choose:denied:${student}`); await h.route(expiring);
  h.advance(300000); const expired = interaction(confirmationId(expiring)); await h.route(expired); assert.match(last(expired).content, /expired/);
  const restarted = await setup(); await restarted.route(interaction(confirm));
  assert.equal(h.closes.length, 0); assert.equal(restarted.closes.length, 0);
});

test('missing, approved, issued-ID, inconsistent, and already-closed records produce no confirmation', async () => {
  for (const current of [null, { ...record(), status: 'approved' }, { ...record(), student_id: 'NG-fixture' },
    { ...record(), approved_at: new Date() }, { ...record(), application_closed_by: owner },
    { ...record(), status: 'denied', application_closed_at: new Date('2026-10-17T18:00:00Z'), application_closed_by: owner, application_closed_as: 'withdrawn' }]) {
    const h = await setup({ current }), i = interaction(`cert:closure:choose:denied:${student}`);
    await h.route(i); assert.deepEqual(last(i).components, []); assert.equal(h.closes.length, 0);
  }
});

test('confirmation capacity is bounded and failures expose no database details', async () => {
  const h = await setup();
  for (let n = 0; n < 100; n++) await h.route(interaction(`cert:closure:choose:denied:${student}`));
  const excess = interaction(`cert:closure:choose:denied:${student}`); await h.route(excess); assert.match(last(excess).content, /Too many/);
  const failure = await setup({ closeFailure: true }), choose = interaction(`cert:closure:choose:denied:${student}`);
  await failure.route(choose); const token = confirmationId(choose), confirm = interaction(token);
  await failure.route(confirm); assert.match(last(confirm).content, /Review the current application/);
  assert.ok(!last(confirm).content.includes('Private database'));
  await failure.route(interaction(token)); assert.equal(failure.closes.length, 1);
});
