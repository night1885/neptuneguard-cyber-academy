import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createAdministratorCourseCompletion } from './certification-admin-completion.js';
const url = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567', actor = '1223123544301633568', student = '1223123544301633569';
const content = 'Disposable Administrator completion fixture only.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'admin-completion-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };

async function isolated(operation) {
  const target = new URL(url);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
  assert.equal(target.pathname, '/certification_test'); assert.equal(target.search, ''); assert.equal(target.hash, '');
  const schema = `cert_admin_completion_${randomUUID().replaceAll('-', '')}`;
  const pool = new pg.Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let created = false;
  try {
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql', '007-course-enrollment-lifecycle.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    await createCertificationSubmission(pool, config).submitEnrollment(student, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: config.activeAgreementVersion, agreementSha256: hash, comprehensionCheckVersion: config.comprehensionCheck.version, answers: ['stop'] });
    await createCertificationService(pool, config).approveEnrollment(owner, student);
    await createCertificationCourseLifecycle(pool, config, { courseKeys: ['fixture'] }).assignCourses(owner, student, ['fixture']);
    const create = verifyAdministrator => createAdministratorCourseCompletion(pool, config, { courseKeys: ['fixture'], verifyAdministrator });
    await operation(pool, create);
  } finally {
    try { if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await pool.end(); }
  }
}
const completion = pool => pool.query('SELECT status,completed_by,completed_at FROM certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2', [student, 'fixture']);
const events = pool => pool.query("SELECT actor_discord_user_id FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='course_completed'", [student]);

test('Administrator completion on disposable PostgreSQL', { skip: !url }, async t => {
  await t.test('concurrent non-owner completions record one completion and one audit', () => isolated(async (pool, create) => {
    const service = create(async who => who === actor);
    const results = await Promise.all([service.completeCourse(actor, student, 'fixture'), service.completeCourse(actor, student, 'fixture')]);
    assert.deepEqual(results.map(result => result.alreadyCompleted).sort(), [false, true]);
    const row = (await completion(pool)).rows[0]; assert.equal(row.status, 'completed'); assert.equal(row.completed_by, actor);
    const audit = await events(pool); assert.equal(audit.rows.length, 1); assert.equal(audit.rows[0].actor_discord_user_id, actor);
    const retry = await service.completeCourse(actor, student, 'fixture'); assert.equal(retry.completedAt, row.completed_at.toISOString());
  }));
  await t.test('failed locked-state permission check leaves no completion or audit', () => isolated(async (pool, create) => {
    let checks = 0; const service = create(async () => ++checks === 1);
    await assert.rejects(service.completeCourse(actor, student, 'fixture'), /Administrator/); assert.equal(checks, 2);
    assert.equal((await completion(pool)).rows[0].status, 'active'); assert.equal((await events(pool)).rows.length, 0);
  }));
  await t.test('audit failure rolls completion back', () => isolated(async (pool, create) => {
    await pool.query("CREATE FUNCTION reject_admin_completion_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected admin completion audit failure'; END; $$; CREATE TRIGGER reject_admin_completion_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_admin_completion_audit();");
    await assert.rejects(create(async () => true).completeCourse(actor, student, 'fixture'), /Injected admin completion audit failure/);
    assert.equal((await completion(pool)).rows[0].status, 'active'); assert.equal((await events(pool)).rows.length, 0);
  }));
});
