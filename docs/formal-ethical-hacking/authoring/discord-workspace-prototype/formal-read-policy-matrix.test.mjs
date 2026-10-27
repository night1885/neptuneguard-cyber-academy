// Synthetic policy regressions only. No database connection or runtime wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormalReviewAuthorization, isFormalRead } from './formal-read-policy.mjs';
import { FORMAL_REVIEW_COURSE } from './formal-course.mjs';

const ACTOR = '100000000000000001';
const OWNER = '100000000000000002';
const COURSE = FORMAL_REVIEW_COURSE.key;
const TIME = '2026-01-01T00:00:00.000Z';
const config = { enabled: true, activeAgreementVersion: 'SYNTHETIC-v1',
  activeAgreementSha256: 'a'.repeat(64),
  comprehensionCheck: { version: 'SYNTHETIC-check-v1' } };
function approved() {
  return { discord_user_id: ACTOR, status: 'approved', student_id: 'SYNTHETIC-STUDENT',
    approved_by: OWNER, approved_at: TIME, signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null,
    agreement_version: config.activeAgreementVersion,
    agreement_content_sha256: config.activeAgreementSha256,
    acknowledged_at: TIME, learner_confirmed_read_at: TIME,
    comprehension_passed_at: TIME, comprehension_check_version: config.comprehensionCheck.version,
    age_eligible: true, age_declared_at: TIME, age_declaration_version: 'adult-18-v1',
    course_status: 'active', authorized_course_key: COURSE,
    application_closed_at: null, application_closed_by: null, application_closed_as: null };
}
function harness(t, rows, { expectedCalls = 1, beforeResult } = {}) {
  const calls = [];
  const authorize = createFormalReviewAuthorization({ enabled: true, reviewOnly: true, config,
    readPool: { async query(sql, values) {
      calls.push({ sql, values: structuredClone(values) });
      if (beforeResult) await beforeResult();
      return { rows: structuredClone(rows) };
    } } });
  // Check outside the production catch boundary so assertion failures cannot become denials.
  t.after(() => {
    authorize.dispose();
    assert.equal(calls.length, expectedCalls);
    for (const call of calls) {
      assert.equal(isFormalRead(call.sql, call.values), true);
      assert.deepEqual(call.values, [ACTOR, COURSE]);
    }
  });
  return { authorize, calls };
}

test('current synthetic enrollment returns only the minimal course grant', async t => {
  const h = harness(t, [approved()]);
  assert.deepEqual(await h.authorize(ACTOR, COURSE),
    { student_id: 'SYNTHETIC-STUDENT', course_key: COURSE });
  assert.equal(h.calls.length, 1);
});

for (const status of ['pending', 'denied', 'suspended', 'revoked', 'awaiting_acknowledgment']) {
  test(`stored ${status} enrollment cannot authorize a formal page`, async t => {
    const h = harness(t, [{ ...approved(), status }]);
    assert.equal(await h.authorize(ACTOR, COURSE), null);
  });
}

const denials = [
  ['completed assignment', { course_status: 'completed' }],
  ['wrong assignment course', { authorized_course_key: 'other-course' }],
  ['blank permanent ID', { student_id: ' ' }],
  ['missing approval provenance', { approved_by: null }],
  ['stale agreement version', { agreement_version: 'SYNTHETIC-old' }],
  ['stale agreement hash', { agreement_content_sha256: 'b'.repeat(64) }],
  ['stale comprehension version', { comprehension_check_version: 'SYNTHETIC-old' }],
  ['missing approval time', { approved_at: null }],
  ['missing acknowledgment', { acknowledged_at: null }],
  ['missing read confirmation', { learner_confirmed_read_at: null }],
  ['missing comprehension evidence', { comprehension_passed_at: null }],
  ['ineligible age declaration', { age_eligible: false }],
  ['missing age declaration time', { age_declared_at: null }],
  ['stale age declaration', { age_declaration_version: 'SYNTHETIC-old' }],
  ['closure timestamp', { application_closed_at: TIME }],
  ['closure actor', { application_closed_by: OWNER }],
  ['closure classification', { application_closed_as: 'synthetic-closed' }]
];
for (const [label, patch] of denials) {
  test(`${label} denies despite an otherwise eligible row`, async t => {
    const h = harness(t, [{ ...approved(), ...patch }]);
    assert.equal(await h.authorize(ACTOR, COURSE), null);
  });
}

