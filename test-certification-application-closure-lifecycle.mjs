import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationApplicationClosure } from './certification-application-closure.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
import { validateCertificationSchema } from './certification-schema-readiness.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567';
const content = 'Disposable closure lifecycle fixture; not a production agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'closure-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'closure-check', correctAnswers: ['stop'] } };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'closure-fixture', agreementSha256: hash, comprehensionCheckVersion: 'closure-check', answers: ['stop'] };
const clock = { now: () => new Date('2026-10-17T17:00:00.123Z') };
let nextId = 1223123544301633800n;
const newId = () => String(nextId++);
const files = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];

async function isolated(operation, withClosure = true) {
  const schema = `cert_close_life_${randomUUID().replaceAll('-', '')}`;
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  const workers = [], roles = []; let created = false;
  try {
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of [...files, ...(withClosure ? ['006-application-closure-metadata.sql'] : [])]) {
      await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await pool.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    await operation(pool, schema, { workers, roles });
  } finally {
    try { for (const worker of workers) await worker.end(); }
    finally {
      try { if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally {
        try { for (const role of roles) await pool.query(`DROP ROLE "${role}"`); }
        finally { await pool.end(); }
      }
    }
  }
}
async function pending(pool) {
  const id = newId(); await createCertificationSubmission(pool, config).submitEnrollment(id, input); return id;
}
async function row(pool, id) { return (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0]; }
async function events(pool, id) { return (await pool.query('SELECT action FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY event_id', [id])).rows.map(event => event.action); }

test('isolated PostgreSQL closure lifecycle boundaries', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test servers permitted');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('current readiness accepts 001-005 but closure service refuses missing closure columns without writes', async () => isolated(async pool => {
    await validateCertificationSchema(pool);
    const id = await pending(pool), before = await row(pool, id), history = await events(pool, id);
    await assert.rejects(createCertificationApplicationClosure(pool, config, clock).closeApplication(owner, id, 'withdrawn'), error => error.code === '42703');
    assert.deepEqual(await row(pool, id), before); assert.deepEqual(await events(pool, id), history);
  }, false));

  await t.test('migration 006 remains compatible with existing readiness and ordinary approval', async () => isolated(async pool => {
    await validateCertificationSchema(pool);
    const id = await pending(pool);
    const service = createCertificationService(pool, config);
    const approval = await service.approveEnrollment(owner, id);
    assert.equal((await service.getCourseAuthorization(id)).student_id, approval.studentId);
    await assert.rejects(createCertificationApplicationClosure(pool, config, clock).closeApplication(owner, id, 'denied'), /previously approved/);
    assert.equal((await row(pool, id)).application_closed_at, null);
    assert.deepEqual(await events(pool, id), ['enrollment_submitted', 'enrollment_approved']);
  }));

  await t.test('closed submitted applications cannot be approved, resubmitted, invited, or recreated', async () => isolated(async pool => {
    const id = await pending(pool);
    await createCertificationApplicationClosure(pool, config, clock).closeApplication(owner, id, 'withdrawn');
    const before = await row(pool, id), history = await events(pool, id);
    await assert.rejects(createCertificationService(pool, config).approveEnrollment(owner, id), /Only pending/);
    const submission = createCertificationSubmission(pool, config);
    await assert.rejects(submission.submitEnrollment(id, input), /owner review/);
    await assert.rejects(submission.submitInvitedEnrollment(id, input), /Pending admin registration invitation/);
    assert.equal(await createRegistrationInvitationReader(pool, config).hasPendingInvitation(id), false);
    const registration = await createOwnerRegistrationService(pool, config).register(owner, id);
    assert.equal(registration.created, false); assert.equal(registration.record.status, 'denied');
    assert.equal(await createCertificationService(pool, config).getCourseAuthorization(id), null);
    assert.deepEqual(await row(pool, id), before); assert.deepEqual(await events(pool, id), history);
  }));

  await t.test('closing an unacknowledged admin invitation removes invitation eligibility without fabricating declarations', async () => isolated(async pool => {
    const id = newId();
    await createOwnerRegistrationService(pool, config).register(owner, id);
    const reader = createRegistrationInvitationReader(pool, config);
    assert.equal(await reader.hasPendingInvitation(id), true);
    await createCertificationApplicationClosure(pool, config, clock).closeApplication(owner, id, 'abandoned');
    assert.equal(await reader.hasPendingInvitation(id), false);
    await assert.rejects(createCertificationSubmission(pool, config).submitInvitedEnrollment(id, input), /Pending admin registration invitation/);
    const record = await row(pool, id);
    for (const field of ['student_id', 'acknowledged_at', 'learner_confirmed_read_at', 'comprehension_passed_at', 'age_eligible', 'age_declared_at']) assert.equal(record[field], null);
    assert.deepEqual(await events(pool, id), ['student_registered_by_owner', 'application_closed']);
  }));

  await t.test('approval-versus-closure races produce exactly one successful state transition', async () => isolated(async pool => {
    const service = createCertificationService(pool, config), closure = createCertificationApplicationClosure(pool, config, clock);
    for (let attempt = 0; attempt < 8; attempt++) {
      const id = await pending(pool);
      const results = await Promise.allSettled([service.approveEnrollment(owner, id), closure.closeApplication(owner, id, 'withdrawn')]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const record = await row(pool, id), history = await events(pool, id);
      assert.equal(history.filter(action => ['enrollment_approved', 'application_closed'].includes(action)).length, 1);
      if (record.status === 'approved') {
        assert.equal(record.application_closed_at, null); assert.ok(record.student_id);
        assert.equal((await service.getCourseAuthorization(id)).student_id, record.student_id);
        assert.match(results[1].reason.message, /previously approved/);
      } else {
        assert.equal(record.status, 'denied'); assert.equal(record.student_id, null);
        assert.equal(record.application_closed_as, 'withdrawn');
        assert.equal(await service.getCourseAuthorization(id), null);
        assert.match(results[0].reason.message, /Only pending/);
      }
    }
  }));

  await t.test('restricted login can close applications but cannot delete records or alter safeguards', { skip: process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL !== 'true' }, async () => isolated(async (pool, schema, resources) => {
    const role = `cert_close_role_${randomUUID().replaceAll('-', '')}`, password = randomUUID();
    const id = await pending(pool);
    await pool.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); resources.roles.push(role);
    await pool.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await pool.query(`GRANT SELECT, UPDATE ON certification_enrollments TO "${role}"`);
    await pool.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);
    await pool.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const workerUrl = new URL(databaseUrl); workerUrl.username = role; workerUrl.password = password;
    const worker = new pg.Pool({ connectionString: workerUrl.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000` }); resources.workers.push(worker);
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    const privileges = (await worker.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    assert.ok(Object.values(privileges).every(value => value === false));
    const closure = createCertificationApplicationClosure(worker, config, clock);
    assert.equal((await closure.closeApplication(owner, id, 'withdrawn')).alreadyClosed, false);
    assert.equal((await closure.closeApplication(owner, id, 'withdrawn')).alreadyClosed, true);
    assert.deepEqual(await events(pool, id), ['enrollment_submitted', 'application_closed']);
    await assert.rejects(worker.query('UPDATE certification_enrollments SET application_closed_at=NULL,application_closed_by=NULL,application_closed_as=NULL WHERE discord_user_id=$1', [id]), error => error.code === 'P0001');
    await assert.rejects(worker.query("UPDATE certification_enrollments SET status='pending' WHERE discord_user_id=$1", [id]), error => error.code === '23514');
    for (const sql of ['DELETE FROM certification_enrollments', 'DELETE FROM certification_audit_events', 'UPDATE certification_audit_events SET action=action', 'TRUNCATE certification_audit_events',
      'ALTER TABLE certification_enrollments DISABLE TRIGGER certification_application_closure_immutable', 'ALTER TABLE certification_enrollments DROP CONSTRAINT certification_application_closure_complete']) {
      await assert.rejects(worker.query(sql), error => error.code === '42501');
    }
    const other = await pending(pool);
    await pool.query(`REVOKE INSERT ON certification_audit_events FROM "${role}"`);
    await assert.rejects(closure.closeApplication(owner, other, 'denied'), error => error.code === '42501');
    assert.equal((await row(pool, other)).status, 'pending'); assert.equal((await row(pool, other)).application_closed_at, null);
    assert.deepEqual(await events(pool, other), ['enrollment_submitted']);
  }));
});
