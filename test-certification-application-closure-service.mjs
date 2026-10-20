import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationApplicationClosure } from './certification-application-closure.js';

const owner = '1223123544301633567', student = '1223123544301633568';
const config = { enabled: true, ownerId: owner };
const time = '2026-10-16T16:00:00.123Z';
const base = () => ({ discord_user_id: student, status: 'pending', student_id: null, approved_by: null, approved_at: null,
  application_closed_at: null, application_closed_by: null, application_closed_as: null });
function fixture({ row = base(), failAudit = false, failCommit = false, failRollback = false } = {}) {
  const calls = [], released = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT')) return { rows: row ? [row] : [] };
      if (sql.startsWith('UPDATE')) return { rowCount: 1, rows: [{ ...row, status: 'denied', application_closed_at: new Date(params[1]), application_closed_by: params[2], application_closed_as: params[3] }] };
      if (sql.startsWith('INSERT') && failAudit) throw new Error('Injected audit failure');
      if (sql === 'COMMIT' && failCommit) throw new Error('Injected commit failure');
      if (sql === 'ROLLBACK' && failRollback) throw new Error('Injected rollback failure');
      return { rows: [] };
    },
    release(discard) { released.push(discard); }
  };
  return { pool: { async connect() { return db; } }, calls, released };
}

test('closure rejects unauthorized, disabled, and invalid requests before connecting', async () => {
  let connections = 0;
  const pool = { async connect() { connections++; throw new Error('Unexpected connection'); } };
  await assert.rejects(createCertificationApplicationClosure(pool, config).closeApplication(student, student, 'withdrawn'), /owner authorization/);
  await assert.rejects(createCertificationApplicationClosure(pool, { ...config, enabled: false }).closeApplication(owner, student, 'denied'), /owner authorization/);
  await assert.rejects(createCertificationApplicationClosure(pool).closeApplication(undefined, student, 'denied'), /owner authorization/);
  await assert.rejects(createCertificationApplicationClosure(pool, config).closeApplication(owner, 'invalid', 'denied'), /Invalid student/);
  await assert.rejects(createCertificationApplicationClosure(pool, config).closeApplication(owner, student, 'inactive'), /Invalid application closure/);
  assert.equal(connections, 0);
});

test('new closure locks, updates, audits, commits, and returns the approved deadline', async () => {
  const f = fixture();
  const result = await createCertificationApplicationClosure(f.pool, config, { now: () => new Date(time) }).closeApplication(owner, student, 'withdrawn');
  assert.deepEqual(result, { status: 'denied', closureCategory: 'withdrawn', closedAt: time, closedBy: owner, deletionEligibleAt: '2026-10-22T04:00:00.000Z', alreadyClosed: false });
  assert.deepEqual(f.calls.map(call => call.sql.split(/\s/)[0]), ['BEGIN', 'SELECT', 'UPDATE', 'INSERT', 'COMMIT']);
  assert.match(f.calls[1].sql, /FOR UPDATE/);
  assert.deepEqual(JSON.parse(f.calls[3].params[2]), { from: 'pending', to: 'denied', closureCategory: 'withdrawn', closedAt: time });
  assert.deepEqual(f.released, [false]);
});

test('same-category retry preserves the closure and does not read the clock or write another audit', async () => {
  const f = fixture({ row: { ...base(), status: 'denied', application_closed_at: new Date(time), application_closed_by: owner, application_closed_as: 'withdrawn' } });
  const service = createCertificationApplicationClosure(f.pool, config, { now() { throw new Error('Retry must not read clock'); } });
  assert.equal((await service.closeApplication(owner, student, 'withdrawn')).alreadyClosed, true);
  assert.deepEqual(f.calls.map(call => call.sql.split(/\s/)[0]), ['BEGIN', 'SELECT', 'COMMIT']);
  await assert.rejects(service.closeApplication(owner, student, 'abandoned'), /different category/);
});

test('missing schema, malformed metadata, missing requests, and prior approvals fail without writes', async () => {
  const missingSchema = base(); delete missingSchema.application_closed_at;
  for (const row of [null, missingSchema, { ...base(), student_id: 'NG-fixture' }, { ...base(), approved_at: new Date(time) },
    { ...base(), status: 'suspended' }, { ...base(), application_closed_by: owner }]) {
    const f = fixture({ row });
    await assert.rejects(createCertificationApplicationClosure(f.pool, config).closeApplication(owner, student, 'denied'));
    assert.ok(!f.calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)));
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.deepEqual(f.released, [false]);
  }
});

