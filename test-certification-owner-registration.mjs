import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
const owner = '111111111111111111';
const student = '222222222222222222';
function fixture({ existing, failAudit = false, failRollback = false } = {}) {
  const calls = [];
  const releases = [];
  let connections = 0;
  const pool = { async connect() {
    connections++;
    return { async query(sql, values) {
      calls.push({ sql, values });
      if (sql === 'ROLLBACK' && failRollback) throw new Error('rollback failed');
      if (sql.includes('INSERT INTO certification_enrollments')) return { rows: existing ? [] : [{ discord_user_id: student, status: 'awaiting_acknowledgment', student_id: null }] };
      if (sql.includes('INSERT INTO certification_audit_events') && failAudit) throw new Error('audit failed');
      if (sql.startsWith('SELECT')) return { rows: [existing] };
      return { rows: [] };
    }, release(discard) { releases.push(discard); } };
  } };
  return { service: createOwnerRegistrationService(pool, { enabled: true, ownerId: owner }), pool, calls, releases, connections: () => connections };
}

test('rejects unauthorized actors and invalid IDs before connecting', async () => {
  const f = fixture();
  await assert.rejects(f.service.register(student, student), /Owner authorization/);
  for (const id of ['', 'abc', '123', 123, null]) await assert.rejects(f.service.register(owner, id), /Invalid student/);
  await assert.rejects(createOwnerRegistrationService(f.pool, { enabled: false, ownerId: owner }).register(owner, student), /Owner authorization/);
  assert.equal(f.connections(), 0);
});

test('creates an unapproved registration and audit atomically', async () => {
  const f = fixture();
  const result = await f.service.register(owner, student);
  assert.equal(result.created, true);
  assert.equal(result.record.status, 'awaiting_acknowledgment');
  assert.equal(result.record.student_id, null);
  assert.equal(f.calls[0].sql, 'BEGIN');
  assert.deepEqual(f.calls[1].values, [student]);
  assert.match(f.calls[1].sql, /ON CONFLICT.*DO NOTHING/);
  assert.deepEqual(f.calls[2].values, [owner, student, JSON.stringify({ status: 'awaiting_acknowledgment', accessGranted: false })]);
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.deepEqual(f.releases, [false]);
});

test('preserves every existing enrollment status without a second audit', async () => {
  for (const status of ['awaiting_acknowledgment', 'pending', 'approved', 'denied', 'suspended', 'revoked']) {
    const existing = { discord_user_id: student, status, student_id: 'NG-existing' };
    const f = fixture({ existing });
    assert.deepEqual(await f.service.register(owner, student), { created: false, record: existing });
    assert.equal(f.calls.some(call => call.sql.includes('INSERT INTO certification_audit_events')), false);
    assert.equal(f.calls.some(call => call.sql.startsWith('UPDATE')), false);
    assert.deepEqual(f.releases, [false]);
  }
});

test('audit failure rolls back registration', async () => {
  const f = fixture({ failAudit: true });
  await assert.rejects(f.service.register(owner, student), /audit failed/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(f.calls.some(call => call.sql === 'COMMIT'), false);
  assert.deepEqual(f.releases, [false]);
});

test('rollback failure discards the connection and preserves the original error', async () => {
  const f = fixture({ failAudit: true, failRollback: true });
  await assert.rejects(f.service.register(owner, student), /audit failed/);
  assert.deepEqual(f.releases, [true]);
});
