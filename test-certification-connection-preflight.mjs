import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { probeCertificationConnection } from './certification-connection-preflight.js';

const role = 'neptuneguard_certification_app', database = 'neptuneguard_cyber_academy_db';
const host = 'dpg-db1touu7bikc73bl9vhg-a.oregon-postgres.render.com';
const env = { CERTIFICATION_DATABASE_URL: `postgresql://${role}:PRIVATE-FIXTURE@${host}:5432/${database}`, CERTIFICATION_DATABASE_TLS: 'verify-full' };
function fixture({ identity = { database_name: database, effective_role: role, session_role: role }, tls = { ssl: true, version: 'TLSv1.3' }, failQuery = false, failRollback = false, failEnd = false, failConnect = false, idleError = false } = {}) {
  const calls = [], released = []; let config, factories = 0, onError;
  const client = { async query(sql) {
    calls.push(sql);
    if (sql === 'BEGIN READ ONLY' || sql === 'COMMIT') return { rows: [] };
    if (sql === 'ROLLBACK') { if (failRollback) throw new Error('PRIVATE rollback'); return { rows: [] }; }
    if (failQuery) throw new Error('PRIVATE driver connection string');
    if (sql.startsWith('SELECT current_database')) { if (idleError) onError(new Error('PRIVATE idle')); return { rows: [identity] }; }
    if (sql.includes('pg_stat_ssl')) return { rows: [tls] };
    assert.fail('Unexpected SQL');
  }, release(discard) { released.push(discard); } };
  const pool = { on(event, callback) { assert.equal(event, 'error'); onError = callback; }, async connect() { if (failConnect) throw new Error('PRIVATE connect'); return client; }, async end() { calls.push('END_POOL'); if (failEnd) throw new Error('PRIVATE cleanup'); } };
  return { calls, released, get config() { return config; }, get factories() { return factories; }, createPool(value) { factories++; config = value; return pool; } };
}
test('connection preflight requires approved target and explicit strict TLS before creating a pool', async () => {
  for (const change of [{ CERTIFICATION_DATABASE_TLS: 'disable' }, { CERTIFICATION_DATABASE_TLS: undefined }, { CERTIFICATION_DATABASE_URL: undefined },
    { CERTIFICATION_DATABASE_URL: `postgresql://neptune_db:PRIVATE@${host}/${database}` },
    { CERTIFICATION_DATABASE_URL: `postgresql://${role}:PRIVATE@elsewhere.invalid/${database}` },
    { CERTIFICATION_DATABASE_URL: `postgresql://${role}:PRIVATE@${host}/wrong_database` }]) {
    const f = fixture(); await assert.rejects(probeCertificationConnection({ ...env, ...change }, { createPool: value => f.createPool(value) }), /failed at configuration/); assert.equal(f.factories, 0);
  }
});
test('successful mocked preflight uses one strict-TLS pool and only connection metadata', async () => {
  const f = fixture(), result = await probeCertificationConnection(env, { createPool: value => f.createPool(value) });
  assert.equal(result.ok, true); assert.equal(result.login, role); assert.equal(result.tlsProtocol, 'TLSv1.3');
  assert.equal(result.discordStarted, false); assert.equal(result.applicationRowsRead, false);
  assert.equal(f.config.max, 1); assert.equal(f.config.ssl.rejectUnauthorized, true);
  assert.equal(f.config.connectionTimeoutMillis, 3000); assert.match(f.config.options, /statement_timeout=5000/);
  assert.equal(f.calls[0], 'BEGIN READ ONLY'); assert.equal(f.calls.at(-2), 'COMMIT'); assert.equal(f.calls.at(-1), 'END_POOL');
  assert.deepEqual(f.released, [false]); assert.doesNotMatch(JSON.stringify(result), /PRIVATE|postgresql:|password|connectionString/);
  assert.doesNotMatch(f.calls.join(' '), /certification_enrollments|certification_audit_events|learner_profiles|INSERT|UPDATE|DELETE|CREATE|GRANT/);
});
test('wrong session identity, missing server TLS, idle errors, and driver failures never report success', async () => {
  for (const options of [{ identity: { database_name: database, effective_role: role, session_role: 'neptune_db' } },
    { tls: { ssl: false, version: null } }, { tls: { ssl: true, version: 'unexpected' } }, { failQuery: true }, { idleError: true }, { failConnect: true }, { failEnd: true }]) {
    const f = fixture(options);
    await assert.rejects(probeCertificationConnection(env, { createPool: value => f.createPool(value) }), error => { assert.doesNotMatch(error.message, /PRIVATE/); assert.equal(error.cause, undefined); return /connection preflight failed/.test(error.message); });
    assert.equal(f.calls.at(-1), 'END_POOL');
    if (!options.failConnect && !options.failEnd) assert.ok(f.calls.includes('ROLLBACK'));
  }
});
test('rollback failures discard the client while still closing the pool', async () => {
  const f = fixture({ failQuery: true, failRollback: true });
  await assert.rejects(probeCertificationConnection(env, { createPool: value => f.createPool(value) }), /failed at identity/);
  assert.deepEqual(f.released, [true]); assert.equal(f.calls.at(-1), 'END_POOL');
});
test('diagnostic entry is opt-in and does not load dotenv, start Discord, or alter the package entry point', async () => {
  const entry = await readFile(new URL('./certification-connection-preflight.mjs', import.meta.url), 'utf8');
  assert.match(entry, /process\.argv\[2\] !== '--check'/);
  assert.doesNotMatch(entry, /dotenv|discord\.js|createRestoredCertificationApplication|trigger_deploy/);
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.main, 'instructor.js'); assert.equal(pkg.scripts.start, 'node instructor.js');
});
