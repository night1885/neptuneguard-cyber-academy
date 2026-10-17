import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateApplicationClosureReadiness, createReadyCertificationApplicationClosure } from './certification-application-closure-readiness.js';

const flags = ['direct_login', 'origin_mode', 'restricted_role', 'not_owner', 'no_schema_create', 'can_read', 'can_update', 'can_audit', 'can_sequence', 'no_enrollment_destructive', 'no_audit_mutation'];
function fixture({ missingColumn = false, invalidConstraint = false, disabledTrigger = false, deniedPermission = false, rollbackFailure = false } = {}) {
  const columns = ['discord_user_id', 'status', 'student_id', 'approved_by', 'approved_at', 'updated_at', 'application_closed_at', 'application_closed_by', 'application_closed_as'].map(attname => ({ attname, type: attname === 'application_closed_at' ? 'timestamp with time zone' : 'text', attnotnull: false, atthasdef: false, attgenerated: '', attidentity: '' }));
  const results = [
    { enrollments: 101, audit: 102, same_schema: true },
    missingColumn ? columns.filter(column => column.attname !== 'application_closed_at') : columns,
    [{ conname: 'certification_application_closure_complete', contype: 'c', convalidated: !invalidConstraint }],
    [{ tgname: 'certification_application_closure_immutable', tgenabled: disabledTrigger ? 'D' : 'O', tgtype: 19, columns: '', unconditional: true, proname: 'certification_preserve_application_closure', pronargs: 0, prosecdef: false, local_function: true }],
    Object.fromEntries(flags.map(name => [name, !(deniedPermission && name === 'can_audit')]))
  ];
  const calls = [], releases = []; let index = 0;
  const db = { async query(sql) {
    calls.push(sql);
    if (sql === 'ROLLBACK' && rollbackFailure) throw new Error('Injected rollback failure');
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
    const result = results[index++]; return { rows: Array.isArray(result) ? result : [result] };
  }, release(discard) { releases.push(discard); } };
  return { pool: { async connect() { return db; } }, calls, releases };
}

test('closure readiness uses read-only catalog checks and releases its connection', async () => {
  const f = fixture(); assert.deepEqual(await validateApplicationClosureReadiness(f.pool), { ready: true });
  assert.equal(f.calls[0], 'BEGIN READ ONLY'); assert.equal(f.calls.at(-1), 'COMMIT');
  assert.ok(f.calls.every(sql => /^(BEGIN READ ONLY|SELECT|COMMIT)/.test(sql)));
  assert.deepEqual(f.releases, [false]);
});
test('closure readiness rejects missing safeguards and insufficient privileges', async () => {
  for (const options of [{ missingColumn: true }, { invalidConstraint: true }, { disabledTrigger: true }, { deniedPermission: true }, { missingColumn: true, rollbackFailure: true }]) {
    const f = fixture(options); await assert.rejects(validateApplicationClosureReadiness(f.pool));
    assert.equal(f.calls.at(-1), 'ROLLBACK'); assert.deepEqual(f.releases, [options.rollbackFailure === true]);
  }
});
test('gated closure factory requires configuration and successful readiness', async () => {
  const blocked = { async connect() { throw new Error('Must not connect'); } };
  await assert.rejects(createReadyCertificationApplicationClosure(blocked, { enabled: false }), /configured owner/);
  const invalid = fixture({ disabledTrigger: true });
  await assert.rejects(createReadyCertificationApplicationClosure(invalid.pool, { enabled: true, ownerId: '1223123544301633567' }), /trigger/);
  const valid = fixture();
  const service = await createReadyCertificationApplicationClosure(valid.pool, { enabled: true, ownerId: '1223123544301633567' });
  assert.equal(typeof service.closeApplication, 'function');
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
async function isolated(operation, withClosure = true) {
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_close_ready_${suffix}`, role = `cert_close_ready_role_${suffix}`;
  const password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, schemaCreated = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', ...(withClosure ? ['006-application-closure-metadata.sql'] : [])]) {
      await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT,UPDATE ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const url = new URL(databaseUrl); url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    await operation(admin, worker, role, schema);
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

test('isolated PostgreSQL closure readiness', { skip: !databaseUrl || !roleDdl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('restricted worker passes; owner/superuser connection is rejected', async () => isolated(async (admin, worker) => {
    assert.deepEqual(await validateApplicationClosureReadiness(worker), { ready: true });
    await assert.rejects(validateApplicationClosureReadiness(admin), /privileges/);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM certification_enrollments')).rows[0].n, 0);
  }));
  await t.test('missing migration 006 is rejected before a closure service is returned', async () => isolated(async (admin, worker) => {
    await assert.rejects(createReadyCertificationApplicationClosure(worker, { enabled: true, ownerId: '1223123544301633567' }), /columns/);
    assert.equal((await admin.query('SELECT count(*)::int AS n FROM certification_audit_events')).rows[0].n, 0);
  }, false));
  await t.test('disabled trigger and unvalidated closure constraint are rejected', async () => isolated(async (admin, worker) => {
    await admin.query('ALTER TABLE certification_enrollments DISABLE TRIGGER certification_application_closure_immutable');
    await assert.rejects(validateApplicationClosureReadiness(worker), /trigger/);
    await admin.query('ALTER TABLE certification_enrollments ENABLE TRIGGER certification_application_closure_immutable');
    await admin.query('ALTER TABLE certification_enrollments DROP CONSTRAINT certification_application_closure_complete');
    await admin.query('ALTER TABLE certification_enrollments ADD CONSTRAINT certification_application_closure_complete CHECK (true) NOT VALID');
    await assert.rejects(validateApplicationClosureReadiness(worker), /constraint/);
  }));
  await t.test('automatic closure default is rejected', async () => isolated(async (admin, worker) => {
    await admin.query('ALTER TABLE certification_enrollments ALTER COLUMN application_closed_at SET DEFAULT NOW()');
    await assert.rejects(validateApplicationClosureReadiness(worker), /column definitions/);
  }));
  await t.test('missing audit or sequence privilege and excess deletion permission are rejected', async () => isolated(async (admin, worker, role, schema) => {
    await admin.query(`REVOKE INSERT ON certification_audit_events FROM "${role}"`);
    await assert.rejects(validateApplicationClosureReadiness(worker), /privileges/);
    await admin.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);
    await admin.query(`REVOKE USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" FROM "${role}"`);
    await assert.rejects(validateApplicationClosureReadiness(worker), /privileges/);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT DELETE ON certification_enrollments TO "${role}"`);
    await assert.rejects(validateApplicationClosureReadiness(worker), /privileges/);
    await admin.query(`REVOKE DELETE ON certification_enrollments FROM "${role}"`);
    assert.deepEqual(await validateApplicationClosureReadiness(worker), { ready: true });
  }));
});
