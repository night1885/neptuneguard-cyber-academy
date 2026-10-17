import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const optedIn = process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL === 'true';
const owner = '111111111111111111';

test('disposable PostgreSQL invited submissions', { skip: !databaseUrl || !optedIn, timeout: 120000 }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `invited_submission_${randomUUID().replaceAll('-', '')}`;
  let created = false, pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'Disposable invited submission agreement.', hash = createHash('sha256').update(content).digest('hex');
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['v1', content, hash]);
    const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: false, activeAgreementVersion: 'v1', activeAgreementSha256: hash, comprehensionCheck: { version: 'v1', correctAnswers: ['A'] } };
    const payload = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'v1', agreementSha256: hash, comprehensionCheckVersion: 'v1', answers: ['A'] };
    const registration = createOwnerRegistrationService(pool, config), submission = createCertificationSubmission(pool, config);
    const reader = createRegistrationInvitationReader(pool, config), access = createCertificationService(pool, config);
    const snapshot = async id => ({ records: (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows, events: (await pool.query('SELECT * FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY event_id', [id])).rows });
    await t.test('valid invitation only creates a complete pending acknowledgment, never course access', async () => {
      const id = '222222222222222222'; await registration.register(owner, id);
      assert.deepEqual(await submission.submitInvitedEnrollment(id, payload), { status: 'pending', alreadySubmitted: false });
      const state = await snapshot(id), record = state.records[0];
      assert.equal(record.status, 'pending'); assert.equal(hasCompleteAccountAcknowledgment(record), true);
      for (const field of ['student_id', 'approved_by', 'approved_at']) assert.equal(record[field], null);
      assert.equal(await access.getCourseAuthorization(id), null); assert.equal(await reader.hasPendingInvitation(id), false);
      assert.deepEqual(state.events.map(event => event.action), ['student_registered_by_owner', 'enrollment_submitted']);
      assert.equal(state.events[1].actor_discord_user_id, id);
      await assert.rejects(submission.submitInvitedEnrollment(id, payload), /invitation required/);
      assert.deepEqual(await snapshot(id), state);
    });
    await t.test('two concurrent invited submissions yield exactly one pending transition and one submission event', async () => {
      const id = '333333333333333333'; await registration.register(owner, id);
      const results = await Promise.allSettled([submission.submitInvitedEnrollment(id, payload), submission.submitInvitedEnrollment(id, payload)]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const failed = results.filter(result => result.status === 'rejected'); assert.equal(failed.length, 1); assert.match(failed[0].reason.message, /invitation required/);
      const state = await snapshot(id); assert.equal(state.records.length, 1); assert.equal(state.records[0].status, 'pending');
      assert.equal(state.events.filter(event => event.action === 'enrollment_submitted').length, 1);
      assert.equal(await access.getCourseAuthorization(id), null);
    });
    await t.test('ordinary submission remains closed even for an invited learner', async () => {
      const id = '444444444444444444'; await registration.register(owner, id); const before = await snapshot(id);
      await assert.rejects(submission.submitEnrollment(id, payload), /disabled/); assert.deepEqual(await snapshot(id), before);
    });
    await t.test('absent record and awaiting record without admin provenance cannot submit', async () => {
      const absent = '555555555555555555'; const beforeAbsent = await snapshot(absent);
      await assert.rejects(submission.submitInvitedEnrollment(absent, payload), /record unavailable/); assert.deepEqual(await snapshot(absent), beforeAbsent);
      const untrusted = '666666666666666666'; await pool.query(`INSERT INTO certification_enrollments (discord_user_id, status) VALUES ($1,'awaiting_acknowledgment')`, [untrusted]);
      const before = await snapshot(untrusted); await assert.rejects(submission.submitInvitedEnrollment(untrusted, payload), /invitation required/); assert.deepEqual(await snapshot(untrusted), before);
    });
    await t.test('registration by a different configured admin does not authorize this admin path', async () => {
      const id = '777777777777777777', otherAdmin = '999999999999999999';
      await createOwnerRegistrationService(pool, { ...config, ownerId: otherAdmin }).register(otherAdmin, id);
      const before = await snapshot(id); await assert.rejects(submission.submitInvitedEnrollment(id, payload), /invitation required/); assert.deepEqual(await snapshot(id), before);
    });
    await t.test('denied record cannot be reopened through an old registration event', async () => {
      const id = '888888888888888888'; await registration.register(owner, id);
      await pool.query(`UPDATE certification_enrollments SET status='denied', status_reason='fixture denial' WHERE discord_user_id=$1`, [id]);
      const before = await snapshot(id); await assert.rejects(submission.submitInvitedEnrollment(id, payload), /invitation required/); assert.deepEqual(await snapshot(id), before);
    });
    await t.test('audit insert failure rolls back acknowledgment and leaves invitation retryable', async () => {
      const id = '101010101010101010'; await registration.register(owner, id);
      await pool.query(`ALTER TABLE certification_audit_events ADD CONSTRAINT reject_invited_submission_fixture CHECK (NOT (subject_discord_user_id='101010101010101010' AND action='enrollment_submitted'))`);
      const before = await snapshot(id); await assert.rejects(submission.submitInvitedEnrollment(id, payload));
      assert.deepEqual(await snapshot(id), before); assert.equal(await reader.hasPendingInvitation(id), true);
      assert.equal(await access.getCourseAuthorization(id), null);
    });
    assert.equal(config.enrollmentSubmissionEnabled, false);
  } finally {
    try { if (pool) await pool.end(); } finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); }
    }
  }
});
