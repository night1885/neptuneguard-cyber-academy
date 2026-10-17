import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createCourseRuntimeRouter } from './certification-course-runtime.js';
import { createRestorationRouter } from './certification-restoration-router.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';
import { studentCourseContentGaps } from './certification-student-course-content.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
const owner = '1223123544301633567', student = '1223123544301633568', stranger = '1223123544301633570';
const guildId = '1339276399390887957', verifiedRoleId = '1339276399390887959';
const [first, second] = COURSE_SECTION_KEYS;
const content = 'Disposable consolidated course acceptance fixture, not a production agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const manifest = { agreementVersion: 'combined-course-fixture', agreementSha256: hash, comprehensionCheck: { version: 'combined-course-check', questions: [{ prompt: 'Fixture only: type stop.' }], correctAnswers: ['stop'] } };
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: manifest.agreementVersion, activeAgreementSha256: hash, comprehensionCheck: manifest.comprehensionCheck };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: manifest.agreementVersion, agreementSha256: hash, comprehensionCheckVersion: manifest.comprehensionCheck.version, answers: ['stop'] };
const tick = () => new Promise(resolve => setImmediate(resolve));
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => (payload.components || []).flatMap(row => json(row).components.map(json));
function control(payload, prefix) { const id = controls(payload).find(item => item.custom_id?.startsWith(prefix))?.custom_id; assert.ok(id, `Expected ${prefix} control`); return id; }
function ending(payload, suffix) { const id = controls(payload).find(item => item.custom_id?.endsWith(suffix))?.custom_id; assert.ok(id, `Expected ${suffix} control`); return id; }
async function waitFor(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) { if (Date.now() >= deadline) throw new Error('Combined course fixture did not reach the expected state'); await new Promise(resolve => setTimeout(resolve, 10)); }
}
async function enrollment(f) { return (await f.admin.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0]; }
async function courses(f) { return (await f.admin.query('SELECT * FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key', [student])).rows; }
async function actions(f) { return (await f.admin.query('SELECT action FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY event_id', [student])).rows.map(row => row.action); }
async function countAction(f, action) { return (await actions(f)).filter(value => value === action).length; }

