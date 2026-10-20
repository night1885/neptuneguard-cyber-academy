import test from 'node:test';
import assert from 'node:assert/strict';
import { createSectionLoginHandler } from './certification-section-login.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const owner = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', other = '444444444444444444', permanentId = 'NG-PT-fixture';
function fixture(options = {}) {
  let time = 0; const queries = [], opened = [];
  const config = { enabled: true, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' } };
  const record = { discord_user_id: student, status: 'approved', student_id: permanentId, approved_by: owner, approved_at: 'recorded', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded',
    learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true, age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION };
  const pool = { async query(sql, params) {
    assert.match(sql, /^SELECT \* FROM certification_enrollments/); assert.deepEqual(params, [student]); queries.push({ sql, params });
    return { rows: [structuredClone(record)] };
  }, connect() { assert.fail('Section modal checks cannot write learner records'); } };
  const handle = createSectionLoginHandler(pool, config, guildId, { sections: ['training-readiness'], now: () => time, maxPending: options.maxPending || 1000,
    async onVerified(interaction, section) {
      if (options.failCallback) throw new Error('PRIVATE-CALLBACK-DETAIL');
      opened.push(section); await interaction.editReply({ content: 'Verified section entry.', allowedMentions: { parse: [] } });
    } });
  function make(id = 'cert:section:open:training-readiness', changes = {}) {
    const replies = [], modals = []; let reads = 0;
    const i = { customId: id, user: { id: changes.actor || student }, guildId: changes.server === undefined ? guildId : changes.server, deferred: false, replied: false,
      message: changes.origin ? { flags: { has: () => true }, interactionMetadata: { user: { id: changes.origin } } } : undefined,
      isButton: () => !changes.modal, isModalSubmit: () => Boolean(changes.modal),
      fields: { getTextInputValue(key) { reads++; assert.equal(key, 'student_id'); return changes.studentId === undefined ? permanentId : changes.studentId; } },
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
      async editReply(payload) { assert.equal(this.deferred || this.replied, true); replies.push(payload); },
      async showModal(payload) { modals.push(payload.toJSON()); } };
    return { i, replies, modals, reads: () => reads };
  }
  async function open() { const x = make(); assert.equal(await handle(x.i), true); assert.equal(x.modals.length, 1); return x.modals[0].custom_id; }
  return { handle, make, open, record, queries, opened, advance() { time += 300000; } };
}
test('section button opens an unprefilled permanent-ID modal without reading records', async () => {
  const f = fixture(), x = f.make(); await f.handle(x.i);
  assert.equal(f.queries.length, 0); assert.equal(x.reads(), 0);
  assert.match(x.modals[0].custom_id, /^cert:section:submit:/);
  assert.equal(x.modals[0].components[0].components[0].custom_id, 'student_id');
  assert.doesNotMatch(JSON.stringify(x.modals), /NG-PT-fixture/);
});
test('matching ID reaches only the bound section callback through a private deferred reply', async () => {
  const f = fixture(), id = await f.open(), x = f.make(id, { modal: true }); await f.handle(x.i);
  assert.deepEqual(f.opened, ['training-readiness']); assert.equal(f.queries.length, 1); assert.equal(x.reads(), 1);
  assert.equal(x.i.deferred, true); assert.doesNotMatch(JSON.stringify(x.replies), /NG-PT-fixture/);
});
for (const changes of [{ actor: other }, { server: null }, { server: other }, { origin: other }]) {
  test(`challenge rejects mismatched context before field or database access ${JSON.stringify(changes)}`, async () => {
    const f = fixture(), id = await f.open(), denied = f.make(id, { modal: true, ...changes });
    await f.handle(denied.i); assert.equal(denied.reads(), 0); assert.equal(f.queries.length, 0); assert.equal(f.opened.length, 0);
    const legitimate = f.make(id, { modal: true }); await f.handle(legitimate.i); assert.deepEqual(f.opened, ['training-readiness']);
  });
}
test('expired challenge is rejected before reading the submitted permanent ID', async () => {
  const f = fixture(), id = await f.open(); f.advance();
  const x = f.make(id, { modal: true }); await f.handle(x.i); assert.equal(x.reads(), 0); assert.equal(f.queries.length, 0); assert.equal(f.opened.length, 0);
});
test('challenge is consumed once and successful login cannot be replayed', async () => {
  const f = fixture(), id = await f.open(); await f.handle(f.make(id, { modal: true }).i);
  const replay = f.make(id, { modal: true }); await f.handle(replay.i);
  assert.equal(replay.reads(), 0); assert.equal(f.queries.length, 1); assert.equal(f.opened.length, 1);
});
test('opening a new challenge invalidates the previous challenge for that account', async () => {
  const f = fixture(), first = await f.open(), second = await f.open();
  const old = f.make(first, { modal: true }); await f.handle(old.i); assert.equal(old.reads(), 0);
  await f.handle(f.make(second, { modal: true }).i); assert.equal(f.opened.length, 1);
});
test('controller restart invalidates an outstanding challenge', async () => {
  const original = fixture(), id = await original.open(), restarted = fixture(), x = restarted.make(id, { modal: true });
  await restarted.handle(x.i); assert.equal(x.reads(), 0); assert.equal(restarted.queries.length, 0); assert.equal(restarted.opened.length, 0);
});
test('wrong ID consumes challenge without entering section or echoing input', async () => {
  const f = fixture(), id = await f.open(), x = f.make(id, { modal: true, studentId: 'PRIVATE-WRONG-ID' });
  await f.handle(x.i); assert.equal(f.opened.length, 0); assert.doesNotMatch(JSON.stringify(x.replies), /PRIVATE-WRONG-ID/);
  const retry = f.make(id, { modal: true }); await f.handle(retry.i); assert.equal(retry.reads(), 0); assert.equal(f.queries.length, 1);
});
test('suspension after modal opening blocks section entry using the current record', async () => {
  const f = fixture(), id = await f.open(); f.record.status = 'suspended';
  await f.handle(f.make(id, { modal: true }).i); assert.equal(f.opened.length, 0); assert.equal(f.queries.length, 1);
});
test('pending challenge capacity prevents additional forms without record access', async () => {
  const f = fixture({ maxPending: 1 }); await f.open();
  const x = f.make(undefined, { actor: other }); await f.handle(x.i); assert.equal(x.modals.length, 0); assert.equal(x.replies.length, 1); assert.equal(f.queries.length, 0);
});
test('modal opening is rate limited per account without database access', async () => {
  const f = fixture(); for (let count = 0; count < 5; count++) await f.open();
  const x = f.make(); await f.handle(x.i); assert.equal(x.modals.length, 0); assert.equal(x.replies.length, 1); assert.equal(f.queries.length, 0);
});
test('callback failures return generic private output without raw error details', async () => {
  const f = fixture({ failCallback: true }), id = await f.open(), x = f.make(id, { modal: true });
  await f.handle(x.i); assert.equal(f.opened.length, 0); assert.doesNotMatch(JSON.stringify(x.replies), /PRIVATE-CALLBACK-DETAIL/);
  assert.match(x.replies[0].content, /could not be verified/);
});
test('unrelated interactions remain untouched and unknown sections fail closed', async () => {
  const f = fixture(), unrelated = f.make('unrelated:button'); assert.equal(await f.handle(unrelated.i), false); assert.equal(unrelated.replies.length, 0);
  const unknown = f.make('cert:section:open:unknown'); await f.handle(unknown.i);
  assert.equal(unknown.modals.length, 0); assert.equal(unknown.reads(), 0); assert.equal(f.queries.length, 0);
});
