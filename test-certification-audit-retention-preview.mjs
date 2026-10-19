import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { classifyAuditRetention, createAuditRetentionPreview } from './certification-audit-retention-preview.js';

const owner = '1223123544301633567', cutoff = '2026-04-30T23:59:59.123456Z';
const row = { event_id: '9007199254740993', occurred_at_utc: '2026-01-31T23:59:59.123456Z' };
test('audit preview preserves microseconds, calendar-month clamping, leap years, and exact IDs', () => {
  const result = classifyAuditRetention(row, cutoff);
  assert.equal(result.eventId, row.event_id); assert.equal(result.timingEligibleAt, cutoff); assert.equal(result.disposition, 'timing_candidate');
  assert.equal(classifyAuditRetention(row, '2026-04-30T23:59:59.123455Z').timingEligible, false);
  assert.equal(classifyAuditRetention(row, '2026-04-30T23:59:59.123457Z').timingEligible, true);
  for (const [occurred, expected] of [['2023-11-30T12:00:00.999999Z','2024-02-29T12:00:00.999999Z'],['2026-07-31T23:59:59.999999Z','2026-10-31T23:59:59.999999Z']]) {
    assert.equal(classifyAuditRetention({ ...row, occurred_at_utc: occurred }, expected).timingEligibleAt, expected);
  }
  assert.equal(classifyAuditRetention(row, cutoff, { unreviewedForeignKeys: true }).disposition, 'blocked');
  for (const timestamp of ['2026-02-30T00:00:00.000000Z','1969-12-31T23:59:59.999999Z','infinity',null]) assert.equal(classifyAuditRetention({ ...row, occurred_at_utc: timestamp }, cutoff).disposition, 'review_required');
  assert.equal(classifyAuditRetention({ ...row, event_id: 9007199254740992 }, cutoff).disposition, 'review_required');
});
test('audit preview rejects invalid requests before database access and discards rollback failures', async () => {
  let connects = 0; const pool = { async connect() { connects++; throw new Error('Unexpected connection'); } };
  const preview = createAuditRetentionPreview(pool, { ownerId: owner, previewEnabled: true });
  await assert.rejects(preview.preview('1223123544301633601', { asOfUtc: cutoff }), /owner authorization/);
  await assert.rejects(createAuditRetentionPreview(pool, { ownerId: owner }).preview(owner, { asOfUtc: cutoff }), /Enabled retention preview/);
  for (const options of [{ asOfUtc: new Date() }, { asOfUtc: '2026-04-30T23:59:59.123Z' }, { asOfUtc: cutoff, afterEventId: 9007199254740992 }, { asOfUtc: cutoff, afterEventId: '9223372036854775808' }, { asOfUtc: cutoff, limit: 251 }]) await assert.rejects(preview.preview(owner, options));
  assert.equal(connects, 0);
  const released = [], failing = { async connect() { return { async query(sql) { if (sql.startsWith('BEGIN')) return { rows: [] }; throw new Error(sql === 'ROLLBACK' ? 'Rollback failed' : 'Read failed'); }, release(discard) { released.push(discard); } }; } };
  await assert.rejects(createAuditRetentionPreview(failing, { ownerId: owner, previewEnabled: true }).preview(owner, { asOfUtc: cutoff }), /Read failed/); assert.deepEqual(released, [true]);
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
test('isolated PostgreSQL audit preview uses column-only SELECT and exact timestamp/ID pagination', { skip: !databaseUrl || process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL !== 'true' }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_audit_preview_${suffix}`, role = `cert_audit_role_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, schemaCreated = false, roleCreated = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    await admin.query(await readFile(new URL('./migrations/001-certification.sql', import.meta.url), 'utf8'));
    const fixtures = [['1',row.occurred_at_utc],['2','2026-02-28T00:00:00.000001Z'],[row.event_id,row.occurred_at_utc],['9007199254740994','1969-12-31T23:59:59.999999Z']];
    for (const [eventId, timestamp] of fixtures) await admin.query("INSERT INTO certification_audit_events (event_id,actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES ($1,$2,$2,'fixture','{\"private_fixture\":true}',$3::timestamptz)", [eventId, owner, timestamp]);
    const snapshot = async () => (await admin.query('SELECT event_id::text,actor_discord_user_id,subject_discord_user_id,action,details,created_at::text FROM certification_audit_events ORDER BY event_id')).rows;
    const before = await snapshot();
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT (event_id,created_at) ON certification_audit_events TO "${role}"`);
    url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c TimeZone=Pacific/Auckland -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    const preview = createAuditRetentionPreview(worker, { ownerId: owner, previewEnabled: true });
    const report = await preview.preview(owner, { asOfUtc: cutoff });
    assert.equal(report.executionAuthorized, false); assert.equal(report.auditScanComplete, true); assert.equal(report.preservationReviewed, false);
    assert.deepEqual(report.records.map(record => record.eventId), fixtures.map(([eventId]) => eventId));
    assert.equal(report.records[0].occurredAt, row.occurred_at_utc); assert.equal(report.records[0].timingEligibleAt, cutoff);
    assert.deepEqual(report.records.map(record => record.disposition), ['timing_candidate','not_due','timing_candidate','review_required']);
    const first = await preview.preview(owner, { asOfUtc: cutoff, limit: 2 });
    const second = await preview.preview(owner, { asOfUtc: cutoff, limit: 2, afterEventId: first.nextAfterEventId });
    assert.equal(first.auditScanComplete, false); assert.equal(first.nextAfterEventId, '2'); assert.equal(second.hasMore, false);
    assert.deepEqual([...first.records,...second.records].map(record => record.eventId), fixtures.map(([eventId]) => eventId));
    assert.equal((await preview.preview(owner, { asOfUtc: '2026-04-30T23:59:59.123455Z' })).records[0].timingEligible, false);
    await assert.rejects(worker.query('SELECT details FROM certification_audit_events'), error => error.code === '42501');
    await assert.rejects(worker.query('DELETE FROM certification_audit_events'), error => error.code === '42501');
    await admin.query('CREATE TABLE fixture_audit_dependency (event_id BIGINT REFERENCES certification_audit_events(event_id) ON DELETE CASCADE)');
    const blocked = await preview.preview(owner, { asOfUtc: cutoff });
    assert.ok(blocked.unreviewedForeignKeys.some(key => key.table_name === 'fixture_audit_dependency'));
    assert.ok(blocked.records.filter(record => record.timingEligible).every(record => record.disposition === 'blocked'));
    assert.deepEqual(await snapshot(), before);
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
