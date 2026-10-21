import { inspectRuntimeMode } from './certification-runtime-mode-preflight.js';
const args = process.argv.slice(2);
const mode = args.length === 1 && args[0] === '--mode=owner-preview' ? 'owner-preview'
  : args.length === 1 && args[0] === '--mode=registration-pilot' ? 'registration-pilot' : null;
if (!mode) {
  console.error('Usage: node certification-runtime-mode-preflight.mjs --mode=owner-preview OR --mode=registration-pilot');
  process.exitCode = 2;
} else {
  const report = inspectRuntimeMode(process.env, mode);
  if (report.ok) {
    console.log(`Local preflight passed for ${report.mode} (${report.scope}).`);
    console.log('Local checks only. Database/TLS/schema/role, Discord permissions, deployment binding and operational approvals are not established. Preview mode checks flags only.');
  } else {
    console.error('Local preflight failed. Supplied values are omitted; no configuration or service changes were made.');
    for (const item of report.issues) console.error(`${item.field}: ${item.code}; expected ${item.expected}.`);
    process.exitCode = 1;
  }
}
