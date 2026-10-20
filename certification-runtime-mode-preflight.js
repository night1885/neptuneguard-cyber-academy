import { inspectPreviewFeatureFlags } from './certification-preview-flag-preflight.js';
import { readRegistrationPilotOptions } from './certification-registration-pilot-guard.js';
import { loadCertificationConfig } from './certification-config.js';
const modes = ['owner-preview', 'registration-pilot'];
const issue = (field, code, expected) => ({ field, code, expected });
const result = (mode, scope, issues) => Object.freeze({ mode, scope, ok: issues.length === 0,
  issues: Object.freeze(issues.map(value => Object.freeze(value))) });
export function inspectRuntimeMode(env, mode) {
  if (!modes.includes(mode)) return result(null, 'input', [issue('mode', 'unsupported', 'owner-preview or registration-pilot')]);
  if (!env || typeof env !== 'object' || Array.isArray(env)) return result(mode, 'input', [issue('environment', 'invalid', 'environment object')]);
  try {
    if (mode === 'owner-preview') {
      const issues = [...inspectPreviewFeatureFlags(env).issues];
      if (env.CERTIFICATION_REGISTRATION_PILOT !== undefined && env.CERTIFICATION_REGISTRATION_PILOT !== 'false') {
        issues.push(issue('CERTIFICATION_REGISTRATION_PILOT', 'pilot_not_disabled', 'false or unset'));
      }
      return result(mode, 'preview-flags-only', issues);
    }
    const expected = { CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_ENABLED: 'true',
      CERTIFICATION_READ_ONLY_PREVIEW: 'false', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
      CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false' };
    const issues = [];
    for (const [field, required] of Object.entries(expected)) {
      const value = env[field];
      if (value !== required) issues.push(issue(field, value === undefined ? 'missing'
        : value === 'true' || value === 'false' ? 'wrong_mode_value' : 'invalid_literal', required));
    }
    if (issues.length) return result(mode, 'pilot-flags-only', issues);
    let settings;
    try { settings = readRegistrationPilotOptions(env); }
    catch { return result(mode, 'pilot-identity', [issue('pilot_identity_or_allowlist', 'invalid', 'explicit valid owner/server/channel and one-to-five unique learner IDs, excluding owner')]); }
    if (settings.enabled !== true) return result(mode, 'pilot-identity', [issue('pilot_settings', 'inactive', 'enabled pilot settings')]);
    let config;
    try { config = loadCertificationConfig(env); }
    catch { return result(mode, 'pilot-manifest', [issue('CERTIFICATION_ENROLLMENT_MANIFEST_JSON', 'invalid', 'valid local agreement/comprehension manifest')]); }
    if (!config.activeAgreementVersion || !config.activeAgreementSha256) return result(mode, 'pilot-manifest', [issue('CERTIFICATION_ENROLLMENT_MANIFEST_JSON', 'missing', 'explicit current manifest')]);
    if (settings.ownerId !== config.ownerId || settings.adminChannelId !== config.adminChannelId) {
      return result(mode, 'pilot-local-only', [issue('pilot_identity', 'inconsistent', 'matching local configured identities')]);
    }
    return result(mode, 'pilot-local-only', []);
  } catch {
    return result(mode, 'input', [issue('environment', 'unreadable', 'readable local configuration')]);
  }
}
