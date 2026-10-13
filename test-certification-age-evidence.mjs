import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATION_AGE_POLICY_VERSION, hasCurrentAgeEligibility } from './certification-age-evidence.js';

const valid = { age_eligibility_confirmed: true, age_eligibility_confirmed_at: '2026-10-13T17:25:00Z', age_policy_version: CERTIFICATION_AGE_POLICY_VERSION };
test('current self-reported eligibility supports database Date and ISO timestamp representations', () => {
  assert.equal(CERTIFICATION_AGE_POLICY_VERSION, 'age-16-v1');
  assert.equal(hasCurrentAgeEligibility(valid), true);
  assert.equal(hasCurrentAgeEligibility({ ...valid, age_eligibility_confirmed_at: new Date(valid.age_eligibility_confirmed_at) }), true);
});
test('legacy, missing, partial, false, or different-policy evidence fails closed', () => {
  for (const value of [null, undefined, {},
    { ...valid, age_eligibility_confirmed: null }, { ...valid, age_eligibility_confirmed: false },
    { ...valid, age_eligibility_confirmed: 'true' }, { ...valid, age_eligibility_confirmed_at: null },
    { ...valid, age_policy_version: null }, { ...valid, age_policy_version: 'other-policy' }]) {
    assert.equal(hasCurrentAgeEligibility(value), false);
  }
});
test('malformed timestamps are not accepted as eligibility evidence', () => {
  for (const value of ['', 'not-a-date', '2026', 16, {}, new Date(NaN), '2026-99-99T00:00:00Z']) {
    assert.equal(hasCurrentAgeEligibility({ ...valid, age_eligibility_confirmed_at: value }), false);
  }
});
