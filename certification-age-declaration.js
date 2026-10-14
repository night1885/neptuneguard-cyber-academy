export const ACADEMY_MINIMUM_AGE = 18;
export const AGE_DECLARATION_VERSION = 'adult-18-v1';
export const AGE_DECLARATION_QUESTION = 'Are you 18 years of age or older?';

// This is a self-declaration, not independent identity or age verification.
export function validateAgeDeclaration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    throw new Error('Invalid age declaration');
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 1 || keys[0] !== 'ageEligibility') {
    throw new Error('Only the ageEligibility answer is accepted');
  }
  const field = Object.getOwnPropertyDescriptor(input, 'ageEligibility');
  if (!field || !Object.hasOwn(field, 'value')) throw new Error('Invalid age declaration');
  if (field.value !== 'yes' && field.value !== 'no') {
    throw new Error('An explicit Yes or No answer is required');
  }
  if (field.value === 'no') throw new Error('Academy enrollment requires age 18 or older');
  return Object.freeze({
    ageEligibility: 'yes',
    declarationVersion: AGE_DECLARATION_VERSION,
    minimumAge: ACADEMY_MINIMUM_AGE,
    method: 'self_declaration'
  });
}
