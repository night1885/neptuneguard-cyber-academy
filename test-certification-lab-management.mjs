import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationLabManagement } from './certification-lab-management.js';
const owner = '1223123544301633567', student = '1223123544301633568';
const request = '00000000-0000-4000-8000-000000000001';
const config = { enabled: true, ownerId: owner };
function fixture({ status = 'pending', missing = false, auditFailure = false, rollbackFailure = false, changed = false } = {}) {
  const queries = [], releases = []; let connections = 0;
  const record = { request_id: request, discord_user_id: student, status };
  const db = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql.startsWith('SELECT')) return { rows: missing ? [] : [{ ...record }] };
    if (sql.startsWith('UPDATE')) { if (!changed) record.status = params[1]; return { rowCount: changed ? 0 : 1, rows: changed ? [] : [{ request_id: request }] }; }
    if (sql.startsWith('INSERT') && auditFailure) throw new Error('Audit unavailable');
    if (sql === 'ROLLBACK' && rollbackFailure) throw new Error('Rollback unavailable');
    return { rows: [] };
  }, release(discard) { releases.push(discard); } };
  const pool = { async connect() { connections++; return db; } };
  return { service: createCertificationLabManagement(pool, config), pool, queries, releases, get connections() { return connections; } };
}
for (const [action, from, to] of [['deny', 'pending', 'denied'], ['revoke', 'approved', 'revoked'], ['revoke', 'suspended', 'revoked']]) {
  test(`${action} ${from} request is locked, audited and committed`, async () => {
    const f = fixture({ status: from });
    const result = await f.service.changeLabStatus(owner, request, action, ' Owner reason ');
    assert.equal(result.status, to); assert.equal(result.alreadyApplied, false);
    assert.equal(result.requestId, request); assert.equal(result.studentDiscordId, student);
    assert.equal(result.sessionTerminationRequired, action === 'revoke');
    assert.match(f.queries[1].sql, /FOR UPDATE/);
    const update = f.queries.find(query => query.sql.startsWith('UPDATE'));
    assert.deepEqual(update.params, [request, to, 'Owner reason', from]);
    assert.ok(!update.sql.includes('Owner reason'));
    const audit = f.queries.find(query => query.sql.startsWith('INSERT'));
    assert.equal(JSON.parse(audit.params[3]).providerSessionTerminated, false);
    assert.equal(f.queries.at(-1).sql, 'COMMIT'); assert.deepEqual(f.releases, [false]);
  });
}
for (const [action, status] of [['deny', 'denied'], ['revoke', 'revoked']]) {
  test(`repeated ${action} does not create another write or audit`, async () => {
    const f = fixture({ status }); const result = await f.service.changeLabStatus(owner, request, action, 'Retry');
    assert.equal(result.alreadyApplied, true); assert.ok(!f.queries.some(query => /^(UPDATE|INSERT)/.test(query.sql)));
    assert.equal(result.sessionTerminationRequired, action === 'revoke');
  });
}
for (const [actor, id, action, reason] of [
  [student, request, 'deny', 'Reason'], [owner, 'invalid', 'deny', 'Reason'],
  [owner, request, 'approve', 'Reason'], [owner, request, '__proto__', 'Reason'],
  [owner, request, 'deny', ' '], [owner, request, 'deny', 'x'.repeat(1001)]
]) {
  test(`invalid lab mutation rejected before connection ${actor}/${id}/${action}/${reason.length}`, async () => {
    const f = fixture(); await assert.rejects(f.service.changeLabStatus(actor, id, action, reason)); assert.equal(f.connections, 0);
  });
}
test('disabled service cannot change lab status', async () => {
  const f = fixture(); const service = createCertificationLabManagement(f.pool, { ...config, enabled: false });
  await assert.rejects(service.changeLabStatus(owner, request, 'deny', 'Reason')); assert.equal(f.connections, 0);
});
for (const options of [{ missing: true }, { status: 'approved' }, { changed: true }, { auditFailure: true }]) {
  test(`failed denial rolls back ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await assert.rejects(f.service.changeLabStatus(owner, request, 'deny', 'Reason'));
    assert.equal(f.queries.at(-1).sql, 'ROLLBACK'); assert.deepEqual(f.releases, [false]);
    assert.ok(!f.queries.some(query => query.sql === 'COMMIT'));
  });
}
test('failed rollback discards the client', async () => {
  const f = fixture({ auditFailure: true, rollbackFailure: true });
  await assert.rejects(f.service.changeLabStatus(owner, request, 'deny', 'Reason')); assert.deepEqual(f.releases, [true]);
});
