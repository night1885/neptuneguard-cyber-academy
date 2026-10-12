import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { buildCertificationPoolConfig, createCertificationDatabasePool } from './certification-database-pool.js';

const fixtureUrl = 'postgresql://fixture:fixture@127.0.0.1:5432/certification_test';
test('pool factory requires explicit URL and sets bounded startup options', () => {
  const config = buildCertificationPoolConfig({ connectionString: fixtureUrl });
  assert.equal(config.max, 4); assert.equal(config.connectionTimeoutMillis, 3000);
  assert.equal(config.options, '-c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000');
  assert.equal(config.query_timeout, undefined);
});
test('unsafe or disabled limits and URL overrides are rejected', () => {
  for (const connectionString of [undefined, '', 'not-a-url', 'https://localhost/db', 'postgresql://localhost',
    `${fixtureUrl}?options=-c%20statement_timeout=0`, `${fixtureUrl}#ignored`]) {
    assert.throws(() => buildCertificationPoolConfig({ connectionString }));
  }
  for (const limits of [{ max: 0 }, { max: 17 }, { statementTimeoutMs: 0 }, { connectionTimeoutMs: 0 },
    { idleTransactionTimeoutMs: -1 }, { lockTimeoutMs: 5000 }, { statementTimeoutMs: 1.5 }]) {
    assert.throws(() => buildCertificationPoolConfig({ connectionString: fixtureUrl }, limits));
  }
});
test('pool is lazy and has a sanitized idle-client error listener', async () => {
  const pool = createCertificationDatabasePool({ connectionString: fixtureUrl });
  try { assert.equal(pool.totalCount, 0); assert.equal(pool.listenerCount('error'), 1); }
  finally { await pool.end(); }
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
test('real PostgreSQL enforces statement and lock timeouts, rolls back, and bounds checkout wait', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5000,
    options: '-c statement_timeout=5000 -c lock_timeout=2000' });
  const pool = createCertificationDatabasePool({ connectionString: databaseUrl }, {
    connectionTimeoutMs: 500, statementTimeoutMs: 150, lockTimeoutMs: 50, idleTransactionTimeoutMs: 1000, max: 1 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; const table = `"${schema}".timeout_fixture`;
  let created = false; let client; let blocker;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    await admin.query(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, value INTEGER NOT NULL)`);
    await admin.query(`INSERT INTO ${table} VALUES (1,0)`);
    assert.equal((await pool.query('SHOW statement_timeout')).rows[0].statement_timeout, '150ms');
    assert.equal((await pool.query('SHOW lock_timeout')).rows[0].lock_timeout, '50ms');
    assert.equal((await pool.query('SHOW idle_in_transaction_session_timeout')).rows[0].idle_in_transaction_session_timeout, '1s');
    await assert.rejects(pool.query('SELECT pg_sleep(1)'), error => error.code === '57014');
    client = await pool.connect();
    await client.query('BEGIN'); await client.query(`UPDATE ${table} SET value=1 WHERE id=1`);
    await assert.rejects(client.query('SELECT pg_sleep(1)'), error => error.code === '57014');
    await client.query('ROLLBACK'); client.release(); client = null;
    assert.equal((await admin.query(`SELECT value FROM ${table} WHERE id=1`)).rows[0].value, 0);
    blocker = await admin.connect(); await blocker.query('BEGIN');
    await blocker.query(`SELECT * FROM ${table} WHERE id=1 FOR UPDATE`);
    await assert.rejects(pool.query(`UPDATE ${table} SET value=2 WHERE id=1`), error => error.code === '55P03');
    await blocker.query('ROLLBACK'); blocker.release(); blocker = null;
    client = await pool.connect();
    await assert.rejects(pool.connect());
    client.release(); client = null;
    assert.equal((await pool.query('SELECT 1 AS value')).rows[0].value, 1);
    assert.equal((await admin.query(`SELECT value FROM ${table} WHERE id=1`)).rows[0].value, 0);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(true); }
    if (blocker) { await blocker.query('ROLLBACK').catch(() => {}); blocker.release(true); }
    try { await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
});
