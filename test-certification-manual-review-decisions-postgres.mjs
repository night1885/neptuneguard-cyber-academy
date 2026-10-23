import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { createManualReviewDecisionService } from './certification-manual-review-decisions.mjs';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const enabled = process.env.CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DECISION_DDL === 'true';
const migrations = ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','008-lab-status-reason.sql','009-active-registration-provenance.sql','010-manual-review-enrollment.sql'];
const owner = '222222222222222222', guildId = '333333333333333333';
const context = { actorId: owner, actualGuildId: guildId };
const guide = 'PRIVATE_GUIDE_FIXTURE', response = 'PRIVATE_RESPONSE_FIXTURE';
const sqlState = error => typeof error?.code === 'string' && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : 'unknown';

test('owner decisions use real row locks, atomic audits, and restricted disposable PostgreSQL credentials',
  { skip: !databaseUrl || !enabled, timeout: 120000 }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test');
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
  const name = `cert_dec_${randomUUID().replaceAll('-', '')}`;
  const role = `cert_dec_${randomUUID().replaceAll('-', '')}`, password = randomUUID();
  assert.match(name, /^cert_dec_[a-f0-9]{32}$/);
  assert.match(role, /^cert_dec_[a-f0-9]{32}$/);
  const errors = [];
  let phase = 'setup', created = false, roleCreated = false, db, app;
  const pool = (connectionString, label, max = 1) => {
    const value = new pg.Pool({ connectionString, max, connectionTimeoutMillis: 5000,
      options: '-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000' });
    value.on('error', error => errors.push({ pool: label, phase, code: sqlState(error) }));
    return value;
  };
  t.after(() => assert.deepEqual(errors, [], 'Unexpected fixture pool or cleanup errors'));
  const admin = pool(databaseUrl, 'admin');
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    phase = 'database-create';
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
    created = true;
    url.pathname = `/${name}`;
    db = pool(url.href, 'setup');
    for (const file of migrations) {
      phase = `migration:${file}`;
      await db.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    phase = 'restricted-role';
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    roleCreated = true;
    await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await db.query(`GRANT CONNECT ON DATABASE "${name}" TO "${role}"`);
    await db.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await db.query(`GRANT SELECT ON public.certification_enrollments, public.certification_agreements TO "${role}"`);
    await db.query(`GRANT UPDATE(status,student_id,approved_by,approved_at,status_reason,updated_at) ON public.certification_enrollments TO "${role}"`);
    await db.query(`GRANT UPDATE(version) ON public.certification_agreements TO "${role}"`);
    const auditGrant = `INSERT(actor_discord_user_id,subject_discord_user_id,action,details) ON public.certification_audit_events`;
    await db.query(`GRANT ${auditGrant} TO "${role}"`);
    await db.query(`GRANT USAGE ON SEQUENCE public.certification_audit_events_event_id_seq TO "${role}"`);
    const applicationUrl = new URL(url);
    applicationUrl.username = role;
    applicationUrl.password = password;
    app = pool(applicationUrl.href, 'app', 2);
    const content = 'Disposable decision acceptance agreement.';
    const hash = createHash('sha256').update(content).digest('hex');
    await db.query('INSERT INTO public.certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)', ['dec-v1', content, hash]);
    const config = { enabled: true, manualReviewEnabled: true, manualReviewDecisionsEnabled: true, ownerId: owner,
      activeAgreementVersion: 'dec-v1', activeAgreementSha256: hash,
      comprehensionCheck: { version: 'dec-check-v1', questions: [{ prompt: 'Synthetic decision question?' }], correctAnswers: [guide] } };
    let next = 111111111111111111n;
    const read = async id => (await db.query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1', [id])).rows[0];
    const audits = async id => (await db.query('SELECT actor_discord_user_id,action,details FROM public.certification_audit_events WHERE subject_discord_user_id=$1', [id])).rows;
    async function seed(studentId = null) {
      const id = String(next++), snapshot = createManualReviewSnapshot(config, [response]);
      await db.query(`INSERT INTO public.certification_enrollments(discord_user_id,student_id,status,signature_method,agreement_version,agreement_content_sha256,acknowledged_at,learner_confirmed_read_at,comprehension_check_version,comprehension_submitted_at,comprehension_review_snapshot,age_eligible,age_declared_at,age_declaration_version) VALUES($1,$2,'pending','discord_account','dec-v1',$3,NOW(),NOW(),'dec-check-v1',NOW(),$4::jsonb,true,NOW(),'adult-18-v1')`, [id, studentId, hash, JSON.stringify(snapshot)]);
      return read(id);
    }
    const service = () => createManualReviewDecisionService(app, config, { guildId });
    const prepare = (value, row, action = 'approve') => value.prepare({ ...context, record: row, action, reason: 'Owner reviewed application', reviewedResponses: true });
    const confirm = (value, row, issued, overrides = {}) => value.confirm({ ...context, studentDiscordId: row.discord_user_id, token: issued.token, ...overrides });
    for (const action of ['approve', 'deny']) await t.test(`${action} persists one decision and audit without a comprehension pass`, async () => {
      phase = `decision:${action}`;
      const row = await seed(), value = service(), issued = prepare(value, row, action);
      const result = await confirm(value, row, issued), stored = await read(row.discord_user_id);
      assert.equal(stored.status, action === 'approve' ? 'approved' : 'denied');
      assert.equal(stored.student_id, result.studentId);
      if (action === 'approve') { assert.match(stored.student_id, /^NG-PT-[a-f0-9-]{36}$/); assert.equal(stored.approved_by, owner); assert.ok(stored.approved_at); }
      else { assert.equal(stored.student_id, null); assert.equal(stored.approved_by, null); assert.equal(stored.approved_at, null); }
      assert.equal(stored.comprehension_passed_at, null);
      assert.deepEqual(stored.comprehension_review_snapshot, row.comprehension_review_snapshot);
      const events = await audits(row.discord_user_id);
      assert.equal(events.length, 1);
      assert.equal(events[0].actor_discord_user_id, owner);
      assert.equal(events[0].details.reviewFingerprint, result.reviewFingerprint);
      assert.equal(events[0].details.ownerReviewedResponses, true);
      assert.ok(!JSON.stringify(events).includes(guide));
      assert.ok(!JSON.stringify(events).includes(response));
      await assert.rejects(confirm(value, row, issued));
      assert.equal((await audits(row.discord_user_id)).length, 1);
    });
    for (const action of ['approve', 'deny']) await t.test(`${action} preserves an issued permanent ID`, async () => {
      phase = `preserve-id:${action}`;
      const permanentId = `NG-PT-${randomUUID()}`, row = await seed(permanentId), value = service();
      await confirm(value, row, prepare(value, row, action));
      assert.equal((await read(row.discord_user_id)).student_id, permanentId);
    });
    await t.test('changed responses invalidate the reviewed confirmation', async () => {
      phase = 'stale-response';
      const row = await seed(), value = service(), issued = prepare(value, row);
      await db.query("UPDATE public.certification_enrollments SET comprehension_review_snapshot=jsonb_set(comprehension_review_snapshot,'{items,0,response}',to_jsonb($2::text)),updated_at=NOW() WHERE discord_user_id=$1", [row.discord_user_id, 'Changed fixture response']);
      const changed = await read(row.discord_user_id);
      assert.notDeepEqual(changed.comprehension_review_snapshot, row.comprehension_review_snapshot);
      await assert.rejects(confirm(value, row, issued));
      assert.deepEqual(await read(row.discord_user_id), changed);
      assert.equal((await audits(row.discord_user_id)).length, 0);
    });
    await t.test('missing audit privilege rolls back an otherwise valid approval', async () => {
      phase = 'audit-rollback';
      const row = await seed(), value = service(), issued = prepare(value, row);
      await db.query(`REVOKE ${auditGrant} FROM "${role}"`);
      try { await assert.rejects(confirm(value, row, issued), error => error.code === '42501'); }
      finally { await db.query(`GRANT ${auditGrant} TO "${role}"`); }
      assert.deepEqual(await read(row.discord_user_id), row);
      assert.equal((await audits(row.discord_user_id)).length, 0);
      await assert.rejects(confirm(value, row, issued));
    });
    await t.test('competing decisions commit exactly one status change and audit', async () => {
      phase = 'competing-decisions';
      const row = await seed(), first = service(), second = service();
      const approve = prepare(first, row, 'approve'), deny = prepare(second, row, 'deny');
      const outcomes = await Promise.allSettled([confirm(first, row, approve), confirm(second, row, deny)]);
      assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1);
      const winner = outcomes.find(result => result.status === 'fulfilled').value;
      const stored = await read(row.discord_user_id);
      assert.equal(stored.status, winner.status);
      assert.equal(stored.student_id, winner.studentId);
      assert.equal((await audits(row.discord_user_id)).length, 1);
      assert.deepEqual(stored.comprehension_review_snapshot, row.comprehension_review_snapshot);
      assert.equal(stored.comprehension_passed_at, null);
    });
    await t.test('unauthorized and canceled actions do not change stored state', async () => {
      phase = 'authorization-and-cancel';
      const row = await seed(), value = service(), issued = prepare(value, row);
      await assert.rejects(confirm(value, row, issued, { actorId: row.discord_user_id }));
      await assert.rejects(confirm(value, row, issued, { actualGuildId: '444444444444444444' }));
      assert.equal(value.cancel({ ...context, token: issued.token }), true);
      await assert.rejects(confirm(value, row, issued));
      assert.deepEqual(await read(row.discord_user_id), row);
      assert.equal((await audits(row.discord_user_id)).length, 0);
    });
    await t.test('decision role cannot rewrite responses or delete applications', async () => {
      phase = 'privilege-boundaries';
      const row = await seed();
      await assert.rejects(app.query('UPDATE public.certification_enrollments SET comprehension_review_snapshot=$2::jsonb WHERE discord_user_id=$1', [row.discord_user_id, JSON.stringify(row.comprehension_review_snapshot)]), error => error.code === '42501');
      await assert.rejects(app.query('DELETE FROM public.certification_enrollments WHERE discord_user_id=$1', [row.discord_user_id]), error => error.code === '42501');
      assert.deepEqual(await read(row.discord_user_id), row);
      for (const table of ['certification_lab_requests', 'certification_course_enrollments']) assert.equal(Number((await db.query(`SELECT COUNT(*) AS n FROM public.${table}`)).rows[0].n), 0);
    });
  } finally {
    const cleanup = async (label, operation) => {
      phase = `cleanup:${label}`;
      try { await operation(); return true; }
      catch (error) { errors.push({ pool: 'cleanup', phase, code: sqlState(error) }); return false; }
    };
    await cleanup('app', async () => { if (app) await app.end(); });
    await cleanup('setup', async () => { if (db) await db.end(); });
    let dropped = !created;
    if (created) dropped = await cleanup('database', () => admin.query(`DROP DATABASE "${name}"`));
    if (roleCreated && dropped) await cleanup('role', () => admin.query(`DROP ROLE "${role}"`));
    await cleanup('admin', () => admin.end());
  }
});
