// Internal trusted configuration only. No environment reads or database access.
export function registrationPilotPolicy(config) {
  const enabled = config.registrationPilotEnabled;
  const policy = config.registrationPilotPolicy;
  if ((enabled === undefined || enabled === false) && policy === undefined) return null;
  if (enabled !== true || !policy || !Object.isFrozen(policy) ||
      ['owner', 'allowsStudent', 'assertTarget'].some(key => typeof policy[key] !== 'function') ||
      policy.owner(config.ownerId) !== true || config.enabled !== true || config.enrollmentSubmissionEnabled !== false) {
    throw new Error('Invalid registration pilot service context');
  }
  return policy;
}
