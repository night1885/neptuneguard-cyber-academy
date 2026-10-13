import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationAccessManagement } from './certification-access-management.js';
import { createCertificationAgeRenewal } from './certification-age-renewal.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567';
const learners = ['1223123544301633568', '1223123544301633569', '1223123544301633570'];
test('real renewal preserves restricted records, is concurrent/idempotent, and rolls back with audit failure', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'PostgreSQL renewal fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
    const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: owner, activeAgreementVersion: 'fixture-renewal', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
    const input = { reportedAge: 16, typedName: 'Fixture Learner', confirmedRead: true, agreementVersion: 'fixture-renewal', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-renewal', content, hash]);
    const legacySubmission = createCertificationSubmission(pool, config); const legacyApproval = createCertificationService(pool, config);
    const access = createCertificationAccessManagement(pool, config); const renewal = createCertificationAgeRenewal(pool, config);
    const read = async id => (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    const auditCount = async id => (await pool.query("SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='age_eligibility_renewed'", [id])).rows[0].count;
    for (let index = 0; index < learners.length; index++) {
      const id = learners[index]; await legacySubmission.submitEnrollment(id, input); await legacyApproval.approveEnrollment(owner, id);
      await access.changeEnrollmentStatus(owner, id, index === 0 ? 'suspend' : 'revoke', 'Synthetic legacy restriction');
      assert.equal(hasCurrentAgeEligibility(await read(id)), false);
    }
    for (const id of learners.slice(0, 2)) {
      const before = await read(id); const requestId = randomUUID();
      await pool.query("INSERT INTO certification_lab_requests (request_id, discord_user_id, lab_key, rules_version, rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [requestId, id]);
      const labBefore = (await pool.query('SELECT * FROM certification_lab_requests WHERE request_id=$1', [requestId])).rows[0];
      await assert.rejects(access.changeEnrollmentStatus(owner, id, 'reinstate', 'Fixture review'), /age eligibility/);
      const results = await Promise.all([renewal.renewEligibility(id, input), renewal.renewEligibility(id, input)]);
      assert.deepEqual(results.map(r => r.alreadyConfirmed).sort(), [false, true]);
      const after = await read(id); assert.equal(hasCurrentAgeEligibility(after), true);
      for (const key of ['status', 'student_id', 'approved_by', 'approved_at', 'status_reason', 'acknowledgment_name', 'acknowledged_at', 'agreement_version', 'agreement_content_sha256', 'comprehension_check_version', 'learner_confirmed_read_at', 'comprehension_passed_at']) assert.deepEqual(after[key], before[key]);
      assert.equal(await auditCount(id), 1);
      assert.equal((await renewal.renewEligibility(id, input)).alreadyConfirmed, true);
      assert.deepEqual((await read(id)).age_eligibility_confirmed_at, after.age_eligibility_confirmed_at); assert.equal(await auditCount(id), 1);
      assert.deepEqual((await pool.query('SELECT * FROM certification_lab_requests WHERE request_id=$1', [requestId])).rows[0], labBefore);
    }
    const failing = learners[2]; const beforeFailure = await read(failing);
    await pool.query(`CREATE FUNCTION reject_renewal_fixture_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='age_eligibility_renewed' THEN RAISE EXCEPTION 'Fixture renewal audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_renewal_fixture_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_renewal_fixture_audit();`);
    await assert.rejects(renewal.renewEligibility(failing, input), /Fixture renewal audit failure/);
    assert.deepEqual(await read(failing), beforeFailure); assert.equal(await auditCount(failing), 0);
  } finally {
    try { if (pool) await pool.end(); } finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } }
  }
});
