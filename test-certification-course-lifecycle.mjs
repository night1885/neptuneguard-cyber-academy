import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';

const owner = '1223123544301633567', student = '1223123544301633568';
const content = 'Disposable per-course lifecycle fixture only.', hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'course-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'course-check', correctAnswers: ['stop'] } };
const courseKeys = ['fixture-one', 'fixture-two', 'fixture-three'];
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const migration = new URL('./migrations/007-course-enrollment-lifecycle.sql', import.meta.url);

test('course lifecycle validates owner and course allowlists before database access', async () => {
  let calls = 0; const pool = { async connect() { calls++; throw new Error('Unexpected database access'); }, async query() { calls++; throw new Error('Unexpected database access'); } };
  assert.throws(() => createCertificationCourseLifecycle(pool, config), /allowlist/);
  assert.throws(() => createCertificationCourseLifecycle(pool, config, { courseKeys: ['duplicate', 'duplicate'] }), /allowlist/);
  const service = createCertificationCourseLifecycle(pool, config, { courseKeys });
  await assert.rejects(service.assignCourses(student, student, ['fixture-one']), /owner authorization/);
  await assert.rejects(service.completeCourse(student, student, 'fixture-one'), /owner authorization/);
  await assert.rejects(service.assignCourses(owner, student, ['unknown']), /allowed course/);
  await assert.rejects(service.assignCourses(owner, student, ['fixture-one', 'fixture-one']), /unique/);
  await assert.rejects(service.completeCourse(owner, 'invalid', 'fixture-one'), /Invalid student/);
  assert.equal(await service.getCourseAuthorization(student, 'unknown'), null);
  assert.equal(calls, 0);
});

async function isolated(operation) {
  const schema = `cert_course_life_${randomUUID().replaceAll('-', '')}`;
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let created = false;
  try {
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql']) {
      await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await pool.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    await createCertificationSubmission(pool, config).submitEnrollment(student, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: config.activeAgreementVersion, agreementSha256: hash, comprehensionCheckVersion: config.comprehensionCheck.version, answers: ['stop'] });
    const approval = await createCertificationService(pool, config).approveEnrollment(owner, student);
    await pool.query(await readFile(migration, 'utf8'));
    let time = Date.now();
    const service = createCertificationCourseLifecycle(pool, config, { courseKeys, now: () => new Date(time += 1000) });
    await operation(pool, service, approval);
  } finally {
    try { if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); }
    finally { await pool.end(); }
  }
}
async function courses(pool) { return (await pool.query('SELECT * FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key', [student])).rows; }
async function auditCount(pool, action) { return (await pool.query('SELECT count(*)::int AS n FROM certification_audit_events WHERE action=$1', [action])).rows[0].n; }
async function failAudit(pool) { await pool.query(`CREATE OR REPLACE FUNCTION fail_course_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'Injected course audit failure'; END; $$;
  CREATE TRIGGER fail_course_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION fail_course_audit();`); }

