import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { createManualReviewDecisionService } from './certification-manual-review-decisions.mjs';

const owner = '222222222222222222', student = '111111111111111111', guildId = '333333333333333333';
const content = 'Synthetic decision agreement';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner,
  activeAgreementVersion: 'agreement-v1', activeAgreementSha256: hash,
  comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'PRIVATE_QUESTION' }], correctAnswers: ['PRIVATE_GUIDE'] } };
const context = { actorId: owner, actualGuildId: guildId };
function initialRecord(studentId = null) {
  const at = new Date('2026-10-22T21:13:07.280Z');
  return { discord_user_id: student, student_id: studentId, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: 'agreement-v1', agreement_content_sha256: hash,
    acknowledged_at: at, learner_confirmed_read_at: at, comprehension_check_version: 'check-v1',
    comprehension_submitted_at: at, comprehension_passed_at: null,
    comprehension_review_snapshot: createManualReviewSnapshot(config, ['PRIVATE_RESPONSE']),
    age_eligible: true, age_declared_at: at, age_declaration_version: 'adult-18-v1', approved_by: null, approved_at: null, updated_at: at };
}
function fixture({ fail = '', rollbackFails = false, commitApplied = false, studentId = null, zeroUpdate = false, zeroAudit = false } = {}) {
  let time = 1000, working, events;
  const state = { row: structuredClone(initialRecord(studentId)), audits: [], queries: [], releases: [], connects: 0, agreement: { content, content_sha256: hash } };
  const failure = Object.assign(new Error('Synthetic transaction failure'), { code: 'XX000' });
  function persist() { state.row = structuredClone(working); state.audits.push(...structuredClone(events)); }
  const db = { async query(sql, parameters = []) {
    state.queries.push({ sql, parameters });
    if (sql === 'ROLLBACK') { if (rollbackFails) throw failure; working = undefined; events = undefined; return { rows: [], rowCount: 0 }; }
    if (fail && sql.startsWith(fail)) { if (sql === 'COMMIT' && commitApplied) persist(); throw failure; }
    if (sql === 'BEGIN') { working = structuredClone(state.row); events = []; return { rows: [], rowCount: 0 }; }
    if (sql.startsWith('SET LOCAL')) return { rows: [], rowCount: 0 };
    if (sql.startsWith('SELECT *')) return { rows: working ? [structuredClone(working)] : [], rowCount: working ? 1 : 0 };
    if (sql.startsWith('SELECT content')) return { rows: state.agreement ? [structuredClone(state.agreement)] : [], rowCount: state.agreement ? 1 : 0 };
    if (sql.startsWith('UPDATE')) {
      if (zeroUpdate) return { rows: [], rowCount: 0 };
      if (sql.includes("status='approved'")) Object.assign(working, { status: 'approved', student_id: parameters[1], approved_by: parameters[2], approved_at: new Date(), status_reason: parameters[3] });
      else Object.assign(working, { status: 'denied', status_reason: parameters[1] });
      return { rows: [structuredClone(working)], rowCount: 1 };
    }
    if (sql.startsWith('INSERT')) {
      if (zeroAudit) return { rows: [], rowCount: 0 };
      events.push({ actor: parameters[0], subject: parameters[1], action: parameters[2], details: JSON.parse(parameters[3]) });
      return { rows: [], rowCount: 1 };
    }
    if (sql === 'COMMIT') { persist(); return { rows: [], rowCount: 0 }; }
    assert.fail('Unexpected transaction SQL');
  }, release(discard) { state.releases.push(discard); } };
  const pool = { async connect() { state.connects++; return db; } };
  const service = createManualReviewDecisionService(pool, config, { guildId, now: () => time });
  const prepare = (action = 'approve') => service.prepare({ ...context, record: structuredClone(state.row), action, reason: 'Owner reviewed the responses', reviewedResponses: true });
  const confirm = (issued, overrides) => service.confirm({ ...context, studentDiscordId: student, token: issued.token, ...overrides });
  return { state, service, prepare, confirm, failure, setTime(value) { time = value; } };
}
for (const action of ['approve', 'deny']) test(`${action} atomically records status and owner-review audit without changing answers`, async () => {
  const f = fixture(), snapshot = structuredClone(f.state.row.comprehension_review_snapshot);
  const result = await f.confirm(f.prepare(action));
  assert.equal(result.status, action === 'approve' ? 'approved' : 'denied');
  if (action === 'approve') {
    assert.match(result.studentId, /^NG-PT-[a-f0-9-]{36}$/);
    assert.equal(f.state.row.approved_by, owner);
    assert.ok(f.state.row.approved_at);
  } else {
    assert.equal(result.studentId, null);
    assert.equal(f.state.row.approved_by, null);
    assert.equal(f.state.row.approved_at, null);
  }
  assert.deepEqual(f.state.row.comprehension_review_snapshot, snapshot);
  assert.equal(f.state.row.comprehension_passed_at, null);
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.audits[0].actor, owner);
  assert.equal(f.state.audits[0].subject, student);
  assert.equal(f.state.audits[0].details.decisionMethod, 'owner_manual_review');
  assert.equal(f.state.audits[0].details.ownerReviewedResponses, true);
  assert.equal(f.state.audits[0].details.reviewFingerprint, result.reviewFingerprint);
  assert.doesNotMatch(JSON.stringify(f.state.audits), /PRIVATE_QUESTION|PRIVATE_RESPONSE|PRIVATE_GUIDE/);
  const queries = f.state.queries.map(item => item.sql);
  assert.ok(queries.findIndex(sql => sql.includes('FOR UPDATE')) < queries.findIndex(sql => sql.startsWith('UPDATE')));
  assert.ok(queries.findIndex(sql => sql.startsWith('INSERT')) < queries.indexOf('COMMIT'));
  assert.ok(queries.some(sql => sql.includes('FOR SHARE')));
  assert.ok(queries.some(sql => sql.includes('lock_timeout')));
  assert.ok(queries.some(sql => sql.includes('statement_timeout')));
  assert.ok(queries.every(sql => !/certification_lab|certification_course|DELETE|GRANT/.test(sql)));
  assert.deepEqual(f.state.releases, [false]);
});
for (const action of ['approve', 'deny']) test(`${action} preserves an already issued permanent ID`, async () => {
  const f = fixture({ studentId: 'NG-PT-preserved-fixture' });
  assert.equal((await f.confirm(f.prepare(action))).studentId, 'NG-PT-preserved-fixture');
});
test('unauthorized server, actor, or malformed target fails before connecting', async () => {
  const f = fixture(), issued = f.prepare();
  for (const overrides of [{ actorId: student }, { actualGuildId: '444444444444444444' }, { studentDiscordId: 'bad' }, { token: 'bad' }]) {
    await assert.rejects(f.confirm(issued, overrides));
  }
  assert.equal(f.state.connects, 0);
  assert.equal((await f.confirm(issued)).status, 'approved');
});
for (const mutate of [row => { row.status = 'denied'; }, row => { row.comprehension_review_snapshot.items[0].response = 'changed'; },
  row => { row.updated_at = new Date('2026-10-22T21:14:00Z'); }]) test(`stale reviewed application cannot be changed: ${mutate.toString()}`, async () => {
  const f = fixture(), reviewed = structuredClone(f.state.row), issued = f.prepare();
  mutate(f.state.row);
  assert.notDeepEqual(f.state.row, reviewed);
  const before = structuredClone(f.state.row);
  await assert.rejects(f.confirm(issued));
  assert.deepEqual(f.state.row, before);
  assert.equal(f.state.audits.length, 0);
  assert.equal(f.state.queries.some(q => q.sql.startsWith('UPDATE')), false);
});
test('expired and replayed confirmations cannot write another decision', async () => {
  const expired = fixture(), token = expired.prepare();
  expired.setTime(301000);
  await assert.rejects(expired.confirm(token));
  assert.equal(expired.state.audits.length, 0);
  const f = fixture(), issued = f.prepare();
  await f.confirm(issued);
  await assert.rejects(f.confirm(issued));
  assert.equal(f.state.audits.length, 1);
});
for (const fail of ['BEGIN', 'SELECT *', 'UPDATE', 'INSERT']) test(`transaction failure at ${fail} preserves the stored application`, async () => {
  const f = fixture({ fail }), before = structuredClone(f.state.row);
  await assert.rejects(f.confirm(f.prepare()), error => error === f.failure);
  assert.deepEqual(f.state.row, before);
  assert.equal(f.state.audits.length, 0);
  assert.equal(f.state.queries.some(q => q.sql === 'COMMIT'), false);
});
test('audit failure consumes confirmation and failed rollback discards connection', async () => {
  const f = fixture({ fail: 'INSERT', rollbackFails: true }), issued = f.prepare();
  await assert.rejects(f.confirm(issued));
  assert.deepEqual(f.state.releases, [true]);
  assert.equal(f.state.row.status, 'pending');
  await assert.rejects(f.confirm(issued));
});
for (const commitApplied of [false, true]) test(`COMMIT failure reports uncertain outcome, including committed=${commitApplied}`, async () => {
  const f = fixture({ fail: 'COMMIT', commitApplied }), issued = f.prepare();
  await assert.rejects(f.confirm(issued), error => error.code === 'MANUAL_REVIEW_DECISION_OUTCOME_UNCONFIRMED');
  assert.deepEqual(f.state.releases, [true]);
  assert.equal(f.state.row.status, commitApplied ? 'approved' : 'pending');
  await assert.rejects(f.confirm(issued));
  assert.equal(f.state.audits.length, commitApplied ? 1 : 0);
});
for (const options of [{ zeroUpdate: true }, { zeroAudit: true }]) test(`missing update or audit row prevents commit: ${JSON.stringify(options)}`, async () => {
  const f = fixture(options);
  await assert.rejects(f.confirm(f.prepare()));
  assert.equal(f.state.row.status, 'pending');
  assert.equal(f.state.audits.length, 0);
});
test('missing or modified agreement blocks a decision without writing', async () => {
  for (const agreement of [null, { content: 'changed', content_sha256: hash }, { content, content_sha256: 'b'.repeat(64) }]) {
    const f = fixture(), issued = f.prepare();
    f.state.agreement = agreement;
    await assert.rejects(f.confirm(issued));
    assert.equal(f.state.row.status, 'pending');
    assert.equal(f.state.audits.length, 0);
  }
});
test('service cannot be constructed without explicit enablement', () => {
  assert.throws(() => createManualReviewDecisionService({ connect() { assert.fail('Must not connect'); } },
    { ...config, manualReviewDecisionsEnabled: false }, { guildId }));
});
