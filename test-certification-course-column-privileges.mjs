import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateCourseLifecycleReadiness, createReadyCourseLifecycle } from './certification-course-readiness.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
const insertColumns = ['discord_user_id','course_key','status','assigned_at','assigned_by'];
const updateColumns = ['status','completed_at','completed_by'];
const auditColumns = ['actor_discord_user_id','subject_discord_user_id','action','details','created_at'];

test('course readiness accepts exact column grants and rejects incomplete or excessive privileges', { skip: !databaseUrl || !roleDdl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test');
  assert.equal(url.search, ''); assert.equal(url.hash, '');
  const suffix = randomUUID().replaceAll('-', '');
  const schema = `cert_col_${suffix}`, role = `cert_col_role_${suffix}`;
  const password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=3000` });
  let worker, schemaCreated = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const name of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql']) {
      await admin.query(await readFile(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
    }
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_enrollments,certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT UPDATE (status) ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT INSERT (${insertColumns.join(',')}) ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT UPDATE (${updateColumns.join(',')}) ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT INSERT (${auditColumns.join(',')}) ON certification_audit_events TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 2, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=3000` });
    assert.deepEqual(await validateCourseLifecycleReadiness(worker), { ready: true });
    assert.deepEqual((await worker.query("SELECT has_table_privilege(current_user,'certification_course_enrollments','INSERT') AS i,has_table_privilege(current_user,'certification_course_enrollments','UPDATE') AS u,has_table_privilege(current_user,'certification_audit_events','INSERT') AS a")).rows[0], { i: false, u: false, a: false });
    for (const [table, privilege, columns] of [
      ['certification_course_enrollments','INSERT',insertColumns],
      ['certification_course_enrollments','UPDATE',updateColumns],
      ['certification_audit_events','INSERT',auditColumns]
    ]) {
      for (const column of columns) {
        await admin.query(`REVOKE ${privilege} (${column}) ON ${table} FROM "${role}"`);
        await assert.rejects(validateCourseLifecycleReadiness(worker), /privileges/);
        await admin.query(`GRANT ${privilege} (${column}) ON ${table} TO "${role}"`);
      }
    }
    await admin.query(`REVOKE UPDATE (${updateColumns.join(',')}) ON certification_course_enrollments FROM "${role}"`);
    await admin.query(`GRANT UPDATE (course_key) ON certification_course_enrollments TO "${role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(worker), /privileges/);
    await admin.query(`GRANT UPDATE (${updateColumns.join(',')}) ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT DELETE ON certification_course_enrollments TO "${role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(worker), /privileges/);
    await admin.query(`REVOKE DELETE ON certification_course_enrollments FROM "${role}"`);
    await admin.query(`GRANT UPDATE (details) ON certification_audit_events TO "${role}"`);
    await assert.rejects(validateCourseLifecycleReadiness(worker), /privileges/);
    await admin.query(`REVOKE UPDATE (details) ON certification_audit_events FROM "${role}"`);
    assert.deepEqual(await validateCourseLifecycleReadiness(worker), { ready: true });
    await assert.rejects(validateCourseLifecycleReadiness(admin), /privileges/);
    const owner = '1223123544301633567', other = '1223123544301633568';
    const service = await createReadyCourseLifecycle(worker, { enabled: true, ownerId: owner }, { courseKeys: ['fixture'] });
    await assert.rejects(service.completeCourse(other, other, 'fixture'), /owner authorization/);
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
});
