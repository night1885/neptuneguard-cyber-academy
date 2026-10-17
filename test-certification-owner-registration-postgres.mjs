import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
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
    const settings = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: false };
    const invitation = createRegistrationInvitationReader(pool, settings);
    assert.equal(await invitation.hasPendingInvitation(student), false);
    const service = createOwnerRegistrationService(pool, settings);
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
    assert.equal(await invitation.hasPendingInvitation(student), true);
    assert.equal(await invitation.hasPendingInvitation(student), true);
    assert.deepEqual((await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows, records);
    assert.deepEqual((await pool.query('SELECT * FROM certification_audit_events WHERE subject_discord_user_id=$1', [student])).rows, events);
    assert.equal(await createRegistrationInvitationReader(pool, { ...settings, ownerId: '666666666666666666' }).hasPendingInvitation(student), false);
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const reader = createRegistrationInvitationReader(db, settings);
      const other = '555555555555555555', stranger = '666666666666666666', unrelated = '777777777777777777';
      await db.query(`INSERT INTO certification_enrollments (discord_user_id, status) VALUES ($1,'awaiting_acknowledgment')`, [other]);
      assert.equal(await reader.hasPendingInvitation(other), false, 'An awaiting record is not an admin invitation');
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action) VALUES ($1,$2,'student_registered_by_owner')`, [stranger, other]);
      assert.equal(await reader.hasPendingInvitation(other), false, 'Another actor cannot create the configured admin invitation');
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action) VALUES ($1,$2,'student_registered_by_owner')`, [owner, unrelated]);
      assert.equal(await reader.hasPendingInvitation(other), false, 'Registration for another subject does not qualify');
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action) VALUES ($1,$2,'fixture_other_action')`, [owner, other]);
      assert.equal(await reader.hasPendingInvitation(other), false, 'An unrelated admin action does not qualify');
      for (const status of ['pending', 'denied', 'suspended', 'revoked']) {
        await db.query('UPDATE certification_enrollments SET status=$2 WHERE discord_user_id=$1', [student, status]);
        assert.equal(await reader.hasPendingInvitation(student), false, status);
      }
      await db.query(`UPDATE certification_enrollments SET status='awaiting_acknowledgment' WHERE discord_user_id=$1`, [student]);
      assert.equal(await reader.hasPendingInvitation(student), true);
      await db.query('UPDATE certification_enrollments SET approved_by=$2 WHERE discord_user_id=$1', [student, owner]);
      assert.equal(await reader.hasPendingInvitation(student), false, 'Historical approval blocks invitation');
      await db.query('UPDATE certification_enrollments SET approved_by=NULL, approved_at=NOW() WHERE discord_user_id=$1', [student]);
      assert.equal(await reader.hasPendingInvitation(student), false, 'Historical approval timestamp blocks invitation');
      await db.query('UPDATE certification_enrollments SET approved_at=NULL, student_id=$2 WHERE discord_user_id=$1', [student, 'NG-INVITATION-FIXTURE']);
      assert.equal(await reader.hasPendingInvitation(student), false, 'Issued permanent ID blocks invitation');
    } finally {
      try { await db.query('ROLLBACK'); } finally { db.release(); }
    }
    assert.equal(await invitation.hasPendingInvitation(student), true, 'Disposable transaction restores the original fixture');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 1);
    await pool.query(`UPDATE certification_enrollments SET status='denied', status_reason='fixture denial' WHERE discord_user_id=$1`, [student]);
    assert.equal(await invitation.hasPendingInvitation(student), false);
    const before = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal((await service.register(owner, student)).created, false);
    assert.equal(await invitation.hasPendingInvitation(student), false, 'Repeated admin registration cannot reopen a denied record');
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
