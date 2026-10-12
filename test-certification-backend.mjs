import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suites = [
  'test-certification-acknowledgment.mjs',
  'test-certification-service.mjs',
  'test-certification-access.mjs'
];

const result = spawnSync(process.execPath, ['--test', ...suites], {
  cwd: fileURLToPath(new URL('.', import.meta.url)),
  stdio: 'inherit',
  timeout: 60000
});

if (result.error) {
  console.error(`Backend test execution failed: ${result.error.message}`);
  process.exitCode = 1;
} else if (result.signal) {
  console.error(`Backend test execution terminated by ${result.signal}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
