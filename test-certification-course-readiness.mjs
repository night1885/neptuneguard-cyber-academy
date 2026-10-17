import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateCourseLifecycleReadiness, createReadyCourseLifecycle, createReadyCourseNavigation } from './certification-course-readiness.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';

const owner = '1223123544301633567', student = '1223123544301633568', guildId = '1339276399390887957', verifiedRoleId = '1339276399390887959';
const [first, second] = COURSE_SECTION_KEYS;
const content = 'Disposable course readiness fixture.', hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'course-ready-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'course-ready-check', correctAnswers: ['stop'] } };
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';

test('gated course factories reject invalid configuration before database access', async () => {
  const pool = { async connect() { assert.fail('Must not connect'); }, async query() { assert.fail('Must not query'); } };
  await assert.rejects(createReadyCourseLifecycle(pool, { enabled: false }, { courseKeys: COURSE_SECTION_KEYS }), /configured owner/);
  await assert.rejects(createReadyCourseLifecycle(pool, config, { courseKeys: [] }), /allowlist/);
  await assert.rejects(createReadyCourseNavigation(pool, config, guildId), /Explicit course navigation/);
});

async function isolated(operation, migration = true) {
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_course_ready_${suffix}`, role = `cert_course_role_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, schemaCreated = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql', ...(migration ? ['007-course-enrollment-lifecycle.sql'] : [])]) {
      await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    await createCertificationSubmission(admin, config).submitEnrollment(student, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: config.activeAgreementVersion, agreementSha256: hash, comprehensionCheckVersion: config.comprehensionCheck.version, answers: ['stop'] });
    const approval = await createCertificationService(admin, config).approveEnrollment(owner, student);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT SELECT,UPDATE ON certification_enrollments TO "${role}"`);
    if (migration) await admin.query(`GRANT SELECT,INSERT,UPDATE ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const url = new URL(databaseUrl); url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 2, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    await operation({ admin, worker, role, schema, approval });
  } finally {
    try { if (worker) await worker.end(); }
    finally {
      try { if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally {
        try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
        finally { await admin.end(); }
      }
    }
  }
}
function interaction(customId, studentId, modal = false) {
  return { customId, guildId, user: { id: student }, guild: { id: guildId, members: { async fetch(id) { return { id, roles: { cache: new Set([verifiedRoleId]) } }; } } },
    deferred: false, replied: false, modal: null, messages: [], isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: () => studentId },
    async showModal(value) { this.modal = value.toJSON(); }, async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { this.replied = true; this.messages.push(payload); }, async editReply(payload) { this.messages.push(payload); } };
}
async function enter(navigation, courseKey, studentId) {
  const open = interaction(`cert:course:open:${courseKey}`, studentId); await navigation.handle(open); assert.ok(open.modal);
  const submit = interaction(open.modal.custom_id, studentId, true); await navigation.handle(submit); return submit;
}

test('isolated PostgreSQL course readiness and restricted navigation', { skip: !databaseUrl || !roleDdl }, async t => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('restricted runtime can assign, render, and end one course without blocking another', async () => isolated(async f => {
    assert.deepEqual(await validateCourseLifecycleReadiness(f.worker), { ready: true });
    await assert.rejects(validateCourseLifecycleReadiness(f.admin), /privileges/);
    const service = await createReadyCourseLifecycle(f.worker, config, { courseKeys: COURSE_SECTION_KEYS });
    await service.assignCourses(owner, student, [first, second]);
    const navigation = await createReadyCourseNavigation(f.worker, config, guildId, { verifiedRoleId });
    try {
      const entered = await enter(navigation, first, f.approval.studentId);
      const payload = entered.messages.at(-1); assert.ok(payload.embeds.length);
      const pageId = payload.components[0].components[0].custom_id;
      await service.completeCourse(owner, student, first);
      const stale = interaction(pageId, f.approval.studentId); await navigation.handle(stale);
      assert.match(stale.messages.at(-1).content, /no longer authorized/);
      const other = await enter(navigation, second, f.approval.studentId); assert.ok(other.messages.at(-1).embeds.length);
      assert.equal(await service.getCourseAuthorization(student, first), null); assert.ok(await service.getCourseAuthorization(student, second));
      await assert.rejects(f.worker.query('DELETE FROM certification_course_enrollments'), error => error.code === '42501');
      await assert.rejects(f.worker.query('DELETE FROM certification_audit_events'), error => error.code === '42501');
    } finally { navigation.dispose(); }
  }));
  await t.test('missing migration 007 refuses lifecycle and navigation factories', async () => isolated(async f => {
    await assert.rejects(createReadyCourseLifecycle(f.worker, config, { courseKeys: COURSE_SECTION_KEYS }), /migration 007/);
    await assert.rejects(createReadyCourseNavigation(f.worker, config, guildId, { verifiedRoleId }), /migration 007/);
  }, false));
  await t.test('disabled course trigger refuses readiness', async () => isolated(async f => {
    await f.admin.query('ALTER TABLE certification_course_enrollments DISABLE TRIGGER certification_course_lifecycle_immutable');
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /trigger/);
  }));
  await t.test('cascading parent foreign key refuses readiness', async () => isolated(async f => {
    await f.admin.query('ALTER TABLE certification_course_enrollments DROP CONSTRAINT certification_course_enrollments_discord_user_id_fkey');
    await f.admin.query('ALTER TABLE certification_course_enrollments ADD CONSTRAINT certification_course_enrollments_discord_user_id_fkey FOREIGN KEY (discord_user_id) REFERENCES certification_enrollments(discord_user_id) ON DELETE CASCADE');
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /Restrictive/);
  }));
  await t.test('an unvalidated course check refuses readiness', async () => isolated(async f => {
    await f.admin.query('ALTER TABLE certification_course_enrollments ADD CONSTRAINT course_fixture_unvalidated CHECK (true) NOT VALID');
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /Validated course/);
  }));
  await t.test('missing course/audit permissions and excess DELETE permission refuse readiness', async () => isolated(async f => {
    await f.admin.query(`REVOKE INSERT ON certification_course_enrollments FROM "${f.role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /privileges/);
    await f.admin.query(`GRANT INSERT ON certification_course_enrollments TO "${f.role}"`);
    await f.admin.query(`GRANT DELETE ON certification_course_enrollments TO "${f.role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /privileges/);
    await f.admin.query(`REVOKE DELETE ON certification_course_enrollments FROM "${f.role}"`);
    await f.admin.query(`REVOKE INSERT ON certification_audit_events FROM "${f.role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(f.worker), /privileges/);
    await f.admin.query(`GRANT INSERT ON certification_audit_events TO "${f.role}"`);
    assert.deepEqual(await validateCourseLifecycleReadiness(f.worker), { ready: true });
  }));
});
