import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createAcademyCourseGate, isAcademyCourseInteraction } from './certification-academy-course-gate.js';
import { createAcademyApplication } from './certification-academy-application.js';
import { createCertificationService } from './certification-service.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const admin = '111111111111111111', student = '222222222222222222', guild = '333333333333333333', role = '444444444444444444';
const config = { enabled: true, ownerId: admin, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
const approved = () => ({ discord_user_id: student, status: 'approved', student_id: 'NG-PT-fixture', approved_by: admin, approved_at: 'recorded', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded', learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION });
const routes = [['command', 'begin'], ['command', 'continue'], ...['linux-open-m1', 'linux-open-m2', 'linux-m1-lesson', 'linux-m1-quiz', 'linux-m1-lesson-complete', 'linux-m2-answer-a', 'academy:linux-administration:1:open', 'academy:linux-administration:1:answer-a', 'academy:linux-administration:1:lab-complete'].map(id => ['button', id])];
function fixture(options = {}) {
  let record = Object.hasOwn(options, 'record') ? options.record : approved();
  const queries = [];
  const pool = { async query(sql, params) {
    assert.match(sql, /^SELECT \* FROM certification_enrollments/); assert.deepEqual(params, [student]); queries.push({ sql, params });
    if (options.databaseFails) throw new Error('PRIVATE-DATABASE');
    return { rows: record ? [record] : [] };
  }, connect() { assert.fail('Authorization cannot write'); } };
  const service = createCertificationService(pool, config);
  const runtime = { enabled: options.enabled ?? true, ready: options.ready ?? true, getCourseAuthorization: id => service.getCourseAuthorization(id), async detach() { this.ready = false; } };
  const gate = createAcademyCourseGate({ certification: runtime, guildId: guild, verifiedRoleId: options.roleId ?? role });
  function interaction(kind = 'command', id = 'continue', changes = {}) {
    const replies = [], deferrals = [];
    const i = { user: { id: student }, guildId: guild, customId: kind === 'button' ? id : undefined, commandName: kind === 'command' ? id : undefined,
      isButton: () => kind === 'button', isChatInputCommand: () => kind === 'command', isModalSubmit: () => false,
      guild: { id: guild, members: { async fetch(userId) {
        assert.equal(userId, student);
        if (options.roleFails) throw new Error('PRIVATE-ROLE');
        return { id: student, roles: { cache: { has: roleId => roleId === role && options.verified !== false } } };
      } } }, deferred: false, replied: false,
      async deferReply(payload) { assert.equal(this, i); assert.equal(payload.flags, 64); this.deferred = true; deferrals.push(payload); },
      async reply(payload) { assert.equal(this, i); this.replied = true; replies.push(payload); },
      async editReply(payload) { assert.equal(this, i); replies.push(payload); }, ...changes };
    return { i, replies, deferrals };
  }
  return { runtime, gate, queries, interaction, setRecord(value) { record = value; } };
}
for (const [kind, id] of routes) {
  test(`${id}: missing and restricted enrollments cannot reach a course handler`, async () => {
    for (const status of [null, 'awaiting_acknowledgment', 'pending', 'denied', 'suspended', 'revoked']) {
      const f = fixture({ record: status === null ? null : { ...approved(), status } }), x = f.interaction(kind, id);
      assert.equal(isAcademyCourseInteraction(x.i), true);
      assert.equal(await f.gate(x.i), null); assert.equal(f.queries.length, 1); assert.equal(x.deferrals.length, 1);
      assert.match(x.replies[0].content, /Admin-approved certification enrollment/);
      assert.deepEqual(x.replies[0].components, []); assert.deepEqual(x.replies[0].allowedMentions, { parse: [] });
    }
  });
  test(`${id}: approved current enrollment admits without double acknowledgment`, async () => {
    const f = fixture(), x = f.interaction(kind, id), admitted = await f.gate(x.i);
    assert.ok(admitted); await admitted.deferReply({ flags: 64 });
    assert.equal(x.deferrals.length, 1); assert.equal(x.replies.length, 0); assert.equal(f.queries.length, 1);
    await admitted.editReply({ content: 'fixture handler' }); assert.equal(x.replies.length, 1);
  });
}
test('incomplete and stale approved records remain blocked', async () => {
  for (const change of [{ student_id: '  ' }, { student_id: null }, { student_id: 123 }, { approved_by: null }, { approved_at: null }, { signature_method: 'legacy' }, { age_eligible: false }, { age_declaration_version: 'old' }, { agreement_version: 'old' }, { agreement_content_sha256: 'b'.repeat(64) }, { comprehension_check_version: 'old' }]) {
    const f = fixture({ record: { ...approved(), ...change } }), x = f.interaction();
    assert.equal(await f.gate(x.i), null); assert.equal(f.queries.length, 1);
  }
});
test('disabled, unready, unverified, wrong-server and invalid-role contexts fail closed before certification queries', async () => {
  for (const options of [{ enabled: false }, { ready: false }, { verified: false }, { roleFails: true }, { roleId: 'invalid' }, { wrongServer: true }, { directMessage: true }]) {
    const f = fixture(options), x = f.interaction();
    if (options.wrongServer) x.i.guildId = admin;
    if (options.directMessage) { x.i.guildId = null; x.i.guild = null; }
    assert.equal(await f.gate(x.i), null); assert.equal(f.queries.length, 0);
    assert.doesNotMatch(JSON.stringify(x.replies), /PRIVATE/);
  }
});
test('database failures deny access without leaking errors', async () => {
  const f = fixture({ databaseFails: true }), x = f.interaction();
  assert.equal(await f.gate(x.i), null); assert.match(x.replies[0].content, /could not be verified/);
  assert.doesNotMatch(JSON.stringify(x.replies), /PRIVATE/);
});
test('old buttons recheck suspension and revocation rather than caching admission', async () => {
  const f = fixture();
  for (const status of ['approved', 'suspended', 'revoked', 'approved']) {
    f.setRecord({ ...approved(), status }); const x = f.interaction('button', 'linux-m1-quiz');
    assert.equal(Boolean(await f.gate(x.i)), status === 'approved');
  }
  assert.equal(f.queries.length, 4);
});
test('onboarding, status and historical-report routes remain outside the course gate', async () => {
  const f = fixture({ enabled: false, ready: false });
  for (const [kind, id] of [...['start', 'catalog', 'progress', 'badges', 'student-progress'].map(id => ['command', id]), ...['cert:initial:home', 'cert:submit:status', 'cert:invite:start', 'cert:register:open', 'badge-page:0'].map(id => ['button', id])]) {
    const x = f.interaction(kind, id); assert.equal(await f.gate(x.i), x.i);
    assert.equal(x.deferrals.length, 0); assert.equal(x.replies.length, 0);
  }
  assert.equal(f.queries.length, 0);
});
test('application retention hold overrides course admission and start but leaves catalog available', async () => {
  const f = fixture();
  const client = new EventEmitter(), signals = new EventEmitter(), handled = [], exits = [];
  client.login = async () => {}; client.destroy = () => {};
  const application = createAcademyApplication({ client, signals, guildId: guild, env: { VERIFIED_ROLE_ID: role },
    pool: { async end() {}, query() { assert.fail('Held workflows must not query academy records'); } },
    initializeDatabase: async () => {}, attachRuntime: () => f.runtime, exit: code => exits.push(code), log() {},
    async handleInteraction(i) { handled.push(i.commandName || i.customId); await i.deferReply({ flags: 64 }); } });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    await application.start('fixture-only');
    for (const [kind, id] of [['command', 'start'], ['command', 'begin'], ['command', 'continue'], ['button', 'linux-m1-quiz'], ['button', 'academy:linux-administration:1:lab-complete']]) {
      const x = f.interaction(kind, id); client.emit('interactionCreate', x.i); await tick();
      assert.equal(x.replies.length, 1); assert.match(x.replies[0].content, /dashboard and registration integration checks/); assert.equal(x.deferrals.length, 0);
    }
    assert.equal(handled.length, 0); assert.equal(f.queries.length, 0);
    const catalog = f.interaction('command', 'catalog'); client.emit('interactionCreate', catalog.i); await tick();
    assert.deepEqual(handled, ['catalog']); assert.equal(catalog.deferrals.length, 1);
  } finally { await application.shutdown(); }
  assert.deepEqual(exits, [0]);
});
