import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createClosureRuntimeRouter, readApplicationClosureFlag } from './certification-application-closure-runtime.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createRestorationRouter } from './certification-restoration-router.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';

const owner = '1223123544301633567', guildId = '1339276399390887957';
const config = { enabled: true, ownerId: owner, adminChannelId: '1339276399390887956' };
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable' };
const tick = () => new Promise(resolve => setImmediate(resolve));
function interaction(id = 'cert:closure:open:1223123544301633568') {
  const messages = []; return { customId: id, user: { id: owner }, guildId, messages, isButton: () => true, isModalSubmit: () => false,
    async reply(payload) { messages.push(payload); }, async editReply(payload) { messages.push(payload); } };
}
function startupFixture() {
  let ended = 0, guildLookups = 0; const everyone = {}, me = {};
  const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { guildLookups++; return { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return me; } } }; } };
  client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('No startup publication'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
  const pool = { async end() { ended++; }, async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'a', enrollments: 'e', labs: 'l', audit: 'u' }] };
    if (sql.includes('pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('pg_constraint')) return { rows: [{ conname: 'certification_account_acknowledgment_required', convalidated: true }] };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: 'O' })) };
    throw new Error('Unexpected startup query');
  } };
  return { client, pool, get ended() { return ended; }, get guildLookups() { return guildLookups; } };
}

test('closure flag is default-off and strictly validated', () => {
  assert.equal(readApplicationClosureFlag(), false); assert.equal(readApplicationClosureFlag({ CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false' }), false);
  assert.equal(readApplicationClosureFlag({ CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }), true);
  for (const value of ['yes', '', true, 1, null]) assert.throws(() => readApplicationClosureFlag({ CERTIFICATION_APPLICATION_CLOSURE_ENABLED: value }), /Invalid application closure flag/);
});

test('closure wrapper waits for readiness, shares initialization, and stops routing after disposal', async () => {
  let release, calls = 0; const base = async () => { calls++; return true; };
  const route = createClosureRuntimeRouter({}, config, guildId, { createBaseRouter: () => base,
    async createClosureRouter(pool, settings, guild, options) { await new Promise(resolve => { release = resolve; }); assert.equal(options.createBaseRouter(), base); return base; } });
  const before = interaction(); await route(before); assert.equal(calls, 0); assert.equal(before.messages[0].flags, 64);
  const first = route.initialize(); assert.equal(route.initialize(), first); await tick();
  await route(interaction()); assert.equal(calls, 0); release(); await first;
  await route(interaction()); assert.equal(calls, 1); route.dispose();
  await route(interaction()); assert.equal(calls, 1); await assert.rejects(route.initialize(), /disposed/);
});

test('closure wrapper cannot become active after shutdown during readiness', async () => {
  let release, calls = 0;
  const route = createClosureRuntimeRouter({}, config, guildId, { createBaseRouter: () => async () => true,
    async createClosureRouter() { await new Promise(resolve => { release = resolve; }); return async () => { calls++; return true; }; } });
  const pending = route.initialize(); await tick(); route.dispose(); release();
  await assert.rejects(pending, /shutdown/); await route(interaction()); assert.equal(calls, 0);
});

test('closure wrapper preserves the restoration router section-login boundary', async () => {
  const pool = { async query() { assert.fail('Raw lesson must not query or authorize'); } };
  const route = createClosureRuntimeRouter(pool, config, guildId, { createBaseRouter: createRestorationRouter,
    async createClosureRouter(db, settings, guild, options) { return options.createBaseRouter(); } });
  await route.initialize(); const rawLesson = interaction('cert:lesson:training-readiness:0');
  await route(rawLesson); assert.match(rawLesson.messages[0].content, /Section login is required/); route.dispose();
});

test('default runtime does not construct closure routing', async () => {
  const f = startupFixture();
  const runtime = attachCertificationRuntime(f.client, {}, guildId, env, { createPool: () => f.pool, createRouter: () => async () => true,
    createClosureRouter() { assert.fail('Default-off closure factory must not run'); } });
  f.client.emit('clientReady'); await tick(); await tick(); assert.equal(runtime.ready, true);
  await runtime.detach(); assert.equal(f.ended, 1);
});

test('closure runtime remains unavailable until closure initialization completes', async () => {
  const f = startupFixture(); let release, routed = 0, initialized = 0, disposed = 0;
  const runtime = attachCertificationRuntime(f.client, {}, guildId, { ...env, CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }, {
    createPool: () => f.pool, createRouter: () => async () => true,
    createClosureRouter(pool, settings, guild, options) {
      assert.equal(pool, f.pool); assert.equal(guild, guildId); assert.equal(typeof options.createBaseRouter, 'function');
      const route = async () => { routed++; return true; };
      route.initialize = () => { initialized++; return new Promise(resolve => { release = resolve; }); };
      route.dispose = () => { disposed++; }; return route;
    } });
  f.client.emit('clientReady'); await tick(); assert.equal(initialized, 1); assert.equal(runtime.ready, false); assert.equal(f.guildLookups, 0);
  const held = interaction(); f.client.emit('interactionCreate', held); await tick(); assert.equal(routed, 0); assert.equal(held.messages[0].flags, 64);
  release(); await tick(); await tick(); assert.equal(runtime.ready, true); assert.equal(f.guildLookups, 1);
  f.client.emit('interactionCreate', interaction()); await tick(); assert.equal(routed, 1);
  await runtime.detach(); assert.equal(disposed, 1); assert.equal(f.ended, 1);
});

test('closure readiness failure blocks Discord startup and interactions', async () => {
  const f = startupFixture(); let calls = 0;
  const runtime = attachCertificationRuntime(f.client, {}, guildId, { ...env, CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }, {
    createPool: () => f.pool, createClosureRouter() { const route = async () => { calls++; return true; }; route.initialize = async () => { throw new Error('Readiness blocked'); }; return route; } });
  f.client.emit('clientReady'); await tick(); await tick(); assert.equal(runtime.ready, false); assert.equal(f.guildLookups, 0);
  f.client.emit('interactionCreate', interaction()); await tick(); assert.equal(calls, 0); await runtime.detach();
});

test('shutdown waits for closure initialization before ending the owned pool', async () => {
  const f = startupFixture(); let release, disposed = 0;
  const runtime = attachCertificationRuntime(f.client, {}, guildId, { ...env, CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }, {
    createPool: () => f.pool, createClosureRouter() { const route = async () => true;
      route.initialize = () => new Promise(resolve => { release = resolve; }); route.dispose = () => { disposed++; }; return route; } });
  f.client.emit('clientReady'); await tick(); const closing = runtime.detach();
  assert.equal(runtime.detach(), closing); assert.equal(disposed, 1); await tick(); assert.equal(f.ended, 0);
  release(); await closing; assert.equal(f.ended, 1); assert.equal(runtime.ready, false); assert.equal(f.guildLookups, 0);
});

test('invalid flags or disabled certification fail before creating a database pool', () => {
  const f = startupFixture(); let pools = 0;
  for (const environment of [{ ...env, CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'yes' }, { CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }]) {
    assert.throws(() => attachCertificationRuntime(f.client, {}, guildId, environment, { createPool() { pools++; return f.pool; } }));
  }
  assert.equal(pools, 0); assert.equal(f.client.eventNames().length, 0);
});
