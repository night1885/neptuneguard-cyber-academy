import test from 'node:test';
import assert from 'node:assert/strict';
import { createSectionIdentityVerifier } from './certification-section-identity.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
const owner = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333', other = '444444444444444444';
const permanentId = 'NG-PT-00000000-0000-4000-8000-000000000001';
function fixture(options = {}) {
  let time = 0;
  const config = { enabled: true, ownerId: owner, activeAgreementVersion: 'v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'check1' }, ...options.config };
  let record = { discord_user_id: student, status: 'approved', student_id: permanentId, approved_by: owner, approved_at: 'recorded', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: 'v1', agreement_content_sha256: 'a'.repeat(64), acknowledged_at: 'recorded',
    learner_confirmed_read_at: 'recorded', comprehension_passed_at: 'recorded', comprehension_check_version: 'check1', age_eligible: true,
    age_declared_at: 'recorded', age_declaration_version: AGE_DECLARATION_VERSION, ...options.record };
  const queries = [], sections = ['training-readiness'];
  const pool = { async query(sql, params) {
    assert.match(sql, /^SELECT \* FROM certification_enrollments/); assert.ok(sql.includes("status='approved'"));
    assert.equal(params.length, 1); queries.push({ sql, params });
    if (options.query) return options.query();
    return { rows: record && params[0] === record.discord_user_id ? [structuredClone(record)] : [] };
  }, connect() { assert.fail('Section identity verification must not write records'); } };
  const verifier = createSectionIdentityVerifier(pool, config, guildId, { sections, readLimits: { now: () => time } });
  const input = { discordUserId: student, guildId, studentId: permanentId, section: 'training-readiness' };
  return { verifier, input, queries, sections, verify: change => verifier.verify({ ...input, ...change }),
    setRecord(value) { record = value === null ? null : { ...record, ...value }; }, advance() { time += 60000; } };
}
test('own permanent ID and current approved account pass without an ID-based database lookup', async () => {
  const f = fixture(); assert.equal(await f.verify(), true);
  assert.equal(await f.verify({ studentId: ` ${permanentId} ` }), true);
  assert.ok(f.queries.every(query => JSON.stringify(query.params) === JSON.stringify([student])));
  assert.ok(f.queries.every(query => !query.sql.includes(permanentId)));
});
test('same ID supplied by another Discord account does not authorize that account', async () => {
  const f = fixture(); assert.equal(await f.verify({ discordUserId: other }), false);
  assert.deepEqual(f.queries[0].params, [other]);
});
test('another permanent ID does not authorize an otherwise approved account', async () => {
  const f = fixture(); assert.equal(await f.verify({ studentId: 'NG-PT-someone-else' }), false);
  assert.deepEqual(f.queries[0].params, [student]);
});
for (const change of [{ guildId: null }, { guildId: other }, { discordUserId: 'invalid' }, { discordUserId: null },
  { section: 'unknown' }, { section: '__proto__' }, { studentId: null }, { studentId: ' ' }, { studentId: 'a'.repeat(101) }, { studentId: {} }]) {
  test(`invalid context or input is rejected before database access ${JSON.stringify(change)}`, async () => {
    const f = fixture(); assert.equal(await f.verify(change), false); assert.equal(f.queries.length, 0);
  });
}
for (const change of [{ status: 'pending' }, { status: 'denied' }, { status: 'suspended' }, { status: 'revoked' }, { student_id: null },
  { approved_by: null }, { approved_at: null }, { signature_method: 'legacy' }, { age_eligible: false }, { age_declared_at: null },
  { age_declaration_version: 'old' }, { agreement_version: 'old' }, { agreement_content_sha256: 'b'.repeat(64) }, { comprehension_check_version: 'old' }]) {
  test(`incomplete or stale current record remains blocked ${JSON.stringify(change)}`, async () => {
    const f = fixture({ record: change }); assert.equal(await f.verify(), false); assert.equal(f.queries.length, 1);
  });
}
test('disabled certification rejects verification before database access', async () => {
  const f = fixture({ config: { enabled: false } }); assert.equal(await f.verify(), false); assert.equal(f.queries.length, 0);
});
test('missing account is rejected without creating an enrollment', async () => {
  const f = fixture(); f.setRecord(null); assert.equal(await f.verify(), false);
});
test('successful verification is not cached across suspension or permanent-ID change', async () => {
  const f = fixture(); assert.equal(await f.verify(), true);
  f.setRecord({ status: 'suspended' }); assert.equal(await f.verify(), false);
  f.setRecord({ status: 'approved', student_id: 'NG-PT-current' }); assert.equal(await f.verify(), false);
  assert.equal(await f.verify({ studentId: 'NG-PT-current' }), true); assert.equal(f.queries.length, 4);
});
test('database failures return denial rather than propagating private details', async () => {
  const f = fixture({ query() { throw new Error('PRIVATE-DATABASE-DETAIL'); } });
  assert.equal(await f.verify(), false);
});
test('read guard limits repeated ID checks and permits a new bounded window', async () => {
  const f = fixture(); for (let count = 0; count < 5; count++) assert.equal(await f.verify(), true);
  assert.equal(await f.verify(), false); assert.equal(f.queries.length, 5);
  f.advance(); assert.equal(await f.verify(), true); assert.equal(f.queries.length, 6);
});
test('concurrent verification for the same account is rejected without another read', async () => {
  let release; const pending = new Promise(resolve => { release = resolve; });
  const f = fixture({ query: () => pending }); const first = f.verify();
  assert.equal(await f.verify(), false); assert.equal(f.queries.length, 1);
  release({ rows: [] }); assert.equal(await first, false);
});
test('section allowlist is copied and cannot be expanded by mutating the caller array', async () => {
  const f = fixture(); f.sections.push('unreviewed');
  assert.equal(await f.verify({ section: 'unreviewed' }), false); assert.equal(f.queries.length, 0);
});
for (const sections of [undefined, [], ['training-readiness', 'training-readiness'], ['INVALID'], ['a'.repeat(41)]]) {
  test(`invalid section allowlist is rejected ${JSON.stringify(sections)}`, () => {
    assert.throws(() => createSectionIdentityVerifier({}, {}, guildId, { sections }), /explicit unique section allowlist/);
  });
}