for (const field of ['application_closed_at', 'application_closed_by', 'application_closed_as']) {
  test(`missing ${field} fails closed rather than assuming an open application`, async t => {
    const row = approved();
    delete row[field];
    const h = harness(t, [row]);
    assert.equal(await h.authorize(ACTOR, COURSE), null);
  });
}

test('missing, duplicate, and foreign-subject rows deny', async t => {
  for (const rows of [[], [approved(), approved()], [{ ...approved(), discord_user_id: OWNER }]]) {
    const h = harness(t, rows);
    assert.equal(await h.authorize(ACTOR, COURSE), null);
  }
});

test('invalid actor and foreign course cause no policy query', async t => {
  const h = harness(t, [approved()], { expectedCalls: 0 });
  assert.equal(await h.authorize('invalid', COURSE), null);
  assert.equal(await h.authorize(ACTOR, 'other-course'), null);
  assert.equal(h.calls.length, 0);
});

test('disposal blocks further policy reads', async t => {
  const h = harness(t, [approved()], { expectedCalls: 0 });
  h.authorize.dispose();
  assert.equal(await h.authorize(ACTOR, COURSE), null);
  assert.equal(h.calls.length, 0);
});

test('backend exception is a denial and never a grant', async t => {
  const h = harness(t, [approved()], { beforeResult() { throw new Error('SYNTHETIC PRIVATE ERROR'); } });
  assert.equal(await h.authorize(ACTOR, COURSE), null);
});

test('disposal while a policy read is pending rejects its late result', async t => {
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { release = resolve; });
  const h = harness(t, [approved()], { async beforeResult() { entered(); await blocked; } });
  const pending = h.authorize(ACTOR, COURSE);
  await started;
  h.authorize.dispose();
  release();
  assert.equal(await pending, null);
});

test('each authorization reads current enrollment rather than retaining a prior grant', async t => {
  const rows = [approved()];
  const h = harness(t, rows, { expectedCalls: 2 });
  assert.deepEqual(await h.authorize(ACTOR, COURSE),
    { student_id: 'SYNTHETIC-STUDENT', course_key: COURSE });
  rows[0].status = 'revoked';
  assert.equal(await h.authorize(ACTOR, COURSE), null);
});

test('default-off policy never consults a provider', async () => {
  let calls = 0;
  const authorize = createFormalReviewAuthorization({
    readPool: { async query() { calls++; throw new Error('Unexpected read'); } } });
  assert.equal(await authorize(ACTOR, COURSE), null);
  assert.equal(calls, 0);
  authorize.dispose();
});

test('approved manual-review acknowledgment returns no reviewer guide fields', async t => {
  const row = { ...approved(), comprehension_passed_at: null, comprehension_submitted_at: TIME,
    comprehension_review_snapshot: { formatVersion: 'manual-review-v1',
      checkVersion: config.comprehensionCheck.version,
      items: [{ question: 'SYNTHETIC QUESTION', response: 'SYNTHETIC RESPONSE', expectedAnswer: 'SYNTHETIC GUIDE' }] } };
  const h = harness(t, [row]);
  assert.deepEqual(await h.authorize(ACTOR, COURSE),
    { student_id: 'SYNTHETIC-STUDENT', course_key: COURSE });
});

test('malformed manual-review snapshot cannot authorize an otherwise approved account', async t => {
  const row = { ...approved(), comprehension_passed_at: null, comprehension_submitted_at: TIME,
    comprehension_review_snapshot: { formatVersion: 'manual-review-v1',
      checkVersion: config.comprehensionCheck.version, items: [] } };
  const h = harness(t, [row]);
  assert.equal(await h.authorize(ACTOR, COURSE), null);
});
