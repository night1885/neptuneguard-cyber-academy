import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const migrations = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];
const closureMigration = new URL('./migrations/006-application-closure-metadata.sql', import.meta.url);
const actor = '1223123544301633567';
const closedAt = '2026-10-16T16:00:00.123Z';
let nextId = 1223123544301633600n;

async function isolated(operation) {
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_closure_${randomUUID().replaceAll('-', '')}`;
  let pool; let created = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test', 'Dedicated test database required');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of migrations) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await operation(pool);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
}
async function apply(pool) { await pool.query(await readFile(closureMigration, 'utf8')); }
async function application(pool, studentId = null) {
  const id = String(nextId++);
  await pool.query("INSERT INTO certification_enrollments (discord_user_id,status,student_id) VALUES ($1,'denied',$2)", [id, studentId]);
  return id;
}
async function close(pool, id, category = 'denied', time = closedAt, by = actor) {
  await pool.query('UPDATE certification_enrollments SET application_closed_at=$2, application_closed_by=$3, application_closed_as=$4 WHERE discord_user_id=$1', [id, time, by, category]);
}

test('isolated PostgreSQL application closure schema', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test servers permitted');
  assert.equal(url.pathname, '/certification_test');
  assert.equal(url.search, '', 'URL query overrides forbidden');
  assert.equal(url.hash, '');

  await t.test('migration preserves old records, assigns no closure, and can be reapplied', async () => isolated(async pool => {
    const id = await application(pool, 'NG-fixture-existing-id');
    const request = randomUUID();
    await pool.query("INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [request, id]);
    await pool.query("INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action,created_at) VALUES ($1,$2,'fixture_old_event','2001-01-01T00:00:00Z')", [actor, id]);
    await apply(pool); await apply(pool);
    const row = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    assert.equal(row.student_id, 'NG-fixture-existing-id');
    assert.equal(row.status, 'denied');
    for (const key of ['application_closed_at', 'application_closed_by', 'application_closed_as']) assert.equal(row[key], null);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM certification_lab_requests')).rows[0].n, 1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM certification_audit_events')).rows[0].n, 1);
  }));

  await t.test('all three explicit closure categories round-trip at millisecond precision', async () => isolated(async pool => {
    await apply(pool);
    for (const category of ['denied', 'withdrawn', 'abandoned']) {
      const id = await application(pool); await close(pool, id, category);
      const row = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
      assert.equal(row.application_closed_at.toISOString(), closedAt);
      assert.equal(row.application_closed_by, actor); assert.equal(row.application_closed_as, category);
      assert.equal(applicationDeletionEligibleAt(row.application_closed_at).toISOString(), '2026-10-22T04:00:00.000Z');
      assert.equal(row.status, 'denied'); assert.equal(row.student_id, null);
    }
  }));

  await t.test('partial, invalid, non-finite, out-of-range, and sub-millisecond closures are rejected', async () => isolated(async pool => {
    await apply(pool);
    const id = await application(pool);
    await assert.rejects(pool.query('UPDATE certification_enrollments SET application_closed_at=$2 WHERE discord_user_id=$1', [id, closedAt]), /check constraint/);
    await assert.rejects(close(pool, id, 'inactive'), /check constraint/);
    await assert.rejects(close(pool, id, 'denied', closedAt, 'not-an-actor-id'), /check constraint/);
    for (const time of ['infinity', '-infinity', '1969-12-31T23:59:59Z', '9999-01-01T00:00:00Z', '2026-10-16T16:00:00.123456Z']) {
      await assert.rejects(close(pool, id, 'denied', time), /check constraint/);
    }
    const row = (await pool.query('SELECT application_closed_at FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    assert.equal(row.application_closed_at, null);
  }));

  await t.test('pending status and issued student IDs cannot be combined with closure metadata', async () => isolated(async pool => {
    await apply(pool);
    const pending = await application(pool);
    await pool.query("UPDATE certification_enrollments SET status='pending' WHERE discord_user_id=$1", [pending]);
    await assert.rejects(close(pool, pending), /check constraint/);
    const issued = await application(pool, 'NG-fixture-issued-id');
    await assert.rejects(close(pool, issued), /check constraint/);
  }));

  await t.test('recorded closure cannot be reset, replaced, reopened, or assigned a student ID', async () => isolated(async pool => {
    await apply(pool);
    const id = await application(pool); await close(pool, id, 'withdrawn');
    await assert.rejects(pool.query('UPDATE certification_enrollments SET application_closed_at=NULL,application_closed_by=NULL,application_closed_as=NULL WHERE discord_user_id=$1', [id]), /cannot be reset or replaced/);
    await assert.rejects(close(pool, id, 'withdrawn', '2026-10-17T16:00:00.123Z'), /cannot be reset or replaced/);
    await assert.rejects(close(pool, id, 'abandoned'), /cannot be reset or replaced/);
    await assert.rejects(close(pool, id, 'withdrawn', closedAt, '1223123544301633568'), /cannot be reset or replaced/);
    await assert.rejects(pool.query("UPDATE certification_enrollments SET status='pending' WHERE discord_user_id=$1", [id]), /check constraint/);
    await assert.rejects(pool.query("UPDATE certification_enrollments SET student_id='NG-fixture-new-id' WHERE discord_user_id=$1", [id]), /check constraint/);
    await close(pool, id, 'withdrawn');
    await apply(pool);
    assert.equal((await pool.query('SELECT application_closed_as FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0].application_closed_as, 'withdrawn');
  }));
});
