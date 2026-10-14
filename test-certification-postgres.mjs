import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationAccessManagement } from './certification-access-management.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567';
const student = '1223123544301633568';
const content = 'Disposable integration fixture, not a published agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'fixture-v2', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
const migrationFiles = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];
async function migrate(pool) {
  for (const file of migrationFiles) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
}
async function isolated(operation) {
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`;
  let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test', 'Refusing to modify a non-test database');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    await migrate(pool);
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v2', content, hash]);
    await operation(pool, schema);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
}
async function failAudit(pool) {
  await pool.query(`CREATE FUNCTION certification_test_fail_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Audit failure injected'; END; $$;
    CREATE TRIGGER certification_test_reject_audit BEFORE INSERT ON certification_audit_events
    FOR EACH ROW EXECUTE FUNCTION certification_test_fail_audit();`);
}
async function enrollment(pool) { return (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0]; }
async function countAudit(pool, action) { return (await pool.query('SELECT count(*)::int AS count FROM certification_audit_events WHERE action=$1', [action])).rows[0].count; }

test('disposable PostgreSQL certification integration', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test servers are permitted');
  assert.equal(url.pathname, '/certification_test', 'Dedicated certification_test database required');
  assert.equal(url.search, '', 'URL query overrides are not permitted'); assert.equal(url.hash, '');

  await t.test('all migrations can be reapplied and permanent IDs cannot be replaced', async () => isolated(async (pool, schema) => {
    await migrate(pool);
    const columns = (await pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', [schema, 'certification_enrollments'])).rows.map(row => row.column_name);
    for (const name of ['acknowledgment_name', 'agreement_content_sha256', 'comprehension_check_version', 'age_eligible', 'age_declared_at', 'age_declaration_version']) assert.ok(columns.includes(name));
    await createCertificationSubmission(pool, config).submitEnrollment(student, input);
    const row = await enrollment(pool);
    assert.equal(row.acknowledgment_name, null); assert.equal(row.signature_reference, null);
    assert.equal(row.signature_method, 'discord_account'); assert.equal(row.age_eligible, true);
    assert.equal(row.age_declaration_version, 'adult-18-v1'); assert.ok(row.age_declared_at);
    const approved = await createCertificationService(pool, config).approveEnrollment(owner, student);
    await assert.rejects(pool.query('UPDATE certification_enrollments SET student_id=$2 WHERE discord_user_id=$1', [student, 'replacement']), /cannot be replaced or removed/);
    assert.equal((await enrollment(pool)).student_id, approved.studentId);
  }));
  await t.test('concurrent submissions and approvals each create one audit event', async () => isolated(async pool => {
    const submit = createCertificationSubmission(pool, config);
    const requests = await Promise.all([submit.submitEnrollment(student, input), submit.submitEnrollment(student, input)]);
    assert.deepEqual(requests.map(row => row.alreadySubmitted).sort(), [false, true]); assert.equal(await countAudit(pool, 'enrollment_submitted'), 1);
    const service = createCertificationService(pool, config);
    const approvals = await Promise.all([service.approveEnrollment(owner, student), service.approveEnrollment(owner, student)]);
    assert.equal(approvals[0].studentId, approvals[1].studentId);
    assert.deepEqual(approvals.map(row => row.alreadyApproved).sort(), [false, true]);
    assert.equal(await countAudit(pool, 'enrollment_approved'), 1); assert.equal((await enrollment(pool)).status, 'approved');
  }));
  await t.test('negative eligibility creates neither enrollment nor audit', async () => isolated(async pool => {
    await assert.rejects(createCertificationSubmission(pool, config).submitEnrollment(student, { ...input, ageEligibility: 'no' }), /requires age 18/);
    assert.equal(await enrollment(pool), undefined); assert.equal(await countAudit(pool, 'enrollment_submitted'), 0);
  }));
  await t.test('submission audit failure rolls back newly created enrollment', async () => isolated(async pool => {
    await failAudit(pool);
    await assert.rejects(createCertificationSubmission(pool, config).submitEnrollment(student, input), /Audit failure injected/);
    assert.equal(await enrollment(pool), undefined); assert.equal(await countAudit(pool, 'enrollment_submitted'), 0);
  }));
  await t.test('approval audit failure preserves pending status and permits safe retry', async () => isolated(async pool => {
    await createCertificationSubmission(pool, config).submitEnrollment(student, input); await failAudit(pool);
    const service = createCertificationService(pool, config);
    await assert.rejects(service.approveEnrollment(owner, student), /Audit failure injected/);
    const pending = await enrollment(pool); assert.equal(pending.status, 'pending');
    assert.equal(pending.student_id, null); assert.equal(pending.approved_by, null); assert.equal(pending.approved_at, null);
    assert.equal(await countAudit(pool, 'enrollment_approved'), 0);
    await pool.query('DROP TRIGGER certification_test_reject_audit ON certification_audit_events');
    const approved = await service.approveEnrollment(owner, student);
    assert.equal((await enrollment(pool)).student_id, approved.studentId); assert.equal(await countAudit(pool, 'enrollment_approved'), 1);
  }));
  await t.test('suspension audit failure rolls back course and lab changes together', async () => isolated(async pool => {
    await createCertificationSubmission(pool, config).submitEnrollment(student, input);
    const approved = await createCertificationService(pool, config).approveEnrollment(owner, student);
    const requestId = randomUUID();
    await pool.query(`INSERT INTO certification_lab_requests
      (request_id, discord_user_id, lab_key, status, rules_version, rules_acknowledged_at, starts_at, expires_at, approved_by, approved_at)
      VALUES ($1,$2,'fixture-lab','approved','fixture-rules',NOW(),NOW(),NOW()+INTERVAL '1 hour',$3,NOW())`, [requestId, student, owner]);
    await failAudit(pool);
    await assert.rejects(createCertificationAccessManagement(pool, config).changeEnrollmentStatus(owner, student, 'suspend', 'Fixture review'), /Audit failure injected/);
    const row = await enrollment(pool); assert.equal(row.status, 'approved'); assert.equal(row.student_id, approved.studentId);
    assert.equal((await pool.query('SELECT status FROM certification_lab_requests WHERE request_id=$1', [requestId])).rows[0].status, 'approved');
    assert.equal(await countAudit(pool, 'enrollment_suspend'), 0);
  }));
});
