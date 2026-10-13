import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createAgeCheckedCertificationService } from './certification-age-approval.js';
import { createCertificationRouter } from './certification-router.js';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';
import { createCertificationSubmission } from './certification-submission.js';
import { CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';

const owner = '1223123544301633567'; const learner = '1223123544301633568'; const legacy = '1223123544301633569'; const guild = '1339276399390887956';
const config = { enabled: true, ownerId: owner };
const complete = { status: 'pending', agreement_version: 'fixture', signature_method: 'typed_name', acknowledgment_name: 'Fixture Learner', acknowledged_at: 'date', learner_confirmed_read_at: 'date', comprehension_passed_at: 'date', age_eligibility_confirmed: true, age_eligibility_confirmed_at: '2026-10-13T17:25:00Z', age_policy_version: CERTIFICATION_AGE_POLICY_VERSION };
function fixture(row = complete, failAudit = false) {
  const calls = []; const releases = []; let connections = 0;
  const query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT')) return { rows: row ? [row] : [] };
    if (failAudit && sql.includes('INSERT INTO certification_audit_events')) throw new Error('Fixture audit failure');
    return { rows: [] };
  };
  const pool = { query, async connect() { connections++; return { query, release(value) { releases.push(value); } }; } };
  return { pool, calls, releases, service: createAgeCheckedCertificationService(pool, config), get connections() { return connections; } };
}
function interaction(id, actor = owner) {
  return { customId: id, user: { id: actor }, guildId: guild, replies: [], notifications: [], isButton: () => true, isModalSubmit: () => false,
    async deferReply(options) { this.options = options; }, async editReply(payload) { this.replies.push(payload); },
    client: { users: { async fetch() { return { async send() { throw new Error('No actual transport in fixture'); } }; } } } };
}
test('missing, false, wrong-policy, or malformed age evidence blocks pending approval before mutation', async () => {
  for (const change of [{ age_eligibility_confirmed: null }, { age_eligibility_confirmed: false }, { age_policy_version: 'old' }, { age_eligibility_confirmed_at: null }, { age_eligibility_confirmed_at: 'bad' }]) {
    const f = fixture({ ...complete, ...change }); await assert.rejects(f.service.approveEnrollment(owner, learner), /age eligibility/);
    assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.includes('INSERT INTO certification_audit_events') || c.sql === 'COMMIT'));
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});
test('current evidence permits owner approval and records only the policy/method', async () => {
  const f = fixture(); const result = await f.service.approveEnrollment(owner, learner); assert.match(result.studentId, /^NG-PT-/);
  const audit = JSON.parse(f.calls.find(c => c.sql.includes('INSERT INTO certification_audit_events')).params[2]);
  assert.equal(audit.agePolicyVersion, CERTIFICATION_AGE_POLICY_VERSION); assert.equal(audit.ageEligibilityMethod, 'self_report');
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
});
test('non-owner cannot checkout; audit failure rolls back eligible approval', async () => {
  const denied = fixture(); await assert.rejects(denied.service.approveEnrollment(learner, learner), /Owner/); assert.equal(denied.connections, 0);
  const failing = fixture(complete, true); await assert.rejects(failing.service.approveEnrollment(owner, learner), /audit failure/);
  assert.equal(failing.calls.at(-1).sql, 'ROLLBACK'); assert.ok(!failing.calls.some(c => c.sql === 'COMMIT'));
});
test('existing approved record remains idempotent without creating new evidence or ID', async () => {
  const f = fixture({ status: 'approved', student_id: 'NG-PT-existing' });
  assert.deepEqual(await f.service.approveEnrollment(owner, learner), { studentId: 'NG-PT-existing', alreadyApproved: true });
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE') || c.sql.includes('INSERT INTO certification_audit_events')));
});
test('private routed owner review labels self-report and disables approval when evidence is absent', async () => {
  for (const present of [false, true]) {
    const f = fixture({ ...complete, age_eligibility_confirmed: present ? true : null });
    const i = interaction(`cert:enrollment:review:${learner}`); await createCertificationRouter(f.pool, config, guild)(i);
    assert.equal(i.options.flags, 64); assert.deepEqual(i.replies[0].allowedMentions, { parse: [] });
    assert.match(i.replies[0].embeds[0].data.description, /self-reported 16\+/);
    assert.equal(i.replies[0].components[0].components[0].data.disabled, !present); assert.equal(f.connections, 0);
  }
});
test('routed direct approval cannot bypass missing eligibility evidence', async () => {
  const f = fixture({ ...complete, age_eligibility_confirmed: null });
  await assert.rejects(createCertificationRouter(f.pool, config, guild)(interaction(`cert:enrollment:approve:${learner}`)), /age eligibility/);
  assert.ok(!f.calls.some(c => c.sql.startsWith('UPDATE')));
});

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
test('real PostgreSQL fresh approval rejects legacy pending evidence and accepts the current writer', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'Owner age approval fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
    const settings = { ...config, enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
    const input = { typedName: 'Fixture Learner', confirmedRead: true, reportedAge: 16, agreementVersion: 'fixture', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture', content, hash]);
    await createCertificationSubmission(pool, settings).submitEnrollment(legacy, input);
    const service = createAgeCheckedCertificationService(pool, settings);
    await assert.rejects(service.approveEnrollment(owner, legacy), /age eligibility/);
    const old = (await pool.query('SELECT status, student_id FROM certification_enrollments WHERE discord_user_id=$1', [legacy])).rows[0];
    assert.deepEqual(old, { status: 'pending', student_id: null });
    await createAgeCheckedCertificationSubmission(pool, settings).submitEnrollment(learner, input);
    const results = await Promise.all([service.approveEnrollment(owner, learner), service.approveEnrollment(owner, learner)]);
    assert.equal(results[0].studentId, results[1].studentId); assert.deepEqual(results.map(r => r.alreadyApproved).sort(), [false, true]);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='enrollment_approved'", [learner])).rows[0].count, 1);
  } finally {
    try { if (pool) await pool.end(); } finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } }
  }
});
