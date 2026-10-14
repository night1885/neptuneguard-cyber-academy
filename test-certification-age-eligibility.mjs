import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATION_MINIMUM_AGE, requireEligibleCertificationAge } from './certification-age-eligibility.js';

test('minimum age is 16; below-threshold values are denied', () => {
  assert.equal(CERTIFICATION_MINIMUM_AGE, 16);
  for (const value of [0, 15, '15']) assert.throws(() => requireEligibleCertificationAge(value), /16 or older/);
});
test('16 and older are eligible without a parental-consent argument', () => {
  for (const value of [16, 17, 18, '16', ' 17 ']) assert.equal(requireEligibleCertificationAge(value), true);
});
test('missing, malformed, non-integer, and unsafe values fail closed', () => {
  for (const value of [undefined, null, true, false, {}, [], '', ' ', 'sixteen', '16.5', '16years', '016', -1, 15.9, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '9007199254740992']) {
    assert.throws(() => requireEligibleCertificationAge(value), /Valid age/);
  }
});
