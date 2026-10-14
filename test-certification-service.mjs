import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationConfig } from './certification-config.js';
import { createCertificationService } from './certification-service.js';

const ownerId = '1223123544301633567';
const studentId = '1223123544301633568';
const config = { ownerId, enabled: true };
const pending = { discord_user_id: studentId, status: 'pending', agreement_version: 'test-v2',
  agreement_content_sha256: 'a'.repeat(64), comprehension_check_version: 'check-v2',
  acknowledged_at: '2026-10-12', signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null,
  learner_confirmed_read_at: '2026-10-12', comprehension_passed_at: '2026-10-12',
  age_eligible: true, age_declared_at: '2026-10-12', age_declaration_version: 'adult-18-v1' };
function fixture(row = pending, failAudit = false) {
  const queries = []; let released = false; let connections = 0;
  const db = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql.includes('FOR UPDATE')) return { rows: row ? [{ ...row }] : [] };
    if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Audit write failed');
    return { rows: [] };
  }, release() { released = true; } };
  const pool = { async connect() { connections++; return db; }, query: db.query.bind(db) };
  return { pool, queries, get released() { return released; }, get connections() { return connections; } };
}
async function rejectedApproval(f, pattern, activeConfig = config) {
  await assert.rejects(createCertificationService(f.pool, activeConfig).approveEnrollment(ownerId, studentId), pattern);
  assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
  assert.ok(!f.queries.some(q => q.sql.startsWith('UPDATE certification_enrollments')));
  assert.equal(f.released, true);
}

test('configuration is disabled by default and validates IDs', () => {
  const value = loadCertificationConfig({});
  assert.equal(value.enabled, false); assert.equal(value.ownerId, ownerId);
  assert.throws(() => loadCertificationConfig({ ACADEMY_OWNER_ID: 'invalid' }));
});
test('non-owner approval is rejected before database access', async () => {
  const f = fixture();
  await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(studentId, studentId), /Owner authorization/);
  assert.equal(f.connections, 0);
});
test('disabled certification denies approval and course authorization', async () => {
  const f = fixture(); const service = createCertificationService(f.pool, { ...config, enabled: false });
  await assert.rejects(service.approveEnrollment(ownerId, studentId), /disabled/);
  assert.equal(await service.getCourseAuthorization(studentId), null); assert.equal(f.queries.length, 0);
});
test('missing account acknowledgment or adult declaration rolls back without updates', async () => {
  for (const field of ['discord_user_id', 'agreement_version', 'agreement_content_sha256', 'comprehension_check_version', 'acknowledged_at', 'signature_method', 'learner_confirmed_read_at', 'comprehension_passed_at', 'age_eligible', 'age_declared_at', 'age_declaration_version']) {
    await rejectedApproval(fixture({ ...pending, [field]: null }), /Complete current account acknowledgment/);
  }
});
test('account acknowledgment without name or document commits enrollment and audit', async () => {
  const f = fixture(); const result = await createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId);
  assert.match(result.studentId, /^NG-PT-[a-f0-9-]{36}$/); assert.equal(result.alreadyApproved, false);
  const audit = f.queries.find(q => q.sql.includes('INSERT INTO certification_audit_events'));
  assert.deepEqual(JSON.parse(audit.params[2]), { studentId: result.studentId, agreementVersion: 'test-v2', acknowledgmentMethod: 'discord_account', ageDeclarationVersion: 'adult-18-v1' });
  assert.ok(f.queries.some(q => q.sql.includes('FOR UPDATE')));
  assert.equal(f.queries.at(-1).sql, 'COMMIT'); assert.equal(f.released, true);
});
test('repeated approval preserves ID without update or second audit', async () => {
  const f = fixture({ ...pending, status: 'approved', student_id: 'NG-PT-existing', approved_by: ownerId, approved_at: '2026-10-12' });
  assert.deepEqual(await createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId), { studentId: 'NG-PT-existing', alreadyApproved: true });
  assert.ok(!f.queries.some(q => q.sql.includes('UPDATE') && !q.sql.includes('FOR UPDATE')));
  assert.ok(!f.queries.some(q => q.sql.includes('INSERT')));
});
test('audit failure rolls back instead of committing approval', async () => {
  const f = fixture(pending, true);
  await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId), /Audit write failed/);
  assert.equal(f.queries.at(-1).sql, 'ROLLBACK'); assert.ok(!f.queries.some(q => q.sql === 'COMMIT')); assert.equal(f.released, true);
});
test('invalid student IDs are rejected before database access', async () => {
  for (const value of ['invalid', '', null, 1223123544301633568, '1'.repeat(21)]) {
    const f = fixture();
    await assert.rejects(createCertificationService(f.pool, config).approveEnrollment(ownerId, value), /Invalid student Discord ID/);
    assert.equal(f.connections, 0);
  }
});
test('missing enrollment rolls back and releases connection', async () => {
  await rejectedApproval(fixture(null), /not found/);
});
test('non-pending states cannot bypass separate reinstatement', async () => {
  for (const status of ['denied', 'suspended', 'revoked', 'unknown']) await rejectedApproval(fixture({ ...pending, status }), /Only pending/);
});
test('pending request preserves previously assigned permanent ID', async () => {
  const f = fixture({ ...pending, student_id: 'NG-PT-existing' });
  assert.equal((await createCertificationService(f.pool, config).approveEnrollment(ownerId, studentId)).studentId, 'NG-PT-existing');
});
test('approved rows missing ID or approval records fail closed', async () => {
  const approved = { ...pending, status: 'approved', student_id: 'NG-PT-existing', approved_by: ownerId, approved_at: '2026-10-12' };
  for (const field of ['student_id', 'approved_by', 'approved_at']) await rejectedApproval(fixture({ ...approved, [field]: null }), /Approved enrollment is incomplete/);
});
test('legacy methods, retained identity fields and invalid eligibility cannot substitute', async () => {
  for (const changes of [{ signature_method: 'signed_document', signature_reference: 'legacy-reference' }, { signature_method: 'typed_name' }, { acknowledgment_name: '   ' }, { acknowledgment_name: 'A'.repeat(201) }, { acknowledgment_name: 'Example\nLearner' }, { age_eligible: false }, { age_eligible: 'yes' }, { age_declaration_version: 'unknown' }]) {
    await rejectedApproval(fixture({ ...pending, ...changes }), /Complete current account acknowledgment/);
  }
});
test('configured agreement changes require current acknowledgment', async () => {
  for (const change of [{ activeAgreementVersion: 'changed' }, { activeAgreementSha256: 'b'.repeat(64) }, { comprehensionCheck: { version: 'changed' } }]) {
    await rejectedApproval(fixture(), /Complete current account acknowledgment/, { ...config, ...change });
  }
});
