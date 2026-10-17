import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { createCourseRuntimeRouter, readCourseRuntimeOptions } from './certification-course-runtime.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createRestorationRouter } from './certification-restoration-router.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';

const owner = '1223123544301633567', actor = '1223123544301633568', guildId = '1339276399390887957', roleId = '1339276399390887959';
const config = { enabled: true, ownerId: owner, adminChannelId: '1339276399390887956' };
const content = 'Disposable course runtime fixture.', hash = createHash('sha256').update(content).digest('hex');
const manifest = JSON.stringify({ agreementVersion: 'course-runtime-fixture', agreementSha256: hash, comprehensionCheck: { version: 'fixture-check', questions: [{ prompt: 'Fixture only.' }], correctAnswers: ['stop'] } });
const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: manifest };
const tick = () => new Promise(resolve => setImmediate(resolve));
function interaction(customId, verified = true) {
  return { customId, user: { id: actor }, guildId, guild: { id: guildId, members: { async fetch(id) { return { id, roles: { cache: new Set(verified ? [roleId] : []) } }; } } },
    deferred: false, replied: false, messages: [], isButton: () => true, isModalSubmit: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; this.messages.push(payload); }, async editReply(payload) { this.messages.push(payload); } };
}
function startupFixture() {
  let ended = 0, lookups = 0; const everyone = {}, me = {};
  const client = new EventEmitter(); client.isReady = () => false;
  client.guilds = { async fetch() { lookups++; return { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return me; } } }; } };
  client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('No startup publication'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
  const pool = { async end() { ended++; }, async query(sql) {
    if (sql.includes('AS agreements')) return { rows: [{ agreements: 'a', enrollments: 'e', labs: 'l', audit: 'u' }] };
    if (sql.includes('pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('pg_constraint')) return { rows: [{ conname: 'certification_account_acknowledgment_required', convalidated: true }] };
    if (sql.includes('pg_trigger')) return { rows: ['certification_student_id_immutable', 'certification_agreement_immutable', 'certification_agreement_no_truncate'].map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
    throw new Error('Unexpected startup query');
  } };
  return { client, pool, get ended() { return ended; }, get lookups() { return lookups; } };
}

test('course runtime flag is strict/default-off and requires Verified role only when enabled', () => {
  assert.deepEqual(readCourseRuntimeOptions(), { enabled: false });
  assert.deepEqual(readCourseRuntimeOptions({ CERTIFICATION_COURSES_ENABLED: 'false', VERIFIED_ROLE_ID: 'unused-invalid' }), { enabled: false });
  assert.deepEqual(readCourseRuntimeOptions({ CERTIFICATION_COURSES_ENABLED: 'true', VERIFIED_ROLE_ID: roleId }), { enabled: true, verifiedRoleId: roleId });
  for (const flag of ['yes', '', true, null]) assert.throws(() => readCourseRuntimeOptions({ CERTIFICATION_COURSES_ENABLED: flag }), /Invalid course/);
  assert.throws(() => readCourseRuntimeOptions({ CERTIFICATION_COURSES_ENABLED: 'true' }), /Verified role/);
});

test('course wrapper awaits base initialization and navigation readiness before routing', async () => {
  const order = []; let release, handled = 0;
  const base = async () => { order.push('base-route'); return false; }; base.initialize = async () => { order.push('base-ready'); };
  const route = createCourseRuntimeRouter({}, config, guildId, { verifiedRoleId: roleId, createBaseRouter: () => base,
    async createNavigation() { order.push('course-start'); await new Promise(resolve => { release = resolve; }); return { async handle() { handled++; return true; }, dispose() {} }; } });
  const first = route.initialize(); assert.equal(route.initialize(), first); await tick();
  await route(interaction('cert:course:open:linux-fundamentals')); assert.equal(handled, 0);
  assert.deepEqual(order, ['base-ready', 'course-start']); release(); await first;
  await route(interaction('cert:course:open:linux-fundamentals')); assert.equal(handled, 1); route.dispose();
});

test('catalog is metadata only and entry is appended to private learner panels within component limits', async () => {
  const base = async i => { await i.deferReply({ flags: 64 }); await i.editReply({ content: '', embeds: [{ title: 'Enrollment panel' }], components: [] }); return true; };
  const route = createCourseRuntimeRouter({}, config, guildId, { verifiedRoleId: roleId, createBaseRouter: () => base,
    async createNavigation() { return { async handle() { return true; }, dispose() {} }; } });
  await route.initialize(); const panel = interaction('cert:initial:home'); await route(panel);
  assert.equal(panel.messages.at(-1).components[0].components[0].custom_id, 'cert:course:catalog:0');
  assert.match(panel.messages.at(-1).content, /separate active assignment/);
  const catalog = interaction('cert:course:catalog:0'); await route(catalog);
  assert.match(catalog.messages.at(-1).embeds[0].description, /listing does not grant access/);
  assert.ok(catalog.messages.at(-1).components[0].components.every(button => button.custom_id.startsWith('cert:course:open:')));
  const denied = interaction('cert:course:catalog:0', false); await route(denied); assert.match(denied.messages.at(-1).content, /could not be verified/); route.dispose();
});

test('restoration section-login protections are preserved by base routing', async () => {
  const route = createCourseRuntimeRouter({ async query() { assert.fail('Raw lesson must not query'); } }, config, guildId, { verifiedRoleId: roleId, createBaseRouter: createRestorationRouter,
    async createNavigation() { return { async handle() { assert.fail('Readiness lesson must stay with restoration'); }, dispose() {} }; } });
  await route.initialize(); const lesson = interaction('cert:lesson:training-readiness:0'); await route(lesson);
  assert.match(lesson.messages.at(-1).content, /Section login is required/); route.dispose();
});

test('shutdown disposes completed candidates and the base without reopening navigation', async () => {
  let release, disposed = 0, baseDisposed = 0; const base = async () => true; base.dispose = () => { baseDisposed++; };
  const route = createCourseRuntimeRouter({}, config, guildId, { verifiedRoleId: roleId, createBaseRouter: () => base,
    async createNavigation() { await new Promise(resolve => { release = resolve; }); return { async handle() { assert.fail('Disposed navigation must not run'); }, dispose() { disposed++; } }; } });
  const pending = route.initialize(); await tick(); route.dispose(); release(); await assert.rejects(pending, /stopped/);
  assert.equal(disposed, 1); assert.equal(baseDisposed, 1);
  const i = interaction('cert:course:catalog:0'); await route(i); assert.match(i.messages[0].content, /unavailable/);
});

test('default-off runtime never constructs course routing', async () => {
  const f = startupFixture(); const runtime = attachCertificationRuntime(f.client, {}, guildId, env, { createPool: () => f.pool, createRouter: () => async () => true,
    createCourseRouter() { assert.fail('Default-off factory must not run'); } });
  f.client.emit('clientReady'); await tick(); await tick(); assert.equal(runtime.ready, true);
  await runtime.detach(); assert.equal(f.ended, 1);
});

test('enabled course runtime waits for readiness and drains startup before pool shutdown', async () => {
  const f = startupFixture(); let release, disposed = 0;
  const runtime = attachCertificationRuntime(f.client, {}, guildId, { ...env, CERTIFICATION_COURSES_ENABLED: 'true', VERIFIED_ROLE_ID: roleId }, { createPool: () => f.pool,
    createCourseRouter(pool, settings, guild, options) { assert.equal(options.verifiedRoleId, roleId); const route = async () => true;
      route.initialize = () => new Promise(resolve => { release = resolve; }); route.dispose = () => { disposed++; }; return route; } });
  f.client.emit('clientReady'); await tick(); assert.equal(runtime.ready, false); assert.equal(f.lookups, 0);
  const closing = runtime.detach(); await tick(); assert.equal(f.ended, 0); assert.equal(disposed, 1);
  release(); await closing; assert.equal(f.ended, 1); assert.equal(runtime.ready, false);
});

test('course and closure wrappers compose around the selected base router', async () => {
  const f = startupFixture(), order = [];
  const original = () => { order.push('base'); return async () => true; };
  const runtime = attachCertificationRuntime(f.client, {}, guildId, { ...env, CERTIFICATION_COURSES_ENABLED: 'true', VERIFIED_ROLE_ID: roleId, CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' }, {
    createPool: () => f.pool, createRouter: original,
    createClosureRouter(pool, settings, guild, options) { assert.equal(options.createBaseRouter, original); options.createBaseRouter(pool, settings, guild);
      const route = async () => true; route.initialize = async () => { order.push('closure-ready'); }; route.dispose = () => {}; return route; },
    createCourseRouter(pool, settings, guild, options) { const base = options.createBaseRouter(pool, settings, guild);
      const route = async () => true; route.initialize = async () => { await base.initialize(); order.push('course-ready'); }; route.dispose = () => base.dispose(); return route; } });
  f.client.emit('clientReady'); await tick(); await tick(); assert.equal(runtime.ready, true); assert.deepEqual(order, ['base', 'closure-ready', 'course-ready']);
  await runtime.detach();
});

test('invalid or incomplete course enablement fails before pool creation', () => {
  const f = startupFixture(); let pools = 0;
  for (const environment of [{ ...env, CERTIFICATION_COURSES_ENABLED: 'yes' },
    { CERTIFICATION_ENABLED: 'true', CERTIFICATION_COURSES_ENABLED: 'true', VERIFIED_ROLE_ID: roleId },
    { ...env, CERTIFICATION_COURSES_ENABLED: 'true' }]) {
    assert.throws(() => attachCertificationRuntime(f.client, {}, guildId, environment, { createPool() { pools++; return f.pool; } }));
  }
  assert.equal(pools, 0); assert.equal(f.client.eventNames().length, 0);
});
