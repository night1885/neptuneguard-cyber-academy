import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';
import { createCertificationSubmission } from './certification-submission.js';
import { CERTIFICATION_AGE_POLICY_VERSION, hasCurrentAgeEligibility } from './certification-age-evidence.js';

const learner = '1223123544301633568'; const legacy = '1223123544301633569'; const failing = '1223123544301633570';
const content = 'Durable eligibility fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
const config = { enabled: true, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-age', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
const input = { typedName: 'Fixture Learner', confirmedRead: true, reportedAge: 16, agreementVersion: 'fixture-age', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
const pending = { status: 'pending', acknowledgment_name: input.typedName, agreement_version: input.agreementVersion, agreement_content_sha256: hash, comprehension_check_version: input.comprehensionCheckVersion, signature_method: 'typed_name', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date' };
function fixture(row = { status: 'awaiting_acknowledgment' }, failAudit = false, failRollback = false) {
  const calls = []; const releases = []; let connections = 0;
  const pool = { async connect() { connections++; return {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM certification_agreements')) return { rows: [{ content, content_sha256: hash }] };
      if (sql.includes('FOR UPDATE')) return { rows: [row] };
      if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Fixture audit failure');
      if (failRollback && sql === 'ROLLBACK') throw new Error('Fixture rollback failure');
      return { rows: [] };
    }, release(value) { releases.push(value); }
  }; } };
  return { service: createAgeCheckedCertificationSubmission(pool, config), calls, releases, get connections() { return connections; } };
}
test('writer uses trusted policy and NOW without storing learner-supplied evidence or age', async () => {
  const f = fixture(); await f.service.submitEnrollment(learner, { ...input, age_policy_version: 'forged', age_eligibility_confirmed_at: 'forged', age_eligibility_confirmed: false });
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.match(update.sql, /age_eligibility_confirmed_at=NOW\(\)/); assert.equal(update.params[5], CERTIFICATION_AGE_POLICY_VERSION);
  assert.ok(!update.params.includes('forged') && !update.params.includes(16));
  const audit = JSON.parse(f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events')).params[1]);
  assert.equal(audit.agePolicyVersion, CERTIFICATION_AGE_POLICY_VERSION); assert.equal(Object.hasOwn(audit, 'reportedAge'), false);
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.deepEqual(f.releases, [false]);
});
test('matching legacy pending request receives age evidence without rewriting acknowledgment', async () => {
  const f = fixture(pending); assert.equal((await f.service.submitEnrollment(learner, input)).alreadySubmitted, true);
  const update = f.calls.find(c => c.sql.includes('UPDATE certification_enrollments'));
  assert.ok(!update.sql.includes('acknowledgment_name=') && !update.sql.includes('acknowledged_at=') && !update.sql.includes('status='));
  assert.ok(f.calls.some(c => c.sql.includes("'age_eligibility_confirmed'")));
});
test('current evidence retry does not refresh timestamp or create another audit event', async () => {
  const f = fixture({ ...pending, age_eligibility_confirmed: true, age_eligibility_confirmed_at: new Date(), age_policy_version: CERTIFICATION_AGE_POLICY_VERSION });
  await f.service.submitEnrollment(learner, input);
  assert.ok(!f.calls.some(c => c.sql.includes('UPDATE certification_enrollments') || c.sql.includes('INSERT INTO certification_audit_events')));
});
test('audit failure rolls back and failed rollback discards the connection', async () => {
  for (const failRollback of [false, true]) {
    const f = fixture(pending, true, failRollback); await assert.rejects(f.service.submitEnrollment(learner, input), /audit failure/);
    assert.ok(!f.calls.some(c => c.sql === 'COMMIT')); assert.deepEqual(f.releases, [failRollback]);
  }
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
test('real PostgreSQL evidence writes preserve legacy acknowledgment and are transactional and idempotent', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', [config.activeAgreementVersion, content, hash]);
    const service = createAgeCheckedCertificationSubmission(pool, config);
    const results = await Promise.all([service.submitEnrollment(learner, input), service.submitEnrollment(learner, input)]);
    assert.deepEqual(results.map(r => r.alreadySubmitted).sort(), [false, true]);
    const read = async id => (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    const first = await read(learner); assert.equal(hasCurrentAgeEligibility(first), true); assert.equal(first.student_id, null);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE subject_discord_user_id=$1', [learner])).rows[0].count, 1);
    await service.submitEnrollment(learner, input); assert.deepEqual((await read(learner)).age_eligibility_confirmed_at, first.age_eligibility_confirmed_at);
    await createCertificationSubmission(pool, config).submitEnrollment(legacy, input);
    const before = await read(legacy); assert.equal(hasCurrentAgeEligibility(before), false);
    await service.submitEnrollment(legacy, input); const after = await read(legacy); assert.equal(hasCurrentAgeEligibility(after), true);
    for (const key of ['acknowledgment_name', 'acknowledged_at', 'agreement_version', 'agreement_content_sha256', 'comprehension_check_version', 'learner_confirmed_read_at', 'comprehension_passed_at']) assert.deepEqual(after[key], before[key]);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='age_eligibility_confirmed'", [legacy])).rows[0].count, 1);
    await pool.query(`CREATE FUNCTION reject_age_test_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fixture audit failure'; END; $$; CREATE TRIGGER reject_age_test_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_age_test_audit();`);
    await assert.rejects(service.submitEnrollment(failing, input), /Fixture audit failure/); assert.equal(await read(failing), undefined);
  } finally {
    try { if (pool) await pool.end(); }
    finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } }
  }
});
