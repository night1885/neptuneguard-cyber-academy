import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationLabManagement } from './certification-lab-management.js';
const owner = '1223123544301633567', student = '1223123544301633568';
const request = '00000000-0000-4000-8000-000000000001';
function fixture({ status = 'approved', auditFailure = false, missing = false, changed = false, enabled = true } = {}) {
  const queries = [], releases = [];
  let persisted = status, staged = null, connections = 0;
  const db = { async query(sql, params) {
    queries.push({ sql, params });
    if (sql.startsWith('SELECT')) return { rows: missing ? [] : [{ request_id: request, discord_user_id: student, status: persisted }] };
    if (sql.startsWith('UPDATE')) { if (!changed) staged = params[1]; return { rowCount: changed ? 0 : 1 }; }
    if (sql.startsWith('INSERT') && auditFailure) throw new Error('Audit failed');
    if (sql === 'COMMIT' && staged !== null) persisted = staged;
    if (sql === 'ROLLBACK') staged = null;
    return { rows: [] };
  }, release(discard) { releases.push(discard); } };
  return { queries, releases, get status() { return persisted; }, get connections() { return connections; },
    service: createCertificationLabManagement({ async connect() { connections++; return db; } }, { enabled, ownerId: owner }) };
}
test('approved lab suspension locks the request, records the reason and audits atomically', async () => {
  const f = fixture();
  const result = await f.service.changeLabStatus(owner, request, 'suspend', ' Owner review ');
  assert.equal(result.status, 'suspended'); assert.equal(result.studentDiscordId, student);
  assert.equal(result.alreadyApplied, false); assert.equal(result.sessionTerminationRequired, true);
  assert.match(f.queries[1].sql, /FOR UPDATE/);
  assert.deepEqual(f.queries.find(query => query.sql.startsWith('UPDATE')).params, [request,'suspended','Owner review','approved']);
  const audit = f.queries.find(query => query.sql.startsWith('INSERT'));
  assert.equal(audit.params[2], 'lab_request_suspended');
  assert.deepEqual(JSON.parse(audit.params[3]), { requestId: request, from: 'approved', to: 'suspended', reason: 'Owner review', providerSessionTerminated: false });
  assert.equal(f.status, 'suspended'); assert.equal(f.queries.at(-1).sql, 'COMMIT');
  assert.ok(!f.queries.some(query => query.sql.includes('certification_enrollments')));
  assert.deepEqual(f.releases, [false]);
});
test('repeated suspension creates no new write or audit and still reports provider reconciliation needed', async () => {
  const f = fixture({ status: 'suspended' });
  const result = await f.service.changeLabStatus(owner, request, 'suspend', 'Retry');
  assert.equal(result.alreadyApplied, true); assert.equal(result.sessionTerminationRequired, true);
  assert.ok(!f.queries.some(query => /^(UPDATE|INSERT)/.test(query.sql)));
});
for (const status of ['pending','denied','revoked','expired']) {
  test(`suspension rejects ${status} without changing the record`, async () => {
    const f = fixture({ status });
    await assert.rejects(f.service.changeLabStatus(owner, request, 'suspend', 'Review'), /does not permit/);
    assert.equal(f.status, status); assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
    assert.ok(!f.queries.some(query => /^(UPDATE|INSERT)/.test(query.sql)));
  });
}
for (const options of [{ auditFailure: true },{ missing: true },{ changed: true }]) {
  test(`failed suspension rolls back ${JSON.stringify(options)}`, async () => {
    const f = fixture(options); await assert.rejects(f.service.changeLabStatus(owner, request, 'suspend', 'Review'));
    assert.equal(f.status, 'approved'); assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
    assert.ok(!f.queries.some(query => query.sql === 'COMMIT')); assert.deepEqual(f.releases, [false]);
  });
}
for (const options of [{ actor: student },{ enabled: false },{ reason: ' ' }]) {
  test(`invalid suspension is rejected before connection ${JSON.stringify(options)}`, async () => {
    const f = fixture({ enabled: options.enabled ?? true });
    await assert.rejects(f.service.changeLabStatus(options.actor ?? owner, request, 'suspend', options.reason ?? 'Review'));
    assert.equal(f.connections, 0);
  });
}
