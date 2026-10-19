import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';

const owner = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', channelId = '555555555555555555';
const tick = () => new Promise(resolve => setImmediate(resolve));
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
async function until(predicate) { for (let i = 0; i < 100 && !predicate(); i++) await tick(); assert.ok(predicate(), 'Composed fixture did not reach expected state'); }
function fixture({ overviewQuery } = {}) {
  const content = 'Disposable restored application composition fixture.', hash = createHash('sha256').update(content).digest('hex');
  const client = new EventEmitter(), signals = new EventEmitter(), queries = [], calls = [], exits = [], logs = [], bot = {}, everyone = {};
  client.isReady = () => false; client.login = async () => { calls.push('login'); }; client.destroy = async () => { calls.push('discord-destroyed'); };
  client.guilds = { async fetch(id) { assert.equal(id, guildId); return { roles: { everyone }, members: { async fetch(id) { assert.equal(id, owner); return { id }; }, async fetchMe() { return bot; } } }; } };
  client.channels = { async fetch(id) { assert.equal(id, channelId); return { guildId, isTextBased: () => true, send() { assert.fail('Composition startup must not publish'); }, permissionsFor: member => ({ has: () => member === bot }) }; } };
  const database = { async query(sql, params) {
    assert.match(sql.trim(), /^SELECT\b/); assert.doesNotMatch(sql, /\b(learner_profiles|learner_module_progress|learner_badges)\b/); queries.push({ sql, params });
    if (sql.includes("to_regclass('certification_agreements')")) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('FROM pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('FROM pg_constraint')) return { rows: [{ conname: 'certification_account_acknowledgment_required', convalidated: true }] };
    if (sql.includes('FROM pg_trigger')) return { rows: (params[0] === 'certification_enrollments' ? ['certification_student_id_immutable'] : ['certification_agreement_immutable','certification_agreement_no_truncate']).map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('COUNT(*)')) return overviewQuery ? overviewQuery() : { rows: [{}] };
    assert.fail(`Unexpected composition SQL: ${sql}`);
  }, connect() { assert.fail('Composition routing must not write records'); }, async end() { calls.push('certification-pool-closed'); } };
  const env = { CERTIFICATION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: channelId, CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'composition-fixture', agreementSha256: hash, comprehensionCheck: { version: 'composition-check', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } }) };
  const app = createRestoredCertificationApplication({ client, guildId, env, signals, exit: code => exits.push(code), log: message => logs.push(message),
    attachRuntime(actualClient, academyPool, actualGuild, environment, options) {
      assert.equal(academyPool, undefined); assert.equal(typeof options.createRouter, 'function');
      return attachCertificationRuntime(actualClient, academyPool, actualGuild, environment, { ...options, createPool: () => database });
    } });
  function interaction(customId, { actor = owner, server = guildId, kind = 'button', values = ['courses'] } = {}) {
    const replies = [], forms = [];
    const i = { customId, guildId: server, user: { id: actor }, values, deferred: false, replied: false,
      isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'menu',
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
      async editReply(payload) { replies.push(payload); }, async showModal(payload) { forms.push(payload); } };
    return { i, replies, forms };
  }
  return { app, client, signals, queries, calls, exits, logs, interaction,
    async start() { await app.start('synthetic-composition-fixture'); assert.equal(app.ready, false); client.emit('clientReady'); await until(() => app.ready); },
    async dispatch(x) { client.emit('interactionCreate', x.i); await until(() => x.replies.length > 0 || x.forms.length > 0); } };
}

test('composed restoration reaches original dashboard and curriculum without legacy handlers or publication', async () => {
  const f = fixture();
  try {
    await f.start(); const dashboard = f.interaction('cert:admin:overview:0'); await f.dispatch(dashboard);
    const controls = dashboard.replies[0].components.flatMap(row => json(row).components.map(json));
    assert.ok(controls.some(control => control.custom_id === 'cert:register:open'));
    assert.ok(controls.find(control => control.custom_id === 'cert:admin:section').options.some(option => option.value === 'courses'));
    const before = f.queries.length, courses = f.interaction('cert:admin:section', { kind: 'menu' }); await f.dispatch(courses);
    assert.match(json(courses.replies[0].embeds[0]).title, /Course Overview/); assert.equal(f.queries.length, before);
    const registration = f.interaction('cert:register:open'); await f.dispatch(registration);
    assert.equal(json(registration.forms[0]).custom_id, 'cert:register:submit'); assert.equal(f.queries.length, before);
  } finally { await f.app.shutdown(); }
  assert.deepEqual(f.exits, [0]); assert.equal(f.client.eventNames().length, 0); assert.equal(f.signals.eventNames().length, 0);
  assert.equal(f.calls.filter(call => call === 'certification-pool-closed').length, 1);
  assert.ok(f.calls.indexOf('certification-pool-closed') < f.calls.indexOf('discord-destroyed'));
});
test('composed restoration blocks raw lesson routes and forged section sessions before record access', async () => {
  const f = fixture();
  try {
    await f.start(); const before = f.queries.length;
    for (const customId of ['cert:lesson:training-readiness:0','cert:help:training-readiness:0','cert:section:page:00000000-0000-4000-8000-000000000000:lesson:0']) {
      const x = f.interaction(customId, { actor: student }); await f.dispatch(x);
      assert.match(x.replies[0].content, /Section login is required/); assert.deepEqual(x.replies[0].embeds, []);
      assert.deepEqual(x.replies[0].allowedMentions, { parse: [] }); assert.equal(f.queries.length, before);
    }
  } finally { await f.app.shutdown(); }
});
test('composed restoration denies foreign admin context without record queries', async () => {
  const f = fixture();
  try {
    await f.start(); const before = f.queries.length;
    for (const options of [{ actor: student }, { server: '666666666666666666' }]) {
      const x = f.interaction('cert:admin:section', { ...options, kind: 'menu' }); await f.dispatch(x);
      assert.match(x.replies[0].content, /Admin authorization/); assert.equal(f.queries.length, before);
    }
  } finally { await f.app.shutdown(); }
});
test('composed application shutdown drains the real runtime before closing its pool and client', async () => {
  let release, entered = false; const pending = new Promise(resolve => { release = resolve; });
  const f = fixture({ overviewQuery() { entered = true; return pending; } });
  try {
    await f.start(); const first = f.interaction('cert:admin:overview:0'); f.client.emit('interactionCreate', first.i); await until(() => entered);
    const closing = f.app.shutdown(); assert.equal(f.app.shutdown(), closing); assert.equal(f.app.ready, false);
    const late = f.interaction('cert:admin:overview:0'); f.client.emit('interactionCreate', late.i); await tick();
    assert.equal(late.replies.length, 0); assert.ok(!f.calls.includes('certification-pool-closed')); assert.ok(!f.calls.includes('discord-destroyed'));
    release({ rows: [{}] }); await closing; assert.equal(first.replies.length, 1); assert.deepEqual(f.exits, [0]);
    assert.ok(f.calls.indexOf('certification-pool-closed') < f.calls.indexOf('discord-destroyed'));
  } finally { release({ rows: [{}] }); await f.app.shutdown(); }
});
