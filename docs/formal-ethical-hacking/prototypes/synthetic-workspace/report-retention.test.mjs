import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticReportRetentionInspector as create } from './report-retention.mjs';
const START = 1_000_000_000, DAY = 86_400_000;
const fixture = patch => ({ learnerId: 'demo-learner', recordId: 'demo-record', submissionId: 'demo-submission',
  courseKey: 'demo-ethical-hacking', scope: 'report-only', status: 'submitted', submittedAtMs: START, ...patch });
const inspectAt = (now, patch) => create({ readNow: () => now }).inspect(fixture(patch));
test('requires an explicit fixture clock', () => assert.throws(() => create(), /Explicit trusted/));
test('window open one millisecond before the exact 24-hour deadline', () => {
  const r = inspectAt(START + DAY - 1); assert.equal(r.outcome, 'within-window');
  assert.equal(r.expiresAtMs, START + DAY); assert.equal(r.windowOpen, true);
});
test('expired exactly at and after the deadline', () => {
  for (const now of [START + DAY, START + DAY + 1]) {
    const r = inspectAt(now); assert.equal(r.outcome, 'expired'); assert.equal(r.windowOpen, false);
  }
});
test('repeated inspection does not extend a submission deadline', () => {
  let now = START; const engine = create({ readNow: () => now }); const row = fixture();
  assert.equal(engine.inspect(row).expiresAtMs, START + DAY); now += DAY - 1;
  assert.equal(engine.inspect(row).expiresAtMs, START + DAY); now++;
  assert.equal(engine.inspect(row).outcome, 'expired');
});
test('newer submissions on the same record retain independent deadlines', () => {
  const engine = create({ readNow: () => START + DAY });
  assert.equal(engine.inspect(fixture()).outcome, 'expired');
  const newer = engine.inspect(fixture({ submissionId: 'demo-newer', submittedAtMs: START + DAY - 1 }));
  assert.equal(newer.outcome, 'within-window'); assert.equal(newer.expiresAtMs, START + 2 * DAY - 1);
});
test('different learners and records remain distinct metadata projections', () => {
  const r = inspectAt(START, { learnerId: 'demo-other', recordId: 'demo-other-record', submissionId: 'demo-other-submission' });
  assert.equal(r.learnerId, 'demo-other'); assert.equal(r.recordId, 'demo-other-record');
  assert.equal(r.submissionId, 'demo-other-submission');
});
test('registration, feedback and review timestamps cannot be supplied as clock overrides', () => {
  for (const field of ['registeredAtMs', 'feedbackAtMs', 'reviewClosedAtMs', 'now', 'expiresAtMs'])
    assert.equal(inspectAt(START, { [field]: START + DAY }).outcome, 'unavailable');
});
test('unsubmitted drafts and shared records remain policy-unresolved', () => {
  const draft = inspectAt(START, { status: 'draft', submissionId: null, submittedAtMs: null });
  assert.equal(draft.outcome, 'policy-unresolved'); assert.equal(draft.reason, 'unsubmitted-draft');
  const shared = inspectAt(START, { scope: 'shared' });
  assert.equal(shared.outcome, 'policy-unresolved'); assert.equal(shared.reason, 'shared-record');
  assert.equal(Object.hasOwn(draft, 'expiresAtMs'), false); assert.equal(Object.hasOwn(shared, 'expiresAtMs'), false);
});
test('real course namespace, malformed subjects and report bodies rejected', () => {
  for (const patch of [{ courseKey: 'formal-ethical-hacking' }, { learnerId: '123456789012345678' },
    { recordId: '' }, { body: 'Fictional report.' }, { status: 'review-recorded' }])
    assert.equal(inspectAt(START, patch).outcome, 'unavailable');
});
test('invalid, future and overflowing submission timestamps rejected', () => {
  for (const submittedAtMs of [null, NaN, Infinity, -1, 1.5, '1000000000', START + 1, 8_640_000_000_000_000])
    assert.equal(inspectAt(START, { submittedAtMs }).outcome, 'unavailable');
});
test('unavailable clocks and process-local clock regression fail closed', () => {
  for (const readNow of [() => NaN, () => { throw new Error('fixture failure'); }])
    assert.equal(create({ readNow }).inspect(fixture()).outcome, 'unavailable');
  let now = START + DAY; const engine = create({ readNow: () => now });
  assert.equal(engine.inspect(fixture()).outcome, 'expired'); now--;
  assert.equal(engine.inspect(fixture()).outcome, 'unavailable'); now++;
  assert.equal(engine.inspect(fixture()).outcome, 'expired');
});
test('accessors and unexpected symbols rejected without evaluating getters', () => {
  let calls = 0; const row = fixture();
  Object.defineProperty(row, 'submittedAtMs', { get() { calls++; return START; } });
  assert.equal(create({ readNow: () => START }).inspect(row).outcome, 'unavailable'); assert.equal(calls, 0);
  const extra = fixture(); extra[Symbol('fixture')] = true;
  assert.equal(create({ readNow: () => START }).inspect(extra).outcome, 'unavailable');
});
test('inputs unchanged and every result frozen without authorization or deletion grants', () => {
  const row = Object.freeze(fixture()); const before = JSON.stringify(row);
  const engine = create({ readNow: () => START });
  for (const r of [engine.inspect(row), engine.inspect(null), engine.inspect(fixture({ scope: 'shared' }))]) {
    assert.equal(Object.isFrozen(r), true); assert.equal(r.authorizationGranted, false);
    assert.equal(r.deletionAuthorized, false); assert.equal(r.liveIntakeEnabled, false);
  }
  assert.equal(JSON.stringify(row), before);
});
