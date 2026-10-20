const expected = Object.freeze({
  CERTIFICATION_ENABLED: 'true',
  CERTIFICATION_READ_ONLY_PREVIEW: 'true',
  CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
  CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false',
  CERTIFICATION_COURSES_ENABLED: 'false'
});

// Owner-preview validation only: never normalize or change the environment.
export function inspectPreviewFeatureFlags(env = {}) {
  if (env === null || typeof env !== 'object' || Array.isArray(env)) {
    throw new TypeError('An environment object is required');
  }
  const issues = [];
  for (const [field, required] of Object.entries(expected)) {
    const value = env[field];
    if (value === required) continue;
    const code = value === undefined ? 'missing'
      : value !== 'true' && value !== 'false' ? 'invalid_literal' : 'wrong_preview_value';
    issues.push(Object.freeze({ field, code, expected: required }));
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}
