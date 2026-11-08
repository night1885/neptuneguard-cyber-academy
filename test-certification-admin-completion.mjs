import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdministratorCourseCompletion } from './certification-admin-completion.js';
const actor = '1223123544301633568', owner = '1223123544301633567', subject = '1223123544301633569';
function fixture(options = {}) {
  const calls = []; let checks = 0;
  const course = { course_key: 'fixture', status: options.completed ? 'completed' : 'active', completed_at: '2026-01-01T00:00:00.000Z' };
  const db = { async query(sql, args) {
    calls.push({ sql, args });
    if (sql.includes('FROM certification_enrollments')) return { rows: [{ status: 'suspended', student_id: 'NG-fixture', approved_by: owner, approved_at: new Date(), application_closed_at: null, application_closed_by: null, application_closed_as: null }] };
    if (sql.includes('FROM certification_course_enrollments')) return { rows: [course] };
    if (sql.startsWith('UPDATE')) return { rowCount: 1, rows: [{ ...course, status: 'completed', completed_at: args[2], completed_by: args[3] }] };
    if (sql.startsWith('INSERT') && options.auditFails) throw new Error('Audit fixture failure');
    if (sql === 'ROLLBACK' && options.rollbackFails) throw new Error('Rollback fixture failure');
    return { rows: [] };
  }, release(discard) { calls.push({ release: discard }); } };
  const pool = { async connect() { calls.push({ connect: true }); return db; } };
  const service = createAdministratorCourseCompletion(pool, { enabled: true }, { courseKeys: ['fixture'], now: () => new Date('2026-02-01T00:00:00.000Z'),
    async verifyAdministrator(who) { assert.equal(who, actor); checks++; if (options.verifierThrows) throw new Error('Verifier fixture failure'); return (options.permissions || [true, true])[checks - 1] === true; } });
  return { service, calls, checks: () => checks };
}
test('missing trusted verifier is rejected', () => { assert.throws(() => createAdministratorCourseCompletion({ connect() {} }, { enabled: true }, { courseKeys: ['fixture'] }), /trusted verifier/); });
test('non-owner Administrator completes with their own audit identity and no assignment API', async () => {
  const f = fixture(), result = await f.service.completeCourse(actor, subject, 'fixture');
  assert.equal(result.alreadyCompleted, false); assert.equal(result.allAssignedCoursesCompleted, true); assert.equal(f.checks(), 2);
  assert.equal(f.service.assignCourses, undefined);
  assert.equal(f.calls.find(call => call.sql?.startsWith('UPDATE')).args[3], actor);
  assert.equal(f.calls.find(call => call.sql?.startsWith('INSERT')).args[0], actor);
  assert.ok(f.calls.some(call => call.sql === 'COMMIT'));
});
test('denied or failed initial verification never connects to database', async () => {
  for (const options of [{ permissions: [false] }, { verifierThrows: true }]) { const f = fixture(options); await assert.rejects(f.service.completeCourse(actor, subject, 'fixture'), /Administrator/); assert.equal(f.calls.length, 0); }
});
test('permission loss while acquiring locks rolls back before mutation', async () => {
  const f = fixture({ permissions: [true, false] }); await assert.rejects(f.service.completeCourse(actor, subject, 'fixture'), /Administrator/);
  assert.ok(f.calls.some(call => call.sql?.includes('ORDER BY course_key FOR UPDATE')));
  assert.ok(f.calls.some(call => call.sql === 'ROLLBACK'));
  assert.ok(!f.calls.some(call => /^(UPDATE|INSERT|COMMIT)/.test(call.sql || '')));
});
test('completed retries recheck authorization and do not rewrite completion or audit', async () => {
  const f = fixture({ completed: true }); const result = await f.service.completeCourse(actor, subject, 'fixture');
  assert.equal(result.alreadyCompleted, true); assert.equal(result.completedAt, '2026-01-01T00:00:00.000Z'); assert.equal(f.checks(), 2);
  assert.ok(!f.calls.some(call => /^(UPDATE|INSERT)/.test(call.sql || '')));
});
test('audit failure requests rollback and failed rollback discards connection', async () => {
  for (const rollbackFails of [false, true]) { const f = fixture({ auditFails: true, rollbackFails }); await assert.rejects(f.service.completeCourse(actor, subject, 'fixture'), /Audit fixture/); assert.ok(f.calls.some(call => call.sql === 'ROLLBACK')); assert.ok(!f.calls.some(call => call.sql === 'COMMIT')); assert.deepEqual(f.calls.at(-1), { release: rollbackFails }); }
});
test('invalid actor, subject and course are rejected without access', async () => {
  const f = fixture(); for (const args of [['invalid', subject, 'fixture'], [actor, 'invalid', 'fixture'], [actor, subject, 'unknown']]) await assert.rejects(f.service.completeCourse(...args), /Valid actor/);
  assert.equal(f.calls.length, 0); assert.equal(f.checks(), 0);
});