async function isolated(operation, { enabled = true, migration = true, approved = true, closure = false } = {}) {
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_course_accept_${suffix}`, role = `cert_course_accept_role_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, runtime, created = false, roleCreated = false, workerEnded = false, released = 0, lookups = 0;
  let clock = Date.now(), verified = true;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    assert.equal((await admin.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', '006-application-closure-metadata.sql', ...(migration ? ['007-course-enrollment-lifecycle.sql'] : [])]) {
      await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [manifest.agreementVersion, content, hash]);
    await createCertificationSubmission(admin, config).submitEnrollment(student, input);
    const approval = approved ? await createCertificationService(admin, config).approveEnrollment(owner, student) : null;
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT UPDATE (version) ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT,UPDATE ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT SELECT,UPDATE ON certification_lab_requests TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT ON certification_audit_events TO "${role}"`);
    if (migration) await admin.query(`GRANT SELECT,INSERT,UPDATE ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const url = new URL(databaseUrl); url.username = role; url.password = password;
    worker = new pg.Pool({ connectionString: url.href, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    const pool = { query: (...args) => worker.query(...args), async connect() { const client = await worker.connect();
      return { query: (...args) => client.query(...args), release(discard) { released++; client.release(discard); } }; },
      async end() { assert.equal(workerEnded, false); workerEnded = true; await worker.end(); } };
    const client = new EventEmitter(), everyone = {}, me = {}; client.isReady = () => false;
    const members = { async fetch(id) { return { id, roles: { cache: new Set(verified ? [verifiedRoleId] : []) } }; }, async fetchMe() { return me; } };
    const guild = { id: guildId, roles: { everyone }, members };
    client.guilds = { async fetch(id) { assert.equal(id, guildId); lookups++; return guild; } };
    client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('No channel publication'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
    const environment = { CERTIFICATION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: '1339276399390887956', VERIFIED_ROLE_ID: verifiedRoleId,
      CERTIFICATION_DATABASE_URL: url.href, CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(manifest),
      ...(enabled ? { CERTIFICATION_COURSES_ENABLED: 'true' } : {}), ...(closure ? { CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' } : {}) };
    runtime = attachCertificationRuntime(client, {}, guildId, environment, { createPool: () => pool, createRouter: createRestorationRouter,
      createCourseRouter(db, settings, server, options) { return createCourseRuntimeRouter(db, settings, server, { ...options, now: () => clock }); } });
    const f = { admin, worker, runtime, approval, schema, client, get released() { return released; }, get lookups() { return lookups; },
      advance(ms) { clock += ms; }, setVerified(value) { verified = value; },
      async send(id, { actor = owner, kind = 'button', values = [], studentId = approval?.studentId || 'NG-not-issued', reason = 'Disposable acceptance review', server = guildId } = {}) {
        let resolve, reject; const done = new Promise((yes, no) => { resolve = yes; reject = no; });
        function finish(payload, modal = false) {
          try { if (!modal) { assert.deepEqual(payload.allowedMentions, { parse: [] }); assert.ok((payload.components || []).length <= 5); } resolve(payload); }
          catch (error) { reject(error); throw error; }
        }
        const i = { customId: id, guildId: server, guild, user: { id: actor }, values: [...values], deferred: false, replied: false,
          isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'select',
          fields: { getTextInputValue: key => key === 'reason' ? reason : studentId },
          async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
          async showModal(modal) { this.replied = true; finish({ modal: modal.toJSON() }, true); },
          async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; finish(payload); },
          async editReply(payload) { assert.equal(this.deferred || this.replied, true); finish(payload); } };
        let timer;
        try { client.emit('interactionCreate', i);
          const result = await Promise.race([done, new Promise((yes, no) => { timer = setTimeout(() => no(new Error(`Acceptance reply timeout: ${id}`)), 5000); })]);
          await tick(); return result;
        } finally { clearTimeout(timer); }
      } };
    client.emit('clientReady'); await operation(f);
  } finally {
    try { if (runtime) await runtime.detach(); }
    finally {
      try { if (worker && !workerEnded) await worker.end(); }
      finally {
        try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
        finally {
          try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
          finally { await admin.end(); }
        }
      }
    }
  }
}
async function selectCourses(f, keys) { return f.send(`cert:courselife:assign:${student}`, { kind: 'select', values: keys }); }
async function assign(f, keys = [first, second]) { const preview = await selectCourses(f, keys); return f.send(control(preview, 'cert:courselife:confirm:')); }
async function complete(f, course) { const preview = await f.send(`cert:courselife:complete:${student}:${course}`); return f.send(control(preview, 'cert:courselife:confirm:')); }
async function enter(f, course, options = {}) { const opening = await f.send(`cert:course:open:${course}`, { actor: student });
  assert.ok(opening.modal); return f.send(opening.modal.custom_id, { actor: student, kind: 'modal', ...options }); }
async function suspend(f) { const opening = await f.send(`cert:access:suspend:${student}`); assert.ok(opening.modal);
  const preview = await f.send(opening.modal.custom_id, { kind: 'modal' }); return f.send(control(preview, 'cert:access:confirm:')); }
async function failAudit(f) { await f.admin.query(`CREATE OR REPLACE FUNCTION fail_combined_course_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'Private injected course audit failure'; END; $$;
  CREATE TRIGGER fail_combined_course_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION fail_combined_course_audit();`); }
const restoreAudit = f => f.admin.query('DROP TRIGGER fail_combined_course_audit ON certification_audit_events');

 test('consolidated course runtime acceptance with simulated Discord and restricted PostgreSQL', { skip: !databaseUrl || !roleDdl }, async t => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test databases permitted');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  t.diagnostic(`Curriculum content-gap report for release review: ${JSON.stringify(studentCourseContentGaps())}`);

  await t.test('owner assignment through student learning and independent/all-course completion preserves shared records', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready); const before = await enrollment(f);
    const detail = await f.send(`cert:students:detail:${student}`);
    const panel = await f.send(control(detail, 'cert:courselife:open:'));
    assert.ok(controls(panel).some(item => item.type === 3));
    const canceled = await selectCourses(f, [first, second]), canceledId = control(canceled, 'cert:courselife:confirm:');
    await f.send(control(canceled, 'cert:courselife:cancel:'));
    assert.match((await f.send(canceledId)).content, /already used/); assert.deepEqual(await courses(f), []);
    const preview = await selectCourses(f, [first, second]), token = control(preview, 'cert:courselife:confirm:');
    assert.ok(preview.content.includes(student) && preview.content.includes(first) && preview.content.includes(second));
    assert.match((await f.send(token, { actor: student })).content, /Owner authorization/);
    assert.match((await f.send(token, { server: stranger })).content, /Owner authorization/);
    assert.deepEqual(await courses(f), []);
    await f.send(token); await f.send(token); assert.equal(await countAction(f, 'courses_assigned'), 1); assert.equal((await courses(f)).length, 2);
    const home = await f.send('cert:initial:home', { actor: student });
    const catalog = await f.send(control(home, 'cert:course:catalog:'), { actor: student });
    assert.match(catalog.embeds[0].description, /listing does not grant access/);
    const a = await enter(f, first), b = await enter(f, second); assert.ok(a.embeds.length && b.embeds.length);
    const aPage = ending(a, ':module:0:0'), bPage = control(b, 'cert:course:page:');
    const historyBeforeViews = await actions(f);
    const module = await f.send(aPage, { actor: student });
    for (const kind of ['lesson', 'lab', 'hint']) { const view = await f.send(ending(module, `:${kind}:0:0`), { actor: student }); assert.ok(view.embeds.length); }
    const quiz = await f.send(ending(module, ':quiz:0:0'), { actor: student });
    assert.ok(!JSON.stringify(quiz).includes('"correct"'));
    const answer = await f.send(ending(quiz, ':answer:0:0:b'), { actor: student }); assert.match(answer.embeds[0].description, /Correct for this practice question/);
    assert.deepEqual(await actions(f), historyBeforeViews); assert.ok((await courses(f)).every(course => course.status === 'active'));
    const one = await complete(f, first); assert.match(one.content, /Active courses: 1/); assert.match(one.content, /All assigned courses complete: No/);
    assert.match((await f.send(aPage, { actor: student })).content, /no longer authorized/);
    assert.ok((await f.send(bPage, { actor: student })).embeds.length);
    const all = await complete(f, second); assert.match(all.content, /All assigned courses complete: Yes/); assert.match(all.content, /not deletion authorization/);
    assert.match((await f.send(bPage, { actor: student })).content, /no longer authorized/);
    assert.ok((await courses(f)).every(course => course.status === 'completed'));
    assert.equal(await countAction(f, 'course_completed'), 2);
    const after = await enrollment(f); assert.equal(after.status, 'approved'); assert.equal(after.student_id, before.student_id);
    assert.equal(after.acknowledged_at.toISOString(), before.acknowledged_at.toISOString());
    assert.equal((await f.runtime.getCourseAuthorization(student)).student_id, before.student_id);
    const legacy = (await f.admin.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema=$1 AND table_name IN ('learner_profiles','learner_module_progress','learner_badges')", [f.schema])).rows[0].n; assert.equal(legacy, 0);
    for (const table of ['certification_enrollments', 'certification_course_enrollments', 'certification_audit_events']) await assert.rejects(f.worker.query(`DELETE FROM ${table}`), error => error.code === '42501');
  }));

  await t.test('approved enrollment without assignments and a wrong ID do not grant course teaching access', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready);
    assert.match((await enter(f, first)).content, /could not be verified/); assert.deepEqual(await courses(f), []);
    await assign(f, [first]); assert.match((await enter(f, first, { studentId: 'NG-wrong-id' })).content, /could not be verified/);
    assert.equal(await countAction(f, 'course_completed'), 0);
  }));

  await t.test('assignment/completion audit failures roll back and fresh confirmations can retry', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready); await failAudit(f);
    const preview = await selectCourses(f, [first, second]), id = control(preview, 'cert:courselife:confirm:');
    const failed = await f.send(id); assert.match(failed.content, /Review the current/); assert.ok(!failed.content.includes('Private injected'));
    assert.deepEqual(await courses(f), []); assert.equal(await countAction(f, 'courses_assigned'), 0);
    assert.match((await f.send(id)).content, /already used/); await restoreAudit(f); await assign(f);
    const entered = await enter(f, first), page = control(entered, 'cert:course:page:'); await failAudit(f);
    const completion = await f.send(`cert:courselife:complete:${student}:${first}`), completionId = control(completion, 'cert:courselife:confirm:');
    assert.match((await f.send(completionId)).content, /Review the current/); assert.ok((await courses(f)).every(course => course.status === 'active'));
    assert.equal(await countAction(f, 'course_completed'), 0); assert.ok((await f.send(page, { actor: student })).embeds.length);
    await restoreAudit(f); await complete(f, first); assert.equal(await countAction(f, 'course_completed'), 1);
  }));

  await t.test('a stale assignment confirmation cannot bypass suspension and administrative completion does not reinstate', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready); await assign(f, [first]);
    const entered = await enter(f, first), page = control(entered, 'cert:course:page:');
    const pending = await selectCourses(f, [second]), id = control(pending, 'cert:courselife:confirm:');
    await suspend(f); assert.equal((await enrollment(f)).status, 'suspended');
    assert.match((await f.send(id)).content, /Review the current/); assert.equal((await courses(f)).length, 1);
    assert.match((await f.send(page, { actor: student })).content, /no longer authorized/);
    await complete(f, first); assert.equal((await enrollment(f)).status, 'suspended'); assert.equal(await countAction(f, 'course_completed'), 1);
    assert.equal((await enrollment(f)).student_id, f.approval.studentId);
  }));

  await t.test('account isolation, Verified-role withdrawal, ID challenges and expiry protect sessions and confirmations', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready);
    const expires = await selectCourses(f, [first]), id = control(expires, 'cert:courselife:confirm:'); f.advance(300000);
    assert.match((await f.send(id)).content, /expired/); assert.deepEqual(await courses(f), []);
    await assign(f); const entered = await enter(f, first), page = control(entered, 'cert:course:page:');
    assert.match((await f.send(page, { actor: stranger })).content, /unavailable/); assert.ok((await f.send(page, { actor: student })).embeds.length);
    f.setVerified(false); assert.match((await f.send(page, { actor: student })).content, /unavailable/); f.setVerified(true);
    const fresh = await enter(f, first), freshPage = control(fresh, 'cert:course:page:'); f.advance(300000);
    assert.match((await f.send(freshPage, { actor: student })).content, /expired/);
    assert.equal(await countAction(f, 'course_completed'), 0);
  }));

  await t.test('missing migration blocks enabled startup while default-off preserves the base runtime', async () => {
    await isolated(async f => { await waitFor(() => f.released > 0); await tick(); assert.equal(f.runtime.ready, false); assert.equal(f.lookups, 0);
      assert.match((await f.send('cert:course:catalog:0', { actor: student })).content, /unavailable/); }, { migration: false });
    await isolated(async f => { await waitFor(() => f.runtime.ready); const panel = await f.send('cert:initial:home', { actor: student });
      assert.ok(!controls(panel).some(item => item.custom_id?.startsWith('cert:course:'))); assert.equal(f.released, 0); }, { migration: false, enabled: false });
  });

  await t.test('course and closure controls coexist for a pending application without granting IDs or course assignments', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready); const detail = await f.send(`cert:students:detail:${student}`);
    const coursePanel = await f.send(control(detail, 'cert:courselife:open:'));
    assert.ok(!controls(coursePanel).some(item => item.type === 3));
    const forged = await selectCourses(f, [first]); assert.match(forged.content, /could not be confirmed/); assert.deepEqual(await courses(f), []);
    const closurePanel = await f.send(control(detail, 'cert:closure:open:'));
    const choice = await f.send(control(closurePanel, 'cert:closure:choose:withdrawn:'));
    await f.send(control(choice, 'cert:closure:confirm:'));
    const record = await enrollment(f); assert.equal(record.status, 'denied'); assert.equal(record.application_closed_as, 'withdrawn'); assert.equal(record.student_id, null);
    assert.deepEqual(await courses(f), []); assert.equal(await countAction(f, 'course_completed'), 0);
  }, { approved: false, closure: true }));
});
