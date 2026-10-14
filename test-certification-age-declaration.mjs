import test from 'node:test';
import assert from 'node:assert/strict';
import { ACADEMY_MINIMUM_AGE, AGE_DECLARATION_QUESTION, validateAgeDeclaration } from './certification-age-declaration.js';

test('the Academy requires 18 and asks a yes/no question', () => {
  assert.equal(ACADEMY_MINIMUM_AGE, 18);
  assert.equal(AGE_DECLARATION_QUESTION, 'Are you 18 years of age or older?');
});

test('only explicit yes yields a self-declared eligibility record', () => {
  const result = validateAgeDeclaration({ ageEligibility: 'yes' });
  assert.deepEqual(result, { ageEligibility: 'yes', declarationVersion: 'adult-18-v1', minimumAge: 18, method: 'self_declaration' });
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(Object.keys(result).sort(), ['ageEligibility', 'declarationVersion', 'method', 'minimumAge']);
});

test('no blocks enrollment', () => {
  assert.throws(() => validateAgeDeclaration({ ageEligibility: 'no' }), /requires age 18/);
});

for (const answer of [undefined, null, '', true, false, 18, '18', 'true', 'YES', ' yes ', {}, []]) {
  test(`reject noncanonical answer ${JSON.stringify(answer)}`, () => {
    assert.throws(() => validateAgeDeclaration({ ageEligibility: answer }));
  });
}

for (const input of [undefined, null, [], 'yes', true, {}, { ageEligibility: 'yes', typedName: 'Example' }, { ageEligibility: 'yes', birthDate: '2000-01-01' }, { ageEligibility: 'yes', email: 'example@example.com' }, { ageEligibility: 'yes', actualAge: 18 }]) {
  test(`reject missing, malformed or additional fields ${JSON.stringify(input)}`, () => {
    assert.throws(() => validateAgeDeclaration(input));
  });
}

test('does not invoke an accessor or accept inherited answers', () => {
  let called = false;
  const input = Object.defineProperty({}, 'ageEligibility', { get() { called = true; return 'yes'; } });
  assert.throws(() => validateAgeDeclaration(input));
  assert.equal(called, false);
  assert.throws(() => validateAgeDeclaration(Object.create({ ageEligibility: 'yes' })));
});

test('reject symbol extras and accept a plain null-prototype payload', () => {
  assert.throws(() => validateAgeDeclaration({ ageEligibility: 'yes', [Symbol('extra')]: 'value' }));
  const input = Object.assign(Object.create(null), { ageEligibility: 'yes' });
  assert.equal(validateAgeDeclaration(input).ageEligibility, 'yes');
});
