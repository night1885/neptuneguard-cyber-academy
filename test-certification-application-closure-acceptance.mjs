import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createRestorationRouter } from './certification-restoration-router.js';
import { createCertificationSubmission } from './certification-submission.js';
import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const roleDdl = process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
const owner = '1223123544301633567', student = '1223123544301633568', guildId = '1339276399390887957';
const content = 'Disposable combined closure acceptance fixture, not a production agreement.';
const hash = createHash('sha256').update(content).digest('hex');
const manifest = { agreementVersion: 'closure-acceptance-fixture', agreementSha256: hash, comprehensionCheck: { version: 'closure-acceptance-check', questions: [{ prompt: 'Fixture only: type stop.' }], correctAnswers: ['stop'] } };
const config = { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: true, activeAgreementVersion: manifest.agreementVersion, activeAgreementSha256: hash, comprehensionCheck: manifest.comprehensionCheck };
const input = { ageEligibility: 'yes', acknowledgmentAccepted: true, confirmedRead: true, agreementVersion: manifest.agreementVersion, agreementSha256: hash, comprehensionCheckVersion: manifest.comprehensionCheck.version, answers: ['stop'] };
const tick = () => new Promise(resolve => setImmediate(resolve));
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function buttonId(payload, prefix) {
  const id = (payload.components || []).flatMap(row => json(row).components).find(component => component.custom_id?.startsWith(prefix))?.custom_id;
  assert.ok(id, `Expected ${prefix} control`); return id;
}
async function waitFor(predicate) {
  const until = Date.now() + 5000;
  while (!predicate()) { if (Date.now() >= until) throw new Error('Acceptance fixture did not reach expected state'); await new Promise(resolve => setTimeout(resolve, 10)); }
}
async function send(client, customId, actor = owner, server = guildId) {
  let finish; const done = new Promise(resolve => { finish = resolve; });
  const i = { customId, guildId: server, user: { id: actor }, deferred: false, replied: false,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; finish(payload); },
    async editReply(payload) { assert.equal(this.deferred || this.replied, true); finish(payload); } };
  let timer;
  try {
    client.emit('interactionCreate', i);
    const payload = await Promise.race([done, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Acceptance fixture reply timeout')), 5000); })]);
    assert.deepEqual(payload.allowedMentions, { parse: [] }); return payload;
  } finally { clearTimeout(timer); }
}
async function row(admin) { return (await admin.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0]; }
async function history(admin) { return (await admin.query('SELECT action,created_at FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY event_id', [student])).rows; }

async function isolated(operation, { migration = true, enabled = true } = {}) {
  const suffix = randomUUID().replaceAll('-', ''), schema = `cert_close_accept_${suffix}`, role = `cert_close_accept_role_${suffix}`;
  const password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let worker, runtime, schemaCreated = false, roleCreated = false, workerEnded = false, closureReleases = 0, guildLookups = 0;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql', ...(migration ? ['006-application-closure-metadata.sql'] : [])]) {
      await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    }
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)', [manifest.agreementVersion, content, hash]);
    await createCertificationSubmission(admin, config).submitEnrollment(student, input);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT UPDATE (version) ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT,UPDATE ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT SELECT,UPDATE ON certification_lab_requests TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT ON certification_audit_events TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const workerUrl = new URL(databaseUrl); workerUrl.username = role; workerUrl.password = password;
    worker = new pg.Pool({ connectionString: workerUrl.href, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=3000` });
    assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0], { current: role, session: role });
    assert.equal((await worker.query('SHOW search_path')).rows[0].search_path, schema);
    const owned = { query: (...args) => worker.query(...args), async connect() {
      const client = await worker.connect(); return { query: (...args) => client.query(...args), release(discard) { closureReleases++; client.release(discard); } };
    }, async end() { assert.equal(workerEnded, false); workerEnded = true; await worker.end(); } };
    const client = new EventEmitter(), everyone = {}, me = {}; client.isReady = () => false;
    client.guilds = { async fetch(id) { assert.equal(id, guildId); guildLookups++; return { roles: { everyone }, members: { async fetch(id) { assert.equal(id, owner); return {}; }, async fetchMe() { return me; } } }; } };
    client.channels = { async fetch() { return { guildId, isTextBased: () => true, async send() { assert.fail('No live or simulated channel publication permitted'); }, permissionsFor(member) { return { has: () => member !== everyone }; } }; } };
    const environment = { CERTIFICATION_ENABLED: 'true', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: '1339276399390887956',
      CERTIFICATION_DATABASE_URL: workerUrl.href, CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify(manifest),
      ...(enabled ? { CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'true' } : {}) };
    runtime = attachCertificationRuntime(client, {}, guildId, environment, { createPool: () => owned, createRouter: createRestorationRouter });
    client.emit('clientReady');
    await operation({ admin, worker, runtime, client, get closureReleases() { return closureReleases; }, get guildLookups() { return guildLookups; } });
  } finally {
    try { if (runtime) await runtime.detach(); }
    finally {
      try { if (worker && !workerEnded) await worker.end(); }
      finally {
        try { if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
        finally {
          try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
          finally { await admin.end(); }
        }
      }
    }
  }
}

test('combined simulated-Discord and PostgreSQL closure acceptance', { skip: !databaseUrl || !roleDdl }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback test databases permitted');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');

  await t.test('real runtime, gate, UI and transaction support cancel, bound confirmation and replay rejection', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready);
    const before = await row(f.admin); assert.equal((await history(f.admin)).length, 1);
    const detail = await send(f.client, `cert:students:detail:${student}`);
    const open = await send(f.client, buttonId(detail, 'cert:closure:open:'));
    const choose = buttonId(open, 'cert:closure:choose:withdrawn:');
    const canceled = await send(f.client, choose), oldToken = buttonId(canceled, 'cert:closure:confirm:');
    await send(f.client, buttonId(canceled, 'cert:closure:cancel:'));
    assert.match((await send(f.client, oldToken)).content, /already used/);
    assert.deepEqual(await row(f.admin), before); assert.equal((await history(f.admin)).length, 1);
    const preview = await send(f.client, choose), token = buttonId(preview, 'cert:closure:confirm:');
    assert.match(preview.content, new RegExp(student)); assert.match(preview.content, /Category: withdrawn/);
    assert.match((await send(f.client, token, student)).content, /Owner authorization/);
    assert.match((await send(f.client, token, owner, '1339276399390887958')).content, /Owner authorization/);
    assert.deepEqual(await row(f.admin), before);
    const result = await send(f.client, token); assert.match(result.content, /closed as withdrawn/); assert.match(result.content, /No record was deleted/);
    const closed = await row(f.admin), events = await history(f.admin);
    assert.equal(closed.status, 'denied'); assert.equal(closed.student_id, null); assert.equal(closed.application_closed_as, 'withdrawn');
    assert.equal(closed.application_closed_by, owner);
    assert.ok(result.content.includes(applicationDeletionEligibleAt(closed.application_closed_at).toISOString()));
    assert.deepEqual(events.map(event => event.action), ['enrollment_submitted', 'application_closed']);
    assert.equal(events[1].created_at.toISOString(), closed.application_closed_at.toISOString());
    assert.equal(closed.acknowledged_at.toISOString(), before.acknowledged_at.toISOString());
    assert.match((await send(f.client, token)).content, /already used/); assert.equal((await history(f.admin)).length, 2);
    assert.equal(await f.runtime.getCourseAuthorization(student), null);
    assert.match((await send(f.client, 'cert:lesson:training-readiness:0', student)).content, /Section login is required/);
    await assert.rejects(f.worker.query('DELETE FROM certification_enrollments'), error => error.code === '42501');
    await assert.rejects(f.worker.query('DELETE FROM certification_audit_events'), error => error.code === '42501');
    assert.equal((await f.admin.query('SELECT count(*)::int AS n FROM certification_enrollments')).rows[0].n, 1);
  }));

  await t.test('missing closure migration keeps actual runtime unavailable before Discord lookups', async () => isolated(async f => {
    const before = await row(f.admin);
    await waitFor(() => f.closureReleases > 0); await tick();
    assert.equal(f.runtime.ready, false); assert.equal(f.guildLookups, 0);
    assert.match((await send(f.client, `cert:closure:open:${student}`)).content, /unavailable/);
    assert.deepEqual(await row(f.admin), before); assert.equal((await history(f.admin)).length, 1);
  }, { migration: false }));

  await t.test('default-off runtime starts without closure migration and adds no closure entry', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready);
    const detail = await send(f.client, `cert:students:detail:${student}`);
    assert.ok(!(detail.components || []).flatMap(row => json(row).components).some(component => component.custom_id?.startsWith('cert:closure:')));
    assert.equal(f.closureReleases, 0); assert.equal((await history(f.admin)).length, 1);
  }, { migration: false, enabled: false }));

  await t.test('audit failure rolls back confirmed closure; a fresh confirmation can retry', async () => isolated(async f => {
    await waitFor(() => f.runtime.ready);
    await f.admin.query(`CREATE FUNCTION fail_acceptance_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Private injected audit failure'; END; $$;
      CREATE TRIGGER fail_acceptance_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION fail_acceptance_audit();`);
    const before = await row(f.admin);
    const preview = await send(f.client, `cert:closure:choose:abandoned:${student}`), token = buttonId(preview, 'cert:closure:confirm:');
    const failed = await send(f.client, token); assert.match(failed.content, /Review the current application/); assert.ok(!failed.content.includes('Private injected'));
    assert.deepEqual(await row(f.admin), before); assert.equal((await history(f.admin)).length, 1);
    assert.match((await send(f.client, token)).content, /already used/);
    await f.admin.query('DROP TRIGGER fail_acceptance_audit ON certification_audit_events');
    const retry = await send(f.client, `cert:closure:choose:abandoned:${student}`);
    assert.match((await send(f.client, buttonId(retry, 'cert:closure:confirm:'))).content, /closed as abandoned/);
    assert.equal((await row(f.admin)).application_closed_as, 'abandoned'); assert.equal((await history(f.admin)).length, 2);
  }));
});
