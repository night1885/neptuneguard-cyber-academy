import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationRouter } from './certification-router.js';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';
import { createAgeCheckedCertificationService } from './certification-age-approval.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567'; const guild = '1339276399390887956';
const ids = ['1223123544301633568', '1223123544301633569', '1223123544301633570', '1223123544301633571'];
function interaction(id, modal = false) {
  return { customId: id, user: { id: owner }, guildId: guild, deferred: false, replied: false, replies: [],
    isButton: () => !modal, isModalSubmit: () => modal, isStringSelectMenu: () => false, fields: { getTextInputValue: () => 'Synthetic contextual access review' },
    async deferReply(options) { this.deferred = true; this.options = options; }, async reply(payload) { this.replied = true; this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); }, async showModal(builder) { this.modal = builder.toJSON(); } };
}
const controls = payload => (payload.components || []).flatMap(row => row.toJSON().components);
test('contextual access routes transact in disposable PostgreSQL and preserve navigation and rollback boundaries', { skip: !databaseUrl, timeout: 60000 }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol)); assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 }); let pool; let created = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test'); await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` }); assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const content = 'Disposable contextual access fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
    const config = { enabled: true, enrollmentSubmissionEnabled: true, ownerId: owner, activeAgreementVersion: 'fixture-context', activeAgreementSha256: hash, comprehensionCheck: { version: 'fixture-check', correctAnswers: ['stop'] } };
    const input = { reportedAge: 16, typedName: 'Fixture Learner', confirmedRead: true, agreementVersion: 'fixture-context', agreementSha256: hash, comprehensionCheckVersion: 'fixture-check', answers: ['stop'] };
    await pool.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', ['fixture-context', content, hash]);
    const submission = createAgeCheckedCertificationSubmission(pool, config); const approval = createAgeCheckedCertificationService(pool, config); const route = createCertificationRouter(pool, config, guild);
    for (const id of ids) { await submission.submitEnrollment(id, input); if (id !== ids[0]) await approval.approveEnrollment(owner, id); }
    for (const id of ids.slice(1)) await pool.query("INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [randomUUID(), id]);
    const snapshot = async id => ({ enrollment: (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [id])).rows[0], labs: (await pool.query('SELECT * FROM certification_lab_requests WHERE discord_user_id=$1 ORDER BY request_id', [id])).rows, audit: (await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE subject_discord_user_id=$1', [id])).rows[0].count });
    async function issue(id, action, view = 'directory', page = 2) {
      const before = await snapshot(id); const record = interaction(`cert:students:detail:${id}:${view}:${page}`); await route(record);
      const actionId = `cert:access:${action}:${id}:${view}:${page}`; assert.ok(controls(record.replies[0]).some(c => c.custom_id === actionId));
      const open = interaction(actionId); await route(open); assert.equal(open.modal.custom_id, actionId);
      const reason = interaction(open.modal.custom_id, true); await route(reason); const buttons = controls(reason.replies[0]); assert.equal(reason.replies[0].flags, 64); assert.deepEqual(reason.replies[0].allowedMentions, { parse: [] }); assert.deepEqual(await snapshot(id), before);
      return { id, view, page, confirm: buttons[0].custom_id, cancel: buttons[1].custom_id };
    }
    function assertNavigation(payload, issued) { const buttons = controls(payload); assert.ok(buttons.some(c => c.custom_id === `cert:students:detail:${issued.id}:${issued.view}:${issued.page}`)); assert.ok(buttons.some(c => c.custom_id === `cert:console:${issued.view}:${issued.page}`)); assert.deepEqual(payload.allowedMentions, { parse: [] }); }
    async function confirm(issued) { const i = interaction(issued.confirm); await route(i); assert.equal(i.options.flags, 64); assertNavigation(i.replies[0], issued); return i; }
    const denied = await issue(ids[0], 'deny', 'enrollments', 1); await confirm(denied); assert.equal((await snapshot(ids[0])).enrollment.status, 'denied'); assert.equal((await snapshot(ids[0])).enrollment.student_id, null);
    const original = await snapshot(ids[1]); const canceled = await issue(ids[1], 'suspend'); const cancel = interaction(canceled.cancel); await route(cancel); assertNavigation(cancel.replies[0], canceled); assert.deepEqual(await snapshot(ids[1]), original);
    const canceledReplay = interaction(canceled.confirm); await route(canceledReplay); assert.match(canceledReplay.replies[0].content, /expired/); assert.deepEqual(await snapshot(ids[1]), original);
    const suspension = await issue(ids[1], 'suspend'); const stale = await issue(ids[1], 'suspend');
    const first = interaction(suspension.confirm); const replay = interaction(suspension.confirm); await Promise.all([route(first), route(replay)]); assertNavigation(first.replies[0], suspension); assert.match(replay.replies[0].content, /expired/);
    const suspended = await snapshot(ids[1]); assert.equal(suspended.enrollment.status, 'suspended'); assert.equal(suspended.audit, original.audit + 1); assert.ok(suspended.labs.every(lab => lab.status === 'revoked')); assert.match(first.replies[0].content, /lab provider/);
    await assert.rejects(route(interaction(stale.confirm)), /status does not permit/); assert.deepEqual(await snapshot(ids[1]), suspended); const staleReplay = interaction(stale.confirm); await route(staleReplay); assert.match(staleReplay.replies[0].content, /expired/);
    await confirm(await issue(ids[1], 'revoke', 'restricted', 3)); const revoked = await snapshot(ids[1]); assert.equal(revoked.enrollment.status, 'revoked');
    await confirm(await issue(ids[1], 'reinstate', 'restricted', 3)); const restored = await snapshot(ids[1]); assert.equal(restored.enrollment.status, 'approved'); assert.deepEqual(restored.labs, revoked.labs);
    for (const key of ['student_id', 'approved_by', 'approved_at', 'acknowledgment_name', 'acknowledged_at', 'agreement_version', 'agreement_content_sha256', 'comprehension_check_version', 'learner_confirmed_read_at', 'comprehension_passed_at', 'age_eligibility_confirmed', 'age_eligibility_confirmed_at', 'age_policy_version']) assert.deepEqual(restored.enrollment[key], original.enrollment[key]);
    await confirm(await issue(ids[3], 'revoke')); await pool.query('UPDATE certification_enrollments SET age_eligibility_confirmed=false,age_eligibility_confirmed_at=NULL,age_policy_version=NULL WHERE discord_user_id=$1', [ids[3]]);
    const missing = await snapshot(ids[3]); const reinstate = await issue(ids[3], 'reinstate', 'restricted', 0); await assert.rejects(route(interaction(reinstate.confirm)), /age eligibility/); assert.deepEqual(await snapshot(ids[3]), missing);
    await pool.query(`CREATE FUNCTION reject_context_fixture_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='enrollment_revoke' AND NEW.subject_discord_user_id='${ids[2]}' THEN RAISE EXCEPTION 'Fixture contextual audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER reject_context_fixture_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_context_fixture_audit();`);
    const failingBefore = await snapshot(ids[2]); const failure = await issue(ids[2], 'revoke'); await assert.rejects(route(interaction(failure.confirm)), /Fixture contextual audit failure/); assert.deepEqual(await snapshot(ids[2]), failingBefore);
    const failureReplay = interaction(failure.confirm); await route(failureReplay); assert.match(failureReplay.replies[0].content, /expired/); assert.deepEqual(await snapshot(ids[2]), failingBefore);
  } finally { try { if (pool) await pool.end(); } finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } } }
});
