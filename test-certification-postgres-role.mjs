import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';
import { createAgeCheckedCertificationService } from './certification-age-approval.js';
import { createCertificationAgeRenewal } from './certification-age-renewal.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';
import { createCertificationAccessManagement } from './certification-access-management.js';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL; const permitted = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
const files = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql'];
test('restricted PostgreSQL role supports evidence renewal and separate reinstatement without safeguard/audit mutation privileges', { skip: !databaseUrl || !permitted }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const suffix = randomUUID().replaceAll('-', ''); const schema = `cert_test_${suffix}`; const role = `cert_role_${suffix}`;
  const password = randomUUID(); const workerUrl = new URL(databaseUrl); workerUrl.username = role; workerUrl.password = password;
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let schemaCreated = false; let roleCreated = false; let worker; let client;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const file of files) await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'Restricted-role fixture agreement only.'; const hash = createHash('sha256').update(content).digest('hex');
    await admin.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v1', content, hash]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`); await admin.query(`GRANT SELECT ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT SELECT, INSERT, UPDATE ON certification_enrollments TO "${role}"`); await admin.query(`GRANT SELECT, UPDATE ON certification_lab_requests TO "${role}"`);
    await admin.query(`GRANT INSERT ON certification_audit_events TO "${role}"`); await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    worker = new pg.Pool({ connectionString: workerUrl.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000` }); client = await worker.connect();
    const identity = (await client.query('SELECT current_user AS current, session_user AS session')).rows[0]; assert.deepEqual(identity, { current: role, session: role });
    const privileges = (await client.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0]; assert.ok(Object.values(privileges).every(value => value === false));
    const lockedRead = 'SELECT content, content_sha256 FROM certification_agreements WHERE version=$1 FOR SHARE';
    await assert.rejects(client.query(lockedRead, ['fixture-v1']), error => error.code === '42501'); await admin.query(`GRANT UPDATE (version) ON certification_agreements TO "${role}"`);
    const columns = (await client.query(`SELECT has_column_privilege(current_user, 'certification_agreements', 'version', 'UPDATE') AS version_update, has_column_privilege(current_user, 'certification_agreements', 'content', 'UPDATE') AS content_update, has_column_privilege(current_user, 'certification_agreements', 'content_sha256', 'UPDATE') AS hash_update`)).rows[0];
    assert.deepEqual(columns, { version_update: true, content_update: false, hash_update: false }); assert.equal((await client.query(lockedRead, ['fixture-v1'])).rows[0].content, content);
    await assert.rejects(client.query("UPDATE certification_agreements SET version='blocked-version' WHERE version='fixture-v1'"), error => error.code === 'P0001' && /immutable/.test(error.message));
    const pool = { query: (...args) => client.query(...args), async connect() { return { query: (...args) => client.query(...args), release() {} }; } };
    const owner = '1223123544301633567'; const learner = '1223123544301633568';
    const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: owner, activeAgreementVersion: 'fixture-v1', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
    const input = { typedName: 'Fixture Learner', confirmedRead: true, reportedAge: 16, answers: ['stop'], agreementVersion: 'fixture-v1', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check' };
    await validateCertificationSchema(pool); await validateActiveEnrollmentAgreement(pool, config);
    const submission = createAgeCheckedCertificationSubmission(pool, config); const service = createAgeCheckedCertificationService(pool, config); const access = createCertificationAccessManagement(pool, config); const renewal = createCertificationAgeRenewal(pool, config);
    assert.equal((await submission.submitEnrollment(learner, input)).status, 'pending');
    assert.equal(hasCurrentAgeEligibility((await pool.query('SELECT age_eligibility_confirmed, age_eligibility_confirmed_at, age_policy_version FROM certification_enrollments WHERE discord_user_id=$1', [learner])).rows[0]), true);
    assert.equal(await service.getCourseAuthorization(learner), null);
    const approved = await service.approveEnrollment(owner, learner); assert.match(approved.studentId, /^NG-PT-/);
    assert.equal((await service.approveEnrollment(owner, learner)).alreadyApproved, true); assert.equal((await service.getCourseAuthorization(learner)).student_id, approved.studentId);
    assert.equal((await access.changeEnrollmentStatus(owner, learner, 'suspend', 'Fixture review')).status, 'suspended'); assert.equal(await service.getCourseAuthorization(learner), null);
    await admin.query('UPDATE certification_enrollments SET age_eligibility_confirmed=NULL, age_eligibility_confirmed_at=NULL, age_policy_version=NULL WHERE discord_user_id=$1', [learner]);
    await assert.rejects(access.changeEnrollmentStatus(owner, learner, 'reinstate', 'Fixture review before renewal'), /age eligibility/);
    assert.deepEqual(await renewal.renewEligibility(learner, input), { status: 'suspended', alreadyConfirmed: false });
    assert.equal((await renewal.renewEligibility(learner, input)).alreadyConfirmed, true);
    assert.equal(await service.getCourseAuthorization(learner), null);
    const renewed = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [learner])).rows[0]; assert.equal(hasCurrentAgeEligibility(renewed), true); assert.equal(renewed.status, 'suspended'); assert.equal(renewed.student_id, approved.studentId);
    assert.equal((await access.changeEnrollmentStatus(owner, learner, 'reinstate', 'Fixture reviewed')).studentId, approved.studentId);
    assert.equal((await access.changeEnrollmentStatus(owner, learner, 'revoke', 'Fixture revoked')).status, 'revoked'); assert.equal(await service.getCourseAuthorization(learner), null);
    for (const sql of ["UPDATE certification_agreements SET content='blocked' WHERE version='fixture-v1'", "UPDATE certification_audit_events SET action='blocked'", 'DELETE FROM certification_audit_events', 'TRUNCATE certification_audit_events', 'DELETE FROM certification_enrollments', 'ALTER TABLE certification_enrollments DISABLE TRIGGER certification_student_id_immutable', `CREATE TABLE "${schema}".blocked_fixture (id INTEGER)`]) await assert.rejects(client.query(sql), error => error.code === '42501');
    assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 6);
    const row = (await admin.query('SELECT status, student_id FROM certification_enrollments WHERE discord_user_id=$1', [learner])).rows[0]; assert.equal(row.status, 'revoked'); assert.equal(row.student_id, approved.studentId);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(true); }
    try { if (worker) await worker.end(); } finally { try { if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); } finally { await admin.end(); } } }
  }
});