test('isolated PostgreSQL per-course lifecycle', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('migration is reapplicable without assigning courses or changing the shared enrollment', async () => isolated(async (pool, service, approval) => {
    await pool.query(await readFile(migration, 'utf8')); assert.deepEqual(await courses(pool), []);
    const row = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal(row.status, 'approved'); assert.equal(row.student_id, approval.studentId);
    assert.equal(await service.getCourseAuthorization(student, 'fixture-one'), null);
    assert.equal(await auditCount(pool, 'courses_assigned'), 0);
  }));

  await t.test('one completion blocks only that course; all-complete is informational and never deletes the shared record', async () => isolated(async (pool, service, approval) => {
    await service.assignCourses(owner, student, ['fixture-one', 'fixture-two']);
    assert.ok(await service.getCourseAuthorization(student, 'fixture-one')); assert.ok(await service.getCourseAuthorization(student, 'fixture-two'));
    assert.equal((await service.assignCourses(owner, student, ['fixture-one'])).alreadyAssigned, true);
    const first = await service.completeCourse(owner, student, 'fixture-one');
    assert.equal(first.activeCourseCount, 1); assert.equal(first.allAssignedCoursesCompleted, false);
    assert.equal(await service.getCourseAuthorization(student, 'fixture-one'), null); assert.ok(await service.getCourseAuthorization(student, 'fixture-two'));
    await assert.rejects(service.assignCourses(owner, student, ['fixture-one']), /cannot be reassigned/);
    const last = await service.completeCourse(owner, student, 'fixture-two');
    assert.equal(last.activeCourseCount, 0); assert.equal(last.allAssignedCoursesCompleted, true);
    const retry = await service.completeCourse(owner, student, 'fixture-one');
    assert.equal(retry.alreadyCompleted, true); assert.equal(retry.completedAt, first.completedAt);
    await assert.rejects(service.assignCourses(owner, student, ['fixture-three']), /separate review/);
    assert.equal(await auditCount(pool, 'courses_assigned'), 1); assert.equal(await auditCount(pool, 'course_completed'), 2);
    const row = (await pool.query('SELECT status,student_id FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal(row.status, 'approved'); assert.equal(row.student_id, approval.studentId);
    await assert.rejects(pool.query('DELETE FROM certification_enrollments WHERE discord_user_id=$1', [student]), error => error.code === '23503');
  }));

  await t.test('concurrent assignment and completion serialize on the shared enrollment', async () => isolated(async (pool, service) => {
    const assignments = await Promise.all([service.assignCourses(owner, student, ['fixture-one', 'fixture-two']), service.assignCourses(owner, student, ['fixture-one', 'fixture-two'])]);
    assert.deepEqual(assignments.map(result => result.alreadyAssigned).sort(), [false, true]);
    assert.equal(await auditCount(pool, 'courses_assigned'), 1);
    const results = await Promise.all([service.completeCourse(owner, student, 'fixture-one'), service.completeCourse(owner, student, 'fixture-two')]);
    assert.deepEqual(results.map(result => result.allAssignedCoursesCompleted).sort(), [false, true]);
    assert.equal(await auditCount(pool, 'course_completed'), 2);
    const retry = await Promise.all([service.completeCourse(owner, student, 'fixture-one'), service.completeCourse(owner, student, 'fixture-one')]);
    assert.ok(retry.every(result => result.alreadyCompleted)); assert.equal(await auditCount(pool, 'course_completed'), 2);
  }));

  await t.test('audit failure rolls back all assignments and rolls back completion', async () => isolated(async (pool, service) => {
    await failAudit(pool);
    await assert.rejects(service.assignCourses(owner, student, ['fixture-one', 'fixture-two']), /Injected course audit failure/);
    assert.deepEqual(await courses(pool), []); assert.equal(await auditCount(pool, 'courses_assigned'), 0);
    await pool.query('DROP TRIGGER fail_course_audit ON certification_audit_events');
    await service.assignCourses(owner, student, ['fixture-one', 'fixture-two']); await failAudit(pool);
    await assert.rejects(service.completeCourse(owner, student, 'fixture-one'), /Injected course audit failure/);
    assert.ok((await courses(pool)).every(course => course.status === 'active')); assert.equal(await auditCount(pool, 'course_completed'), 0);
    await pool.query('DROP TRIGGER fail_course_audit ON certification_audit_events');
    assert.equal((await service.completeCourse(owner, student, 'fixture-one')).alreadyCompleted, false);
  }));

  await t.test('suspension blocks authorization and new assignments but does not require reinstatement to record completion', async () => isolated(async (pool, service) => {
    await service.assignCourses(owner, student, ['fixture-one', 'fixture-two']);
    await pool.query("UPDATE certification_enrollments SET status='suspended' WHERE discord_user_id=$1", [student]);
    assert.equal(await service.getCourseAuthorization(student, 'fixture-one'), null);
    await assert.rejects(service.assignCourses(owner, student, ['fixture-three']), /Current approved/);
    await service.completeCourse(owner, student, 'fixture-one');
    assert.equal((await service.completeCourse(owner, student, 'fixture-two')).allAssignedCoursesCompleted, true);
    assert.equal((await pool.query('SELECT status FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0].status, 'suspended');
  }));

  await t.test('unassigned completion, assignment-identity changes and completion resets are rejected', async () => isolated(async (pool, service) => {
    await assert.rejects(service.completeCourse(owner, student, 'fixture-one'), /Explicit course assignment/);
    await service.assignCourses(owner, student, ['fixture-one']); await service.completeCourse(owner, student, 'fixture-one');
    await assert.rejects(pool.query("UPDATE certification_course_enrollments SET course_key='fixture-two' WHERE discord_user_id=$1", [student]), /assignment identity/);
    await assert.rejects(pool.query("UPDATE certification_course_enrollments SET status='active',completed_at=NULL,completed_by=NULL WHERE discord_user_id=$1", [student]), /cannot be reset/);
  }));
});
