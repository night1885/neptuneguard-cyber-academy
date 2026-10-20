import { inspectPreviewFeatureFlags } from './certification-preview-flag-preflight.js';

const result = inspectPreviewFeatureFlags(process.env);
if (result.ok) {
  console.log('Owner-preview feature flags passed. This does not establish full configuration, database, Discord or application readiness.');
} else {
  console.error('Owner-preview feature flags failed; no connections or configuration changes were made.');
  for (const issue of result.issues) {
    console.error(`${issue.field}: ${issue.code}; expected exactly ${issue.expected} (lowercase, no quotes or whitespace).`);
  }
  process.exitCode = 1;
}
