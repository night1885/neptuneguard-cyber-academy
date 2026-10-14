import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { CERTIFICATION_AGE_POLICY_VERSION, hasCurrentAgeEligibility } from './certification-age-evidence.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const migrations = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql'];
const learner = '1223123544301633568';
const rollbackLearner = '1223123544301633569';

test('migration 005 preserves legacy rows, rejects partial evidence, and supports transactional rollback', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`;
  let created = false; let pool; let client;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5000,
      options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of migrations) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query('INSERT INTO certification_enrollments (discord_user_id) VALUES ($1)', [learner]);
    const migration = await readFile(new URL('./migrations/005-age-eligibility-evidence.sql', import.meta.url), 'utf8');
    await pool.query(migration); await pool.query(migration);
    const read = async id => (await pool.query('SELECT age_eligibility_confirmed, age_eligibility_confirmed_at, age_policy_version FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    const empty = { age_eligibility_confirmed: null, age_eligibility_confirmed_at: null, age_policy_version: null };
    assert.deepEqual(await read(learner), empty); assert.equal(hasCurrentAgeEligibility(await read(learner)), false);
    assert.equal((await pool.query('SELECT status, student_id FROM certification_enrollments WHERE discord_user_id=$1', [learner])).rows[0].status, 'awaiting_acknowledgment');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 0);
    const columns = (await pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', [schema, 'certification_enrollments'])).rows.map(row => row.column_name);
    for (const name of Object.keys(empty)) assert.ok(columns.includes(name));
    const partial = [
      'age_eligibility_confirmed=true',
      'age_eligibility_confirmed_at=NOW()',
      "age_policy_version='age-16-v1'",
      "age_eligibility_confirmed=true, age_policy_version='age-16-v1'",
      "age_eligibility_confirmed=false, age_eligibility_confirmed_at=NOW(), age_policy_version='age-16-v1'",
      "age_eligibility_confirmed=true, age_eligibility_confirmed_at=NOW(), age_policy_version=''"
    ];
    for (const assignments of partial) {
      await assert.rejects(pool.query(`UPDATE certification_enrollments SET ${assignments} WHERE discord_user_id=$1`, [learner]), error => error.code === '23514');
      assert.deepEqual(await read(learner), empty);
    }
    await assert.rejects(pool.query('UPDATE certification_enrollments SET age_eligibility_confirmed=true, age_eligibility_confirmed_at=NOW(), age_policy_version=$2 WHERE discord_user_id=$1', [learner, 'x'.repeat(101)]), error => error.code === '23514');
    await pool.query('UPDATE certification_enrollments SET age_eligibility_confirmed=true, age_eligibility_confirmed_at=NOW(), age_policy_version=$2 WHERE discord_user_id=$1', [learner, CERTIFICATION_AGE_POLICY_VERSION]);
    assert.equal(hasCurrentAgeEligibility(await read(learner)), true);
    await pool.query('UPDATE certification_enrollments SET age_policy_version=$2 WHERE discord_user_id=$1', [learner, 'older-policy']);
    assert.equal(hasCurrentAgeEligibility(await read(learner)), false);
    await pool.query('INSERT INTO certification_enrollments (discord_user_id) VALUES ($1)', [rollbackLearner]);
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('UPDATE certification_enrollments SET age_eligibility_confirmed=true, age_eligibility_confirmed_at=NOW(), age_policy_version=$2 WHERE discord_user_id=$1', [rollbackLearner, CERTIFICATION_AGE_POLICY_VERSION]);
    await assert.rejects(client.query('SELECT 1/0'), error => error.code === '22012');
    await client.query('ROLLBACK'); client.release(); client = null;
    assert.deepEqual(await read(rollbackLearner), empty);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(true); }
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
});
