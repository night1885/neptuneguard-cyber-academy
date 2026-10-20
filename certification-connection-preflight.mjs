import { probeCertificationConnection } from './certification-connection-preflight.js';

if (process.argv.length !== 3 || process.argv[2] !== '--check') {
  console.error('Explicit --check required; execution must be separately approved in the intended environment.');
  process.exitCode = 2;
} else {
  try { console.log(JSON.stringify(await probeCertificationConnection(process.env))); }
  catch {
    console.error(JSON.stringify({ ok: false, reason: 'connection_preflight_failed', credentialsReported: false }));
    process.exitCode = 1;
  }
}
