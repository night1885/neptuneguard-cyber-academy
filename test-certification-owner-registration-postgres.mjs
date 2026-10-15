import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const optedIn = process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL === 'true';
const owner = '111111111111111111', student = '222222222222222222';

test('disposable PostgreSQL owner registration', { skip: !databaseUrl || !optedIn, timeout: 120000 }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test');
  assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `registration_test_${randomUUID().replaceAll('-', '')}`;
  let created = false, pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql']) {
      await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    const service = createOwnerRegistrationService(pool, { enabled: true, ownerId: owner });
    const results = await Promise.all([service.register(owner, student), service.register(owner, student)]);
    assert.equal(results.filter(result => result.created).length, 1);
    const records = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows;
    assert.equal(records.length, 1);
    const record = records[0];
    assert.equal(record.status, 'awaiting_acknowledgment');
    for (const field of ['student_id', 'approved_by', 'approved_at', 'signature_method', 'acknowledged_at', 'age_eligible', 'age_declared_at']) assert.equal(record[field], null, field);
    const events = (await pool.query('SELECT * FROM certification_audit_events WHERE subject_discord_user_id=$1', [student])).rows;
    assert.equal(events.length, 1);
    assert.equal(events[0].actor_discord_user_id, owner);
    assert.equal(events[0].action, 'student_registered_by_owner');
    assert.equal(events[0].details.accessGranted, false);
    await pool.query(`UPDATE certification_enrollments SET status='denied', status_reason='fixture denial' WHERE discord_user_id=$1`, [student]);
    const before = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal((await service.register(owner, student)).created, false);
    assert.deepEqual((await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0], before);
    await pool.query(`ALTER TABLE certification_audit_events ADD CONSTRAINT reject_fixture_registration CHECK (subject_discord_user_id <> '444444444444444444')`);
    await assert.rejects(service.register(owner, '444444444444444444'));
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_enrollments WHERE discord_user_id=$1', ['444444444444444444'])).rows[0].count, 0);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 1);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
});
