import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationInvitationReader, PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const admin = '1223123544301633567', student = '1223123544301633568';
const config = { enabled: true, ownerId: admin, enrollmentSubmissionEnabled: false };
function fixture(rows = [], settings = {}) {
  const queries = [];
  const pool = { async query(sql, values) { queries.push({ sql, values }); return { rows }; }, connect() { assert.fail('Invitation checks must not open transactions or write'); } };
  return { queries, reader: createRegistrationInvitationReader(pool, { ...config, ...settings }) };
}
test('pending invitation can be read while general enrollment stays disabled', async () => {
  const f = fixture([{ invited: 1 }]);
  assert.equal(await f.reader.hasPendingInvitation(student), true);
  assert.deepEqual(f.queries, [{ sql: PENDING_REGISTRATION_INVITATION_SQL, values: [student, admin] }]);
  assert.equal(config.enrollmentSubmissionEnabled, false);
  assert.equal(Object.isFrozen(f.reader), true);
});
test('absent or unexpected result does not claim an invitation', async () => {
  for (const rows of [[], [{}], [{ invited: 0 }], [{ invited: '1' }], [{ invited: 1 }, { invited: 1 }]]) {
    const f = fixture(rows); assert.equal(await f.reader.hasPendingInvitation(student), false);
  }
});
test('disabled certification and missing or malformed admin configuration do not query', async () => {
  for (const settings of [{ enabled: false }, { enabled: undefined }, { ownerId: undefined }, { ownerId: 'invalid' }]) {
    const f = fixture([{ invited: 1 }], settings);
    assert.equal(await f.reader.hasPendingInvitation(student), false); assert.equal(f.queries.length, 0);
  }
});
test('invalid learner identifiers do not query', async () => {
  for (const actor of [undefined, null, '', 'invalid', 1223123544301633568, '1'.repeat(16), '1'.repeat(21), `${student}' OR TRUE`]) {
    const f = fixture([{ invited: 1 }]); assert.equal(await f.reader.hasPendingInvitation(actor), false); assert.equal(f.queries.length, 0);
  }
});
test('invitation lookup is a scoped SELECT requiring clean awaiting state and trusted audit provenance', () => {
  const sql = PENDING_REGISTRATION_INVITATION_SQL;
  assert.match(sql, /^SELECT/); assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
  for (const condition of ["e.discord_user_id=$1", "e.status='awaiting_acknowledgment'", 'e.student_id IS NULL', 'e.approved_by IS NULL', 'e.approved_at IS NULL', 'e.acknowledgment_name IS NULL', 'e.signature_reference IS NULL', 'a.subject_discord_user_id=e.discord_user_id', 'a.actor_discord_user_id=$2', "a.action='student_registered_by_owner'"]) assert.ok(sql.includes(condition), condition);
  assert.match(sql, /LIMIT 1$/);
});
test('database failures propagate instead of allowing invitation access', async () => {
  const error = new Error('lookup failed');
  const reader = createRegistrationInvitationReader({ query() { throw error; } }, config);
  await assert.rejects(reader.hasPendingInvitation(student), candidate => candidate === error);
});
