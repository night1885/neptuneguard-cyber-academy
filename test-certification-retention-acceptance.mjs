import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createCertificationApplicationClosure } from './certification-application-closure.js';
import { createEnrollmentRetentionPreview } from './certification-retention-preview.js';
import { createAuditRetentionPreview } from './certification-audit-retention-preview.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567', student = '1223123544301633568', applicant = '1223123544301633569';
test('isolated service lifecycle to independent read-only retention previews', { skip: !databaseUrl || process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL !== 'true' }, async () => {
  const parsed = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)); assert.equal(parsed.pathname, '/certification_test'); assert.equal(parsed.search, ''); assert.equal(parsed.hash, '');
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_retention_accept_${suffix}`, role = `cert_retention_read_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let reader, schemaCreated = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    assert.equal((await admin.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql']) await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'Disposable service-to-retention acceptance fixture only.', hash = createHash('sha256').update(content).digest('hex');
    const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'retention-acceptance-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'retention-acceptance-check', correctAnswers: ['stop'] } };
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    const submissions = createCertificationSubmission(admin, config);
    for (const subject of [student, applicant]) await submissions.submitEnrollment(subject, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: config.activeAgreementVersion, agreementSha256: hash, comprehensionCheckVersion: config.comprehensionCheck.version, answers: ['stop'] });
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_enrollments,certification_course_enrollments,certification_lab_requests TO "${role}"`);
    await admin.query(`GRANT SELECT (event_id,created_at) ON certification_audit_events TO "${role}"`);
    parsed.username = role; parsed.password = password;
    reader = new pg.Pool({ connectionString: parsed.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await reader.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await reader.query('SHOW search_path')).rows[0].search_path, schema);
    const enrollments = createEnrollmentRetentionPreview(reader, { ownerId: owner, previewEnabled: true });
    const audits = createAuditRetentionPreview(reader, { ownerId: owner, previewEnabled: true });
    async function snapshot() {
      const result = {};
      for (const [table, order] of [['certification_enrollments','discord_user_id'],['certification_course_enrollments','discord_user_id,course_key'],['certification_lab_requests','request_id'],['certification_audit_events','event_id']]) result[table] = (await admin.query(`SELECT to_jsonb(t) AS record FROM ${table} t ORDER BY ${order}`)).rows;
      return result;
    }
    async function unchanged(operation) { const before = await snapshot(), result = await operation(); assert.deepEqual(await snapshot(), before); assert.equal(result.executionAuthorized, false); return result; }
    async function enrollment(subject, asOf = new Date()) { const report = await unchanged(() => enrollments.preview(owner, { asOf })); assert.equal(report.enrollmentScanComplete, true); return report.records.find(record => record.discordUserId === subject); }
    assert.equal((await enrollment(student)).disposition, 'not_due'); assert.equal((await enrollment(applicant)).disposition, 'not_due');
    const approval = await createCertificationService(admin, config).approveEnrollment(owner, student);
    assert.equal((await enrollment(student)).disposition, 'not_due');
    let clock = Date.now();
    const courses = createCertificationCourseLifecycle(admin, config, { courseKeys: ['fixture-one','fixture-two'], now: () => new Date(clock += 1000) });
    const closure = createCertificationApplicationClosure(admin, config, { now: () => new Date('2026-10-16T16:00:00.123Z') });
    await courses.assignCourses(owner, student, ['fixture-one','fixture-two']);
    assert.equal((await enrollment(student, new Date(clock))).disposition, 'not_due');
    await admin.query(`CREATE FUNCTION reject_retention_acceptance_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected retention acceptance audit failure'; END; $$;
      CREATE TRIGGER reject_retention_acceptance_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_retention_acceptance_audit();`);
    const beforeFailures = await snapshot();
    await assert.rejects(courses.completeCourse(owner, student, 'fixture-one'), /Injected retention acceptance audit failure/);
    await assert.rejects(closure.closeApplication(owner, applicant, 'withdrawn'), /Injected retention acceptance audit failure/);
    assert.deepEqual(await snapshot(), beforeFailures);
    assert.equal((await enrollment(student, new Date(clock))).disposition, 'not_due');
    assert.equal((await enrollment(applicant, new Date('2050-01-01T00:00:00Z'))).disposition, 'not_due');
    assert.ok(await courses.getCourseAuthorization(student, 'fixture-one'));
    await admin.query('DROP TRIGGER reject_retention_acceptance_audit ON certification_audit_events');
    const first = await courses.completeCourse(owner, student, 'fixture-one'); assert.equal(first.allAssignedCoursesCompleted, false);
    assert.equal((await enrollment(student, new Date(clock))).disposition, 'not_due');
    assert.equal(await courses.getCourseAuthorization(student, 'fixture-one'), null); assert.ok(await courses.getCourseAuthorization(student, 'fixture-two'));
    const last = await courses.completeCourse(owner, student, 'fixture-two'); assert.equal(last.allAssignedCoursesCompleted, true);
    const completion = new Date(last.completedAt);
    assert.equal((await enrollment(student, new Date(completion.getTime() - 1))).timingEligible, false);
    assert.equal((await enrollment(student, completion)).disposition, 'timing_candidate');
    assert.equal(await courses.getCourseAuthorization(student, 'fixture-two'), null);
    const retained = (await admin.query('SELECT status,student_id FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal(retained.status, 'approved'); assert.equal(retained.student_id, approval.studentId);
    const closed = await closure.closeApplication(owner, applicant, 'withdrawn'), deadline = new Date(closed.deletionEligibleAt);
    assert.equal((await enrollment(applicant, new Date(deadline.getTime() - 1))).timingEligible, false);
    assert.equal((await enrollment(applicant, deadline)).disposition, 'timing_candidate');
    const beforeRetries = await snapshot();
    assert.equal((await courses.completeCourse(owner, student, 'fixture-two')).alreadyCompleted, true);
    assert.equal((await closure.closeApplication(owner, applicant, 'withdrawn')).alreadyClosed, true);
    assert.deepEqual(await snapshot(), beforeRetries);
    const event = (await admin.query(`SELECT event_id::text AS event_id,
      to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred,
      to_char((created_at AT TIME ZONE 'UTC') + INTERVAL '3 months','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS deadline,
      to_char((created_at AT TIME ZONE 'UTC') + INTERVAL '3 months' - INTERVAL '1 microsecond','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS before_deadline
      FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='application_closed'`, [applicant])).rows[0];
    assert.ok(event);
    for (const [asOfUtc, eligible] of [[event.occurred,false],[event.before_deadline,false],[event.deadline,true]]) {
      const report = await unchanged(() => audits.preview(owner, { asOfUtc }));
      const record = report.records.find(record => record.eventId === event.event_id);
      assert.equal(record.timingEligible, eligible); assert.equal(record.timingEligibleAt, event.deadline);
      assert.equal(report.enrollmentRecordsEvaluated, false); assert.equal(report.preservationReviewed, false);
    }
    assert.equal((await enrollment(applicant, deadline)).category, 'closed_application');
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM certification_enrollments')).rows[0].n, 2);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM certification_course_enrollments')).rows[0].n, 2);
  } finally {
    try { if (reader) await reader.end(); }
    finally {
      try { if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally {
        try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
        finally { await admin.end(); }
      }
    }
  }
});