test('audit and commit failures roll back; rollback failure discards the connection', async () => {
  for (const options of [{ failAudit: true }, { failCommit: true }, { failAudit: true, failRollback: true }]) {
    const f = fixture(options);
    await assert.rejects(createCertificationApplicationClosure(f.pool, config, { now: () => time }).closeApplication(owner, student, 'denied'), /Injected (audit|commit) failure/);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
    assert.deepEqual(f.released, [options.failRollback === true]);
  }
  const f = fixture();
  await assert.rejects(createCertificationApplicationClosure(f.pool, config, { now: () => 'not-a-time' }).closeApplication(owner, student, 'denied'), /timestamp/);
  assert.ok(!f.calls.some(call => /^(UPDATE|INSERT)/.test(call.sql)));
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
async function isolated(operation) {
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_close_service_${randomUUID().replaceAll('-', '')}`;
  let pool; let created = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql']) {
      await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await pool.query("INSERT INTO certification_enrollments (discord_user_id,status) VALUES ($1,'pending')", [student]);
    await operation(pool);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
}
async function auditCount(pool) { return (await pool.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='application_closed'")).rows[0].n; }

test('isolated PostgreSQL closure service transactions', { skip: !databaseUrl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test servers permitted');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('concurrent identical requests produce one closure and one audit', async () => isolated(async pool => {
    let clockReads = 0;
    const service = createCertificationApplicationClosure(pool, config, { now() { clockReads++; return new Date(time); } });
    const results = await Promise.all([service.closeApplication(owner, student, 'withdrawn'), service.closeApplication(owner, student, 'withdrawn')]);
    assert.deepEqual(results.map(result => result.alreadyClosed).sort(), [false, true]);
    assert.equal(clockReads, 1); assert.equal(await auditCount(pool), 1);
    assert.ok(results.every(result => result.closedAt === time && result.deletionEligibleAt === '2026-10-22T04:00:00.000Z'));
    const row = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal(row.status, 'denied'); assert.equal(row.student_id, null); assert.equal(row.application_closed_as, 'withdrawn');
  }));

  await t.test('concurrent conflicting categories preserve the winning closure', async () => isolated(async pool => {
    const service = createCertificationApplicationClosure(pool, config, { now: () => time });
    const results = await Promise.allSettled([service.closeApplication(owner, student, 'denied'), service.closeApplication(owner, student, 'abandoned')]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const rejected = results.find(result => result.status === 'rejected'); assert.match(rejected.reason.message, /different category/);
    assert.equal(await auditCount(pool), 1);
  }));

  await t.test('audit failure rolls back closure and status; retry then succeeds', async () => isolated(async pool => {
    await pool.query(`CREATE FUNCTION reject_closure_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected audit failure'; END; $$;
      CREATE TRIGGER reject_closure_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_closure_audit();`);
    const service = createCertificationApplicationClosure(pool, config, { now: () => time });
    await assert.rejects(service.closeApplication(owner, student, 'abandoned'), /Injected audit failure/);
    const row = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.equal(row.status, 'pending'); assert.equal(row.application_closed_at, null); assert.equal(row.application_closed_by, null); assert.equal(row.application_closed_as, null);
    assert.equal(await auditCount(pool), 0);
    await pool.query('DROP TRIGGER reject_closure_audit ON certification_audit_events');
    assert.equal((await service.closeApplication(owner, student, 'abandoned')).alreadyClosed, false);
    assert.equal(await auditCount(pool), 1);
  }));

  await t.test('awaiting, pending, and denied applications close without issuing IDs or deleting lab records', async () => isolated(async pool => {
    const service = createCertificationApplicationClosure(pool, config, { now: () => time });
    const requestId = randomUUID();
    await pool.query("INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [requestId, student]);
    let id = 1223123544301633700n;
    for (const status of ['awaiting_acknowledgment', 'pending', 'denied']) {
      const subject = String(id++);
      await pool.query('INSERT INTO certification_enrollments (discord_user_id,status) VALUES ($1,$2)', [subject, status]);
      assert.equal((await service.closeApplication(owner, subject, 'denied')).alreadyClosed, false);
    }
    await service.closeApplication(owner, student, 'withdrawn');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM certification_lab_requests WHERE request_id=$1', [requestId])).rows[0].n, 1);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM certification_enrollments')).rows[0].n, 4);
  }));
});
