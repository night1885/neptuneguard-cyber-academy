import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { classifyEnrollmentRetention, createEnrollmentRetentionPreview } from './certification-retention-preview.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';

const owner = '1223123544301633567';
const ids = Array.from({ length: 6 }, (_, i) => String(1223123544301633601n + BigInt(i)));
const asOf = new Date('2026-10-22T04:00:00.000Z');
function closed() { return { discord_user_id: ids[0], status: 'denied', student_id: null, approved_by: null, approved_at: null,
  application_closed_at: new Date('2026-10-16T16:00:00Z'), application_closed_by: owner, application_closed_as: 'withdrawn', closure_millisecond_exact: true,
  course_count: 0, active_course_count: 0, completed_course_count: 0, confirmed_completed_count: 0, latest_completed_at: null, lab_record_count: 0 }; }

test('retention classification honors the exact application boundary and explicit closure evidence', () => {
  const record = closed();
  assert.equal(classifyEnrollmentRetention(record, new Date(asOf.getTime() - 1)).timingEligible, false);
  assert.equal(classifyEnrollmentRetention(record, asOf).disposition, 'timing_candidate');
  assert.equal(classifyEnrollmentRetention({ ...record, application_closed_at: null, application_closed_by: null, application_closed_as: null }, asOf).timingEligible, false);
  assert.equal(classifyEnrollmentRetention({ ...record, closure_millisecond_exact: false }, asOf).disposition, 'review_required');
  assert.equal(classifyEnrollmentRetention({ ...record, lab_record_count: 1 }, asOf).disposition, 'blocked');
  assert.equal(classifyEnrollmentRetention(record, asOf, { unreviewedForeignKeys: true }).disposition, 'blocked');
});
test('preview rejects disabled, unauthorized, and unbounded requests before connecting', async () => {
  let connections = 0; const pool = { async connect() { connections++; throw new Error('Unexpected connection'); } };
  const preview = createEnrollmentRetentionPreview(pool, { ownerId: owner, previewEnabled: true });
  await assert.rejects(preview.preview(ids[0], { asOf }), /owner authorization/);
  await assert.rejects(createEnrollmentRetentionPreview(pool, { ownerId: owner }).preview(owner, { asOf }), /Enabled retention preview/);
  for (const request of [{ asOf: '2026-10-22' }, { asOf, limit: 251 }, { asOf, afterDiscordId: '' }]) await assert.rejects(preview.preview(owner, request), /bounded limit/);
  assert.equal(connections, 0);
});
test('preview rollback failure discards its connection and preserves the original error', async () => {
  const releases = [];
  const pool = { async connect() { return { async query(sql) { if (sql.startsWith('BEGIN')) return { rows: [] }; throw new Error(sql === 'ROLLBACK' ? 'Rollback failure' : 'Preview read failure'); }, release(discard) { releases.push(discard); } }; } };
  await assert.rejects(createEnrollmentRetentionPreview(pool, { ownerId: owner, previewEnabled: true }).preview(owner, { asOf }), /Preview read failure/);
  assert.deepEqual(releases, [true]);
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
async function isolated(operation) {
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_preview_${suffix}`, role = `cert_preview_role_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, created = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql', '007-course-enrollment-lifecycle.sql']) await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await admin.query("INSERT INTO certification_enrollments (discord_user_id,status) VALUES ($1,'denied'),($2,'denied')", [ids[0], ids[1]]);
    await admin.query("UPDATE certification_enrollments SET application_closed_at='2026-10-16T16:00:00Z',application_closed_by=$2,application_closed_as='withdrawn' WHERE discord_user_id=$1", [ids[0], owner]);
    const content = 'Disposable retention-preview fixture only.', hash = createHash('sha256').update(content).digest('hex');
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', ['preview-fixture', content, hash]);
    const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'preview-fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'preview-check', correctAnswers: ['stop'] } };
    for (const subject of ids.slice(2)) {
      await createCertificationSubmission(admin, config).submitEnrollment(subject, { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: 'preview-fixture', agreementSha256: hash, comprehensionCheckVersion: 'preview-check', answers: ['stop'] });
      await createCertificationService(admin, config).approveEnrollment(owner, subject);
    }
    for (const subject of [ids[2], ids[3], ids[4]]) await admin.query("INSERT INTO certification_course_enrollments (discord_user_id,course_key,status,assigned_at,assigned_by,completed_at,completed_by) VALUES ($1,'fixture-one','completed','2026-10-19T10:00:00Z',$2,'2026-10-20T10:00:00Z',$2)", [subject, owner]);
    await admin.query("INSERT INTO certification_course_enrollments (discord_user_id,course_key,status,assigned_at,assigned_by) VALUES ($1,'fixture-two','active','2026-10-19T10:00:00Z',$2)", [ids[3], owner]);
    await admin.query("INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [randomUUID(), ids[4]]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_enrollments,certification_course_enrollments,certification_lab_requests TO "${role}"`);
    const url = new URL(databaseUrl); url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    const preview = createEnrollmentRetentionPreview(worker, { ownerId: owner, previewEnabled: true });
    await operation({ admin, worker, preview, schema });
  } finally {
    try { if (worker) await worker.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally {
        try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
        finally { await admin.end(); }
      }
    }
  }
}
async function snapshot(admin) {
  const result = {};
  for (const table of ['certification_enrollments', 'certification_course_enrollments', 'certification_lab_requests', 'certification_audit_events']) result[table] = (await admin.query(`SELECT * FROM ${table}`)).rows;
  return JSON.stringify(result);
}

test('isolated PostgreSQL read-only retention preview', { skip: !databaseUrl || !roleDdl }, async t => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  await t.test('SELECT-only login previews categories without touching records or audit history', async () => isolated(async f => {
    const before = await snapshot(f.admin), report = await f.preview.preview(owner, { asOf });
    const byId = new Map(report.records.map(record => [record.discordUserId, record]));
    assert.equal(byId.get(ids[0]).disposition, 'timing_candidate'); assert.equal(byId.get(ids[0]).category, 'closed_application');
    assert.equal(byId.get(ids[1]).disposition, 'not_due');
    assert.equal(byId.get(ids[2]).disposition, 'timing_candidate'); assert.equal(byId.get(ids[2]).category, 'completed_shared_enrollment');
    assert.equal(byId.get(ids[3]).disposition, 'not_due'); assert.equal(byId.get(ids[4]).disposition, 'blocked'); assert.equal(byId.get(ids[5]).disposition, 'not_due');
    assert.equal(report.executionAuthorized, false); assert.equal(report.auditEventsEvaluated, false); assert.equal(report.preservationReviewed, false);
    assert.equal(report.enrollmentScanComplete, true); assert.deepEqual(report.unreviewedForeignKeys, []);
    assert.equal(await snapshot(f.admin), before);
    await assert.rejects(f.worker.query('DELETE FROM certification_enrollments'), error => error.code === '42501');
    await assert.rejects(f.worker.query('SELECT * FROM certification_audit_events'), error => error.code === '42501');
  }));
  await t.test('keyset pages do not claim an incomplete scan is complete', async () => isolated(async f => {
    const first = await f.preview.preview(owner, { asOf, limit: 2 });
    assert.equal(first.hasMore, true); assert.equal(first.enrollmentScanComplete, false); assert.equal(first.nextAfterDiscordId, ids[1]);
    const second = await f.preview.preview(owner, { asOf, limit: 2, afterDiscordId: first.nextAfterDiscordId });
    const third = await f.preview.preview(owner, { asOf, limit: 2, afterDiscordId: second.nextAfterDiscordId });
    assert.deepEqual([...first.records, ...second.records, ...third.records].map(record => record.discordUserId), ids); assert.equal(third.hasMore, false);
    assert.equal((await f.preview.preview(owner, { asOf: new Date(asOf.getTime() - 1) })).records[0].timingEligible, false);
  }));
  await t.test('unfamiliar foreign keys block timing candidates even without cascading or reading the child table', async () => isolated(async f => {
    await f.admin.query('CREATE TABLE preview_unreviewed_child (subject TEXT REFERENCES certification_enrollments(discord_user_id) ON DELETE CASCADE)');
    const report = await f.preview.preview(owner, { asOf });
    assert.ok(report.unreviewedForeignKeys.some(key => key.table_name === 'preview_unreviewed_child'));
    assert.ok(report.records.filter(record => record.timingEligible).every(record => record.disposition === 'blocked'));
    assert.equal(report.executionAuthorized, false);
  }));
});
