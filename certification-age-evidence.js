export const CERTIFICATION_AGE_POLICY_VERSION = 'age-16-v1';

export function hasCurrentAgeEligibility(record) {
  if (!record || record.age_eligibility_confirmed !== true || record.age_policy_version !== CERTIFICATION_AGE_POLICY_VERSION) return false;
  const value = record.age_eligibility_confirmed_at;
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}
