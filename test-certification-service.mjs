import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationService } from './certification-service.js';

const ownerId = '1223123544301633567';
const studentId = '1223123544301633568';
const config = { ownerId, enabled: true };
const pending = { status: 'pending', agreement_version: 'v1', acknowledged_at: '2026-10-12',
  signature_method: 'test-artifact', signature_reference: 'test-reference',
  learner_confirmed_read_at: '2026-10-12', comprehension_passed_at: '2026-10-12' };

function fixture(row = pending, failAudit = false) {
  const queries = [];
  let released = false;
  let connections = 0;
  const db = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Audit write failed');
      return { rows: [] };
    },
    release() { released = true; }
  };
  const pool = { async connect() { connections++; return db; }, query: db.query.bind(db) };
  return { pool, queries, get released() { return released; }, get connections() { return connections; } };
}

test('configuration is disabled by default and validates IDs', () => {
  const value = loadCertificationConfig({});
  assert.equal(value.enabled, false);
  assert.equal(value.ownerId, ownerId);
  assert.throws(() => loadCertificationConfig({ ACADEMY_OWNER_ID: 'invalid' }));
});

test('non-owner approval is rejected before database access', async () => {
  const f = fixture();
  await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(studentId, studentId), /Owner authorization/);
  assert.equal(f.connections, 0);
});

test('disabled certification denies approval and course authorization', async () => {
  const f = fixture();
  const service = createCertificationService(f.pool, { ...config, enabled: false });
  await assert.rejects(service.approveEnrollment(ownerId, studentId), /disabled/);
  assert.equal(await service.getCourseAuthorization(studentId), null);
  assert.equal(f.queries.length, 0);
});

test('incomplete acknowledgment rolls back and releases connection', async () => {
  const f = fixture({ ...pending, signature_reference: null });
  await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId), /Complete acknowledgment/);
  assert.ok(f.queries.some(q => q.sql === 'ROLLBACK'));
  assert.ok(!f.queries.some(q => q.sql.includes('UPDATE certification_enrollments')));
  assert.equal(f.released, true);
});

test('approval generates ID and commits audit and enrollment together', async () => {
  const f = fixture();
  const result = await createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId);
  assert.match(result.studentId, /^NG-PT-[a-f0-9-]{36}$/);
  assert.equal(result.alreadyApproved, false);
  assert.ok(f.queries.some(q => q.sql.includes('INSERT INTO certification_audit_events')));
  assert.equal(f.queries.at(-1).sql, 'COMMIT');
  assert.equal(f.released, true);
});

test('repeated approval preserves existing ID without update or second audit', async () => {
  const f = fixture({ ...pending, status: 'approved', student_id: 'NG-PT-existing' });
  const result = await createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId);
  assert.deepEqual(result, { studentId: 'NG-PT-existing', alreadyApproved: true });
  assert.ok(!f.queries.some(q => q.sql.includes('UPDATE') && !q.sql.includes('FOR UPDATE')));
  assert.ok(!f.queries.some(q => q.sql.includes('INSERT')));
});

test('audit failure rolls back instead of committing approval', async () => {
  const f = fixture(pending, true);
  await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId), /Audit write failed/);
  assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
  assert.ok(!f.queries.some(q => q.sql === 'COMMIT'));
  assert.equal(f.released, true);
});
