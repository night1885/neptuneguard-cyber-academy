import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { loadCertificationConfig } from './certification-config.js';
import { readCourseRuntimeOptions } from './certification-course-runtime.js';
import { readApplicationClosureFlag } from './certification-application-closure-runtime.js';
import { attachCertificationRuntime } from './certification-runtime.js';

test('reference certification configuration leaves every implemented feature disabled', async () => {
  const source = await readFile(new URL('./.env.certification.example', import.meta.url), 'utf8');
  const entries = source.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line); assert.ok(match, 'Reference assignment must be unambiguous'); return [match[1], match[2]];
  });
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  const env = Object.fromEntries(entries);
  for (const key of ['CERTIFICATION_ENABLED','CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED','CERTIFICATION_APPLICATION_CLOSURE_ENABLED','CERTIFICATION_COURSES_ENABLED']) assert.equal(env[key], 'false');
  const config = loadCertificationConfig(env); assert.equal(config.enabled, false); assert.equal(config.enrollmentSubmissionEnabled, false);
  assert.equal(readApplicationClosureFlag(env), false); assert.deepEqual(readCourseRuntimeOptions(env), { enabled: false });
  assert.equal(env.CERTIFICATION_DATABASE_TLS, 'verify-full');
  assert.equal(Object.hasOwn(env, 'CERTIFICATION_ENROLLMENT_MANIFEST_JSON'), false);
  assert.ok(!Object.keys(env).some(key => key.startsWith('CERTIFICATION_TEST_')));
  for (const key of ['DISCORD_TOKEN','GUILD_ID','VERIFIED_ROLE_ID','DATABASE_URL','ACADEMY_OWNER_ID','ACADEMY_ADMIN_CHANNEL_ID','CERTIFICATION_DATABASE_URL']) assert.equal(env[key], '');
  const client = new EventEmitter();
  const runtime = attachCertificationRuntime(client, undefined, '333333333333333333', env, { createPool() { assert.fail('Disabled example must not create a pool'); } });
  assert.equal(runtime.enabled, false); assert.equal(client.eventNames().length, 0); await runtime.detach();
});
