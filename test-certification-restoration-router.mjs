import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRestorationRouter } from './certification-restoration-router.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const owner = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', other = '444444444444444444';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => (payload.components || []).flatMap(row => json(row).components);
function fixture() {
  let time = 0; const queries = [];
  const config = { enabled: true, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
  const record = { discord_user_id: student, status: 'approved', student_id: 'NG-PT-fixture', approved_by: owner, approved_at: 'recorded', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded',
    learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
  const pool = { async query(sql, params) {
    assert.match(sql.trim(), /^SELECT\b/); queries.push({ sql, params });
    if (sql.includes('COUNT(*)')) return { rows: [{}] };
    assert.match(sql, /^SELECT \* FROM certification_enrollments/); assert.deepEqual(params, [student]); return { rows: [structuredClone(record)] };
  }, connect() { assert.fail('Protected section navigation must not write records'); } };
  const route = createRestorationRouter(pool, config, guildId, { now: () => time });
  async function run(customId, options = {}) {
    const replies = [], modals = [], deferrals = [], actor = options.actor || student;
    const i = { customId, user: { id: actor }, guildId: options.server === undefined ? guildId : options.server, deferred: false, replied: false,
      message: { flags: { has: () => true }, interactionMetadata: { user: { id: actor } } },
      isButton: () => !options.modal, isModalSubmit: () => Boolean(options.modal), isStringSelectMenu: () => false,
      fields: { getTextInputValue(key) { assert.equal(key, 'student_id'); return options.wrongId ? 'PRIVATE-WRONG-ID' : 'NG-PT-fixture'; } },
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; deferrals.push('reply'); },
      async deferUpdate() { this.deferred = true; deferrals.push('update'); },
      async editReply(payload) { assert.equal(this.deferred || this.replied, true); replies.push(payload); },
      async showModal(payload) { modals.push(json(payload)); } };
    assert.equal(await route(i), true); return { replies, modals, deferrals };
  }
  async function enter() {
    const contents = await run('cert:contents');
    const entry = controls(contents.replies[0]).find(item => item.custom_id === 'cert:section:open:training-readiness'); assert.ok(entry);
    const opened = await run(entry.custom_id); assert.equal(opened.modals.length, 1);
    const verified = await run(opened.modals[0].custom_id, { modal: true }); return verified;
  }
  return { run, enter, record, queries, advance() { time += 300000; } };
}
test('contents opens ID confirmation and verified modal renders the existing lesson without double acknowledgment', async () => {
  const f = fixture(), verified = await f.enter();
  assert.deepEqual(verified.deferrals, ['reply']); assert.match(json(verified.replies[0].embeds[0]).title, /Training readiness — 1\/3/);
  const items = controls(verified.replies[0]); assert.ok(items.some(item => /:lesson:1$/.test(item.custom_id)));
  assert.ok(!items.some(item => /^cert:(lesson|help):/.test(item.custom_id)));
});
test('protected next-page and help buttons recheck enrollment and update the private panel', async () => {
  const f = fixture(), first = await f.enter(), before = f.queries.length;
  const next = controls(first.replies[0]).find(item => /:lesson:1$/.test(item.custom_id));
  const second = await f.run(next.custom_id); assert.deepEqual(second.deferrals, ['update']);
  assert.match(json(second.replies[0].embeds[0]).title, /2\/3/); assert.equal(f.queries.length, before + 1);
  const help = controls(second.replies[0]).find(item => /:help:1$/.test(item.custom_id));
  const helped = await f.run(help.custom_id); assert.match(helped.replies[0].content, /step 2\/3/); assert.equal(f.queries.length, before + 2);
});
for (const id of ['cert:lesson:training-readiness:0', 'cert:lesson:training-readiness:1', 'cert:help:training-readiness:0']) {
  test(`raw lesson route cannot bypass ID confirmation ${id}`, async () => {
    const f = fixture(), denied = await f.run(id); assert.match(denied.replies[0].content, /Section login/); assert.equal(f.queries.length, 0);
  });
}
test('wrong ID does not render lesson content or echo the entered ID', async () => {
  const f = fixture(), opened = await f.run('cert:section:open:training-readiness');
  const denied = await f.run(opened.modals[0].custom_id, { modal: true, wrongId: true });
  assert.deepEqual(denied.replies[0].embeds, []); assert.doesNotMatch(JSON.stringify(denied.replies), /PRIVATE-WRONG-ID|cert:section:page:/);
});
for (const options of [{ actor: other }, { server: null }, { server: other }]) {
  test(`navigation token rejects another identity or server ${JSON.stringify(options)}`, async () => {
    const f = fixture(), first = await f.enter(), next = controls(first.replies[0]).find(item => /:lesson:1$/.test(item.custom_id)), before = f.queries.length;
    const denied = await f.run(next.custom_id, options); assert.match(denied.replies[0].content, /Section login/); assert.equal(f.queries.length, before);
  });
}
test('expired section navigation requires a new ID confirmation without querying records', async () => {
  const f = fixture(), first = await f.enter(), next = controls(first.replies[0]).find(item => /:lesson:1$/.test(item.custom_id)), before = f.queries.length;
  f.advance(); const denied = await f.run(next.custom_id); assert.match(denied.replies[0].content, /Section login/); assert.equal(f.queries.length, before);
});
test('suspension invalidates the section grant and cannot be bypassed by replay after reinstatement', async () => {
  const f = fixture(), first = await f.enter(), next = controls(first.replies[0]).find(item => /:lesson:1$/.test(item.custom_id));
  f.record.status = 'suspended'; const denied = await f.run(next.custom_id); assert.match(denied.replies[0].content, /Section login/);
  f.record.status = 'approved'; const before = f.queries.length; await f.run(next.custom_id); assert.equal(f.queries.length, before);
});
test('leaving the section through student home invalidates its old navigation token', async () => {
  const f = fixture(), first = await f.enter(), next = controls(first.replies[0]).find(item => /:lesson:1$/.test(item.custom_id));
  await f.run('cert:learner:home'); const before = f.queries.length; const denied = await f.run(next.custom_id);
  assert.match(denied.replies[0].content, /Section login/); assert.equal(f.queries.length, before);
});
test('original admin dashboard and owner registration form remain available without student ID login', async () => {
  const f = fixture(), dashboard = await f.run('cert:admin:overview:0', { actor: owner });
  assert.match(json(dashboard.replies[0].embeds[0]).title, /Admin Dashboard/);
  const registration = await f.run('cert:register:open', { actor: owner }); assert.equal(registration.modals[0].custom_id, 'cert:register:submit');
});
test('runtime accepts explicit router construction with its owned pool', async () => {
  const client = new EventEmitter(); client.isReady = () => false; let constructed = 0, ended = 0;
  const pool = { async end() { ended++; } };
  const runtime = attachCertificationRuntime(client, undefined, guildId, { CERTIFICATION_ENABLED: 'true', CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable' }, {
    createPool: () => pool, createRouter(database, config, server) { assert.equal(database, pool); assert.equal(config.enabled, true); assert.equal(server, guildId); constructed++; return async () => true; }
  });
  assert.equal(constructed, 1); await runtime.detach(); assert.equal(ended, 1);
});
test('staged restoration application selects the section-aware router without activating production startup', async () => {
  const client = new EventEmitter(); client.isReady = () => false; client.login = async () => {}; client.destroy = async () => {}; let selected;
  const app = createRestoredCertificationApplication({ client, guildId, signals: new EventEmitter(), log() {}, exit() {},
    env: { CERTIFICATION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: other, CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'v1', agreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1', questions: [{ prompt: 'Type A.' }], correctAnswers: ['A'] } }) },
    attachRuntime(_client, _pool, _guild, _env, options) { selected = options.createRouter; return { enabled: true, ready: false, async detach() {} }; }
  });
  assert.equal(selected, createRestorationRouter); await app.shutdown();
});
