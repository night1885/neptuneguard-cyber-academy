import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialConsoleHandler } from './certification-initial-console.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const student = '222222222222222222', guild = '333333333333333333';
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'v1' } };
function fixture(operation, overrides = {}) {
  const queries = [], replies = [];
  const pool = { async query(sql, values) { assert.match(sql, /^SELECT/); assert.deepEqual(values, [student]); queries.push(sql); return operation(sql); }, connect() { assert.fail('Console must not write'); } };
  const handler = createInitialConsoleHandler(pool, { ...config, ...overrides }, guild);
  const interaction = (options = {}) => ({ customId: 'cert:initial:status', user: { id: student }, guildId: guild, isButton: () => true, async deferReply(p) { assert.equal(p.flags, 64); }, async reply(p) { replies.push(p); }, async editReply(p) { assert.deepEqual(p.allowedMentions, { parse: [] }); replies.push(p); }, ...options });
  return { handler, interaction, queries, replies };
}
const approved = { discord_user_id: student, status: 'approved', student_id: 'NG-PT-test', approved_by: '444444444444444444', approved_at: '2026-01-01', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: '2026-01-01', learner_confirmed_read_at: '2026-01-01', comprehension_passed_at: '2026-01-01', comprehension_check_version: 'v1', age_eligible: true, age_declared_at: '2026-01-01', age_declaration_version: AGE_DECLARATION_VERSION };
const panel = payload => payload.components[0].toJSON().components.find(c => c.custom_id === 'cert:learner:home');
test('guard returns its result directly and complete approved record enables panel', async () => {
  const f = fixture(sql => ({ rows: sql.startsWith('SELECT status') ? [{ status: 'approved' }] : [approved] }));
  await f.handler(f.interaction()); assert.equal(f.queries.length, 2); assert.equal(panel(f.replies[0]).disabled, false); assert.equal(f.replies[0].embeds[0].fields[1].value, 'Current checks passed');
});
for (const changed of [{ age_eligible: false }, { signature_method: 'legacy' }, { agreement_version: 'old' }, { student_id: null }]) {
  test(`approved but incomplete enrollment remains locked ${JSON.stringify(changed)}`, async () => {
    const f = fixture(sql => ({ rows: sql.startsWith('SELECT status') ? [{ status: 'approved' }] : [{ ...approved, ...changed }] }));
    await f.handler(f.interaction()); assert.equal(panel(f.replies[0]).disabled, true);
  });
}
test('sixth status read is rate limited before further queries', async () => {
  const f = fixture(() => ({ rows: [] }));
  for (let i = 0; i < 6; i++) await f.handler(f.interaction());
  assert.equal(f.queries.length, 10); assert.match(f.replies.at(-1).content, /rate limited/); assert.deepEqual(f.replies.at(-1).components, []);
});
test('concurrent status read is busy without running another query', async () => {
  let release; const waiting = new Promise(resolve => { release = resolve; });
  const f = fixture(async () => { await waiting; return { rows: [] }; });
  const first = f.handler(f.interaction());
  try {
    await f.handler(f.interaction()); assert.equal(f.queries.length, 1); assert.match(f.replies.at(-1).content, /busy/);
  } finally { release(); await first; }
  assert.equal(f.replies.at(-1).embeds[0].fields[0].value, 'Not registered');
});
test('database errors fail closed without leaking exception details', async () => {
  const f = fixture(() => { throw new Error('PRIVATE-DATABASE-DETAIL'); });
  await f.handler(f.interaction()); const p = f.replies.at(-1); assert.match(p.content, /could not be checked/); assert.doesNotMatch(p.content, /PRIVATE-DATABASE-DETAIL/); assert.deepEqual(p.components, []); assert.deepEqual(p.embeds, []);
});
test('unknown actions and disabled certification do not query', async () => {
  const f = fixture(() => { assert.fail('Unexpected query'); });
  await f.handler(f.interaction({ customId: 'cert:initial:unknown' })); assert.equal(f.queries.length, 0);
  const disabled = fixture(() => { assert.fail('Unexpected query'); }, { enabled: false });
  await disabled.handler(disabled.interaction()); assert.equal(disabled.queries.length, 0);
});
test('pending application shows admin wording without private record fields', async () => {
  const f = fixture(sql => ({ rows: sql.startsWith('SELECT status') ? [{ status: 'pending', status_reason: 'PRIVATE-NOTE', student_id: 'PRIVATE-ID' }] : [] }));
  await f.handler(f.interaction()); const text = JSON.stringify(f.replies.at(-1)); assert.match(text, /Pending admin review/); assert.doesNotMatch(text, /PRIVATE-NOTE|PRIVATE-ID/);
});
