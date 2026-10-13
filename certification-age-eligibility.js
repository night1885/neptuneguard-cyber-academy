export const CERTIFICATION_MINIMUM_AGE = 16;

export function requireEligibleCertificationAge(input) {
  let age = input;
  if (typeof input === 'string') {
    const value = input.trim();
    if (!/^(0|[1-9][0-9]*)$/.test(value) || value.length > 16) throw new Error('Valid age in whole years required');
    age = Number(value);
  }
  if (!Number.isSafeInteger(age) || age < 0) throw new Error('Valid age in whole years required');
  if (age < CERTIFICATION_MINIMUM_AGE) throw new Error('Certification enrollment requires age 16 or older');
  return true;
}
