import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabReviewSummary } from './certification-lab-review-summary.js';
const now = Date.parse('2026-01-02T12:00:00Z');
const id = '100000000000000002';
const earlier = '2026-01-01T00:00:00Z';
const config = { activeAgreementVersion: 'fixture-v1', activeAgreementSha256: 'a'.repeat(64), comprehensionCheck: { version: 'fixture-check-v1' } };
const request = { request_id: '00000000-0000-4000-8000-000000000001', discord_user_id: id,
  lab_key: 'fixture-lab', status: 'pending', rules_version: 'fixture-rules-v1', rules_acknowledged_at: earlier,
  starts_at: '2026-01-02T11:00:00Z', expires_at: '2026-01-02T13:00:00Z' };
const learner = { discord_user_id: id, student_id: 'NG-FIXTURE-1', status: 'approved', approved_by: '100000000000000001', approved_at: earlier,
  signature_method: 'discord_account', agreement_version: config.activeAgreementVersion, agreement_content_sha256: config.activeAgreementSha256,
  acknowledged_at: earlier, learner_confirmed_read_at: earlier, comprehension_passed_at: earlier,
  comprehension_check_version: config.comprehensionCheck.version, age_eligible: true, age_declared_at: earlier, age_declaration_version: 'adult-18-v1' };
const summary = (r = request, l = learner, c = config) => buildLabReviewSummary(r, l, c, { now });
const field = (embed, name) => embed.fields.find(item => item.name === name).value;

test('complete recorded facts never become an approval or launch verdict', () => {
  const result = summary();
  assert.match(result.description, /not an approval decision/);
  assert.match(field(result, 'Course approval record'), /^Approved status/);
  assert.match(field(result, 'Account acknowledgment and age declaration'), /not independent verification/);
  assert.match(field(result, 'Recorded authorization window'), /does not grant access/);
  assert.match(field(result, 'Not checked by this panel'), /scope permissions/);
  assert.equal(result.components, undefined);
});
test('absent current-version configuration is not treated as a successful match', () => {
  const result = summary(request, learner, {});
  for (const name of ['Agreement version', 'Agreement content hash', 'Comprehension version']) assert.match(field(result, name), /^Not configured/);
});
test('configuration mismatches and missing declarations are visible', () => {
  const result = summary(request, { ...learner, age_eligible: false, agreement_version: 'old', agreement_content_sha256: 'b'.repeat(64), comprehension_check_version: 'old' });
  assert.match(field(result, 'Account acknowledgment and age declaration'), /^Missing or incomplete/);
  for (const name of ['Agreement version', 'Agreement content hash', 'Comprehension version']) assert.match(field(result, name), /does not match/);
});
for (const record of [null, { ...learner, discord_user_id: '100000000000000099' }]) {
  test(`missing or mismatched linked enrollment is not borrowed: ${record?.discord_user_id || 'none'}`, () => {
    const result = summary(request, record);
    assert.match(field(result, 'Linked enrollment'), /not found/);
    assert.match(field(result, 'Course approval record'), /^Missing/);
    assert.match(field(result, 'Account acknowledgment and age declaration'), /^Missing/);
    assert.match(field(result, 'Agreement version'), /does not match/);
  });
}
for (const status of ['pending', 'suspended', 'revoked', 'denied']) {
  test(`enrollment ${status} is not described as an approved course record`, () => {
    assert.match(field(summary(request, { ...learner, status }), 'Course approval record'), /^Missing/);
  });
}
for (const [change, pattern] of [
  [{ starts_at: null }, /Missing start/],
  [{ expires_at: 'invalid' }, /Invalid/],
  [{ expires_at: request.starts_at }, /Invalid/],
  [{ starts_at: earlier, expires_at: '2026-01-02T12:00:00Z' }, /elapsed/],
  [{ starts_at: '2026-01-02T13:00:00Z', expires_at: '2026-01-02T14:00:00Z' }, /future/]
]) {
  test(`recorded window reports ${pattern}`, () => assert.match(field(summary({ ...request, ...change }), 'Recorded authorization window'), pattern));
}
for (const change of [{ rules_version: '' }, { rules_acknowledged_at: null }, { rules_acknowledged_at: 'invalid' }, { rules_acknowledged_at: '2026-01-03T00:00:00Z' }]) {
  test(`rules metadata is not accepted blindly: ${JSON.stringify(change)}`, () => assert.match(field(summary({ ...request, ...change }), 'Lab rules acknowledgment'), /^Missing or invalid/));
}
test('private scope, notes, identity fields and raw hashes never enter output', () => {
  const secret = 'DO-NOT-DISPLAY-PRIVATE';
  const r = { ...request, scope: { secret }, status_reason: secret };
  const l = { ...learner, acknowledgment_name: secret, signature_reference: secret, private_notes: secret };
  const before = JSON.stringify([r, l, config]);
  const text = JSON.stringify(summary(r, l));
  assert.ok(!text.includes(secret)); assert.ok(!text.includes(config.activeAgreementSha256));
  assert.equal(JSON.stringify([r, l, config]), before);
});
test('unsafe identifier formatting is sanitized and fields stay bounded', () => {
  const result = summary({ ...request, lab_key: '@everyone <unsafe> ' + 'x'.repeat(200) });
  assert.ok(!field(result, 'Lab identifier').includes('@'));
  assert.ok(result.fields.every(item => item.name.length <= 256 && item.value.length > 0 && item.value.length <= 1024));
  assert.ok(result.fields.length <= 25);
});
test('invalid snapshot inputs fail instead of inventing a decision', () => {
  assert.throws(() => buildLabReviewSummary(null, learner, config, { now }));
  assert.throws(() => buildLabReviewSummary(request, learner, config, { now: NaN }));
});
