import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationCourseRequests } from './certification-course-requests.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';

const owner = '1223123544301633567', learner = '1565767429764943916';
const content = 'Disposable course request fixture only.';
const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'request-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'request-check', correctAnswers: ['stop'] } };
const courseKeys = ['fixture-one','fixture-two','fixture-three'];
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;

test('request backend rejects invalid inputs and non-owner review before database access', async () => {
  let calls = 0;
  const pool = { async connect() { calls++; throw new Error('Unexpected connection'); } };
  assert.throws(() => createCertificationCourseRequests(pool, config), /configuration/);
  const service = createCertificationCourseRequests(pool, config, { courseKeys });
  await assert.rejects(service.requestCourse('invalid', courseKeys[0]), /learner ID/);
  await assert.rejects(service.requestCourse(learner, 'unknown'), /course key/);
  await assert.rejects(service.reviewRequest(learner, learner, randomUUID(), 'approved'), /Owner authorization/);
  await assert.rejects(service.reviewRequest(owner, learner, 'invalid', 'approved'), /valid course review/);
  await assert.rejects(service.reviewRequest(owner, learner, randomUUID(), 'other'), /valid course review/);
  assert.equal(calls, 0);
});

async function isolated(work) {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const schema = `cert_requests_${randomUUID().replaceAll('-', '')}`;
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let created = false;
  try {
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await pool.query(`CREATE SCHEMA "${schema}"`); created = true;
    for (const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','011-course-requests.sql']) {
      await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await pool.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    await createCertificationSubmission(pool, config).submitEnrollment(learner, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: config.activeAgreementVersion, agreementSha256: hash, comprehensionCheckVersion: config.comprehensionCheck.version, answers: ['stop'] });
    await createCertificationService(pool, config).approveEnrollment(owner, learner);
    const requests = createCertificationCourseRequests(pool, config, { courseKeys });
    const lifecycle = createCertificationCourseLifecycle(pool, config, { courseKeys });
    await work(pool, requests, lifecycle);
  } finally {
    try { if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await pool.end(); }
  }
}

test('disposable PostgreSQL course requests and approvals', { skip: !databaseUrl }, async t => {
  await t.test('concurrent duplicate requests stay pending without access; approval is once-only', () => isolated(async (pool, requests, lifecycle) => {
    const results = await Promise.all([requests.requestCourse(learner, courseKeys[0]), requests.requestCourse(learner, courseKeys[0])]);
    assert.deepEqual(results.map(r => r.alreadyPending).sort(), [false,true]);
    assert.equal(results[0].request.request_id, results[1].request.request_id);
    assert.equal(await lifecycle.getCourseAuthorization(learner, courseKeys[0]), null);
    const requestId = results[0].request.request_id;
    const approvals = await Promise.all([requests.reviewRequest(owner, learner, requestId, 'approved'), requests.reviewRequest(owner, learner, requestId, 'approved')]);
    assert.deepEqual(approvals.map(r => r.alreadyReviewed).sort(), [false,true]);
    assert.ok(await lifecycle.getCourseAuthorization(learner, courseKeys[0]));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='courses_assigned'")).rows[0].n, 1);
    await assert.rejects(requests.reviewRequest(owner, learner, requestId, 'denied'), /another decision/);
  }));
  await t.test('another active course does not block requests; denial grants nothing and can be followed by a new request', () => isolated(async (pool, requests, lifecycle) => {
    await lifecycle.assignCourses(owner, learner, [courseKeys[0]]);
    const first = await requests.requestCourse(learner, courseKeys[1]);
    await requests.reviewRequest(owner, learner, first.request.request_id, 'denied');
    assert.equal(await lifecycle.getCourseAuthorization(learner, courseKeys[1]), null);
    const second = await requests.requestCourse(learner, courseKeys[1]);
    assert.notEqual(second.request.request_id, first.request.request_id);
    await requests.reviewRequest(owner, learner, second.request.request_id, 'approved');
    assert.ok(await lifecycle.getCourseAuthorization(learner, courseKeys[0]));
    assert.ok(await lifecycle.getCourseAuthorization(learner, courseKeys[1]));
  }));
  await t.test('completion restrictions remain and are rechecked at approval', () => isolated(async (pool, requests, lifecycle) => {
    await lifecycle.assignCourses(owner, learner, [courseKeys[0]]);
    const pending = await requests.requestCourse(learner, courseKeys[1]);
    await lifecycle.completeCourse(owner, learner, courseKeys[0]);
    assert.equal(await lifecycle.getCourseAuthorization(learner, courseKeys[0]), null);
    await assert.rejects(requests.requestCourse(learner, courseKeys[0]), /already assigned or completed/);
    await assert.rejects(requests.requestCourse(learner, courseKeys[2]), /separate review/);
    await assert.rejects(requests.reviewRequest(owner, learner, pending.request.request_id, 'approved'), /separate review/);
    assert.equal((await pool.query('SELECT status FROM certification_course_requests WHERE request_id=$1', [pending.request.request_id])).rows[0].status, 'pending');
  }));
  await t.test('suspension after request blocks approval', () => isolated(async (pool, requests, lifecycle) => {
    const pending = await requests.requestCourse(learner, courseKeys[0]);
    await pool.query("UPDATE certification_enrollments SET status='suspended' WHERE discord_user_id=$1", [learner]);
    await assert.rejects(requests.reviewRequest(owner, learner, pending.request.request_id, 'approved'), /Current approved/);
    assert.equal(await lifecycle.getCourseAuthorization(learner, courseKeys[0]), null);
    await requests.reviewRequest(owner, learner, pending.request.request_id, 'denied');
  }));
  await t.test('audit failure rolls back request decision and course access together', () => isolated(async (pool, requests, lifecycle) => {
    const pending = await requests.requestCourse(learner, courseKeys[0]);
    await pool.query(`CREATE FUNCTION reject_request_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='course_request_reviewed' THEN RAISE EXCEPTION 'Injected review audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_request_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_request_audit();`);
    await assert.rejects(requests.reviewRequest(owner, learner, pending.request.request_id, 'approved'), /Injected review audit failure/);
    assert.equal(await lifecycle.getCourseAuthorization(learner, courseKeys[0]), null);
    assert.equal((await pool.query('SELECT status FROM certification_course_requests WHERE request_id=$1', [pending.request.request_id])).rows[0].status, 'pending');
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='courses_assigned'")).rows[0].n, 0);
  }));
});
