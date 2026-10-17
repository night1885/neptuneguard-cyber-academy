import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', channelId = '555555555555555555';
const tick = () => new Promise(resolve => setImmediate(resolve));
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
async function until(check) { for (let count = 0; count < 50 && !check(); count++) await tick(); assert.ok(check()); }
function fixture({ overviewQuery } = {}) {
  const content = 'Disposable restored-routing agreement.', hash = createHash('sha256').update(content).digest('hex');
  const client = new EventEmitter(), queries = [], bot = {}, everyone = {}; let ended = 0;
  client.isReady = () => false;
  client.guilds = { async fetch(id) { assert.equal(id, guildId); return { roles: { everyone }, members: { async fetch(id) { assert.equal(id, admin); return { id }; }, async fetchMe() { return bot; } } }; } };
  client.channels = { async fetch(id) { assert.equal(id, channelId); return { guildId, isTextBased: () => true, send() { assert.fail('Startup cannot publish'); }, permissionsFor: member => ({ has: () => member === bot }) }; } };
  const pool = { async query(sql, params) {
    assert.match(sql.trim(), /^SELECT\b/); queries.push({ sql, params });
    if (sql.includes("to_regclass('certification_agreements')")) return { rows: [{ agreements: 'agreements', enrollments: 'enrollments', labs: 'labs', audit: 'audit' }] };
    if (sql.includes('FROM pg_attribute')) return { rows: requiredEnrollmentColumns.map(attname => ({ attname })) };
    if (sql.includes('FROM pg_constraint')) return { rows: [{ conname: 'certification_account_acknowledgment_required', convalidated: true }] };
    if (sql.includes('FROM pg_trigger')) return { rows: (params[0] === 'certification_enrollments' ? ['certification_student_id_immutable'] : ['certification_agreement_immutable', 'certification_agreement_no_truncate']).map(tgname => ({ tgname, tgenabled: 'O' })) };
    if (sql.startsWith('SELECT content')) return { rows: [{ content, content_sha256: hash }] };
    if (sql.includes('COUNT(*)')) return overviewQuery ? overviewQuery() : { rows: [{}] };
    if (sql.startsWith('SELECT status FROM certification_enrollments') || sql.startsWith('SELECT * FROM certification_enrollments')) { assert.deepEqual(params, [student]); return { rows: [] }; }
    assert.fail(`Unexpected SQL: ${sql}`);
  }, connect() { assert.fail('These routing tests must not write learner records'); }, async end() { ended++; } };
  const runtime = attachCertificationRuntime(client, {}, guildId, { CERTIFICATION_ENABLED: 'true', ACADEMY_OWNER_ID: admin, ACADEMY_ADMIN_CHANNEL_ID: channelId,
    CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'v1', agreementSha256: hash, comprehensionCheck: { version: 'check1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } })
  }, { createPool: () => pool });
  function interaction(customId, { actor = admin, kind = 'button', values = ['courses'] } = {}) {
    const replies = [], forms = [], calls = [];
    const i = { customId, user: { id: actor }, guildId, values, deferred: false, replied: false,
      isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'menu',
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); calls.push('reply'); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; calls.push('deferReply'); },
      async editReply(payload) { replies.push(payload); calls.push('editReply'); },
      async showModal(payload) { forms.push(payload); calls.push('showModal'); }
    };
    return { i, replies, forms, calls };
  }
  return { client, runtime, queries, interaction, ended: () => ended,
    async start() { client.emit('clientReady'); await until(() => runtime.ready); },
    async dispatch(x) { client.emit('interactionCreate', x.i); await until(() => x.replies.length > 0 || x.forms.length > 0); } };
}
test('ready runtime connects main admin dashboard and curriculum dropdown to their original handlers', async () => {
  const f = fixture();
  try {
    await f.start(); const dashboard = f.interaction('cert:admin:overview:0'); await f.dispatch(dashboard);
    const controls = dashboard.replies[0].components.flatMap(row => json(row).components);
    assert.ok(controls.some(control => control.custom_id === 'cert:register:open'));
    assert.ok(controls.find(control => control.custom_id === 'cert:admin:section').options.some(option => option.value === 'courses'));
    const reads = f.queries.length, courses = f.interaction('cert:admin:section', { kind: 'menu' }); await f.dispatch(courses);
    assert.match(json(courses.replies[0].embeds[0]).title, /Course Overview/); assert.equal(f.queries.length, reads);
  } finally { await f.runtime.detach(); }
});
test('ready runtime connects admin registration form without writing or granting access', async () => {
  const f = fixture();
  try {
    await f.start(); const reads = f.queries.length, registration = f.interaction('cert:register:open'); await f.dispatch(registration);
    assert.equal(registration.replies.length, 0); assert.equal(json(registration.forms[0]).custom_id, 'cert:register:submit');
    assert.equal(f.queries.length, reads);
  } finally { await f.runtime.detach(); }
});
test('ready runtime connects learner application console without granting course access', async () => {
  const f = fixture();
  try {
    await f.start(); const x = f.interaction('cert:initial:home', { actor: student }); await f.dispatch(x);
    assert.equal(x.replies[0].embeds[0].title, 'NeptuneGuard — Initial student console');
    assert.equal(x.replies[0].embeds[0].fields.find(field => field.name === 'Course access').value, 'Not available');
    const controls = x.replies[0].components.flatMap(row => json(row).components);
    assert.ok(controls.some(control => control.custom_id === 'cert:learner:home' && control.disabled));
  } finally { await f.runtime.detach(); }
});
test('ready runtime rejects non-admin dashboard actions before learner-record queries', async () => {
  const f = fixture();
  try {
    await f.start(); const reads = f.queries.length, x = f.interaction('cert:admin:section', { actor: student, kind: 'menu' }); await f.dispatch(x);
    assert.match(x.replies[0].content, /Admin authorization/); assert.equal(f.queries.length, reads);
    assert.deepEqual(x.replies[0].allowedMentions, { parse: [] });
  } finally { await f.runtime.detach(); }
});
test('runtime sanitizes router failures and clears stale reply contents', async () => {
  const f = fixture({ overviewQuery() { throw new Error('PRIVATE-DATABASE-DETAIL'); } }), logs = [], original = console.error;
  try {
    console.error = (...args) => logs.push(args); await f.start();
    const x = f.interaction('cert:admin:overview:0'); await f.dispatch(x);
    assert.match(x.replies[0].content, /check the current status before retrying/);
    assert.deepEqual(x.replies[0].embeds, []); assert.deepEqual(x.replies[0].components, []);
    assert.doesNotMatch(JSON.stringify([logs, x.replies]), /PRIVATE-DATABASE-DETAIL/);
  } finally { console.error = original; await f.runtime.detach(); }
});
test('detach drains an admitted dashboard query, rejects later work, and closes once', async () => {
  let release, entered = false;
  const pending = new Promise(resolve => { release = resolve; });
  const f = fixture({ overviewQuery() { entered = true; return pending; } });
  try {
    await f.start(); const first = f.interaction('cert:admin:overview:0'); f.client.emit('interactionCreate', first.i); await until(() => entered);
    const closing = f.runtime.detach(); assert.equal(f.runtime.detach(), closing);
    const late = f.interaction('cert:admin:overview:0'); f.client.emit('interactionCreate', late.i); await tick();
    assert.equal(f.ended(), 0); assert.equal(late.calls.length, 0);
    release({ rows: [{}] }); await closing;
    assert.equal(first.replies.length, 1); assert.equal(f.ended(), 1); assert.equal(f.runtime.ready, false);
  } finally { release({ rows: [{}] }); await f.runtime.detach(); }
});
