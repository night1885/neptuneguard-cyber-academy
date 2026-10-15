import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationLabManagement } from './certification-lab-management.js';
import { handleConsoleBrowser } from './certification-console-browser.js';
import { createCertificationRouter } from './certification-admin-router.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const optedIn = process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL === 'true';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner };
const migrations = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];
async function isolated(operation) {
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `lab_test_${randomUUID().replaceAll('-', '')}`;
  let created = false, pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 4, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of migrations) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query(`INSERT INTO certification_enrollments (discord_user_id, student_id, status) VALUES ($1,'NG-DISPOSABLE-ID','awaiting_acknowledgment')`, [student]);
    await operation(pool);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
}
async function seedLab(pool, status = 'pending') {
  const id = randomUUID();
  await pool.query(`INSERT INTO certification_lab_requests (request_id, discord_user_id, lab_key, status, rules_version, rules_acknowledged_at, starts_at, expires_at, approved_by, approved_at) VALUES ($1,$2,'disposable-lab',$3,'disposable-rules',NOW(),NOW(),NOW()+INTERVAL '1 hour',$4,NOW())`, [id, student, status, owner]);
  return id;
}
async function audits(pool, action) {
  return (await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events WHERE action=$1', [action])).rows[0].count;
}
async function lab(pool, id) { return (await pool.query('SELECT * FROM certification_lab_requests WHERE request_id=$1', [id])).rows[0]; }
function interaction(id) {
  const replies = [];
  return { replies, customId: id, user: { id: owner }, guildId: guild, isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); }, async editReply(payload) { replies.push(payload); }, async reply() { assert.fail('Valid read rejected'); } };
}
test('dedicated disposable PostgreSQL lab and console integration', { skip: !databaseUrl || !optedIn, timeout: 120000 }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback disposable test servers allowed');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  await t.test('concurrent denials commit one transition and one audit', async () => isolated(async pool => {
    const id = await seedLab(pool), service = createCertificationLabManagement(pool, config);
    const results = await Promise.all([service.changeLabStatus(owner, id, 'deny', 'Fixture reason'), service.changeLabStatus(owner, id, 'deny', 'Fixture reason')]);
    assert.deepEqual(results.map(result => result.alreadyApplied).sort(), [false, true]);
    assert.equal((await lab(pool, id)).status, 'denied'); assert.equal(await audits(pool, 'lab_request_denied'), 1);
  }));
  await t.test('revocation preserves enrollment and permanent student ID', async () => isolated(async pool => {
    const id = await seedLab(pool, 'approved');
    const before = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    const result = await createCertificationLabManagement(pool, config).changeLabStatus(owner, id, 'revoke', 'Fixture review');
    assert.equal(result.sessionTerminationRequired, true); assert.equal((await lab(pool, id)).status, 'revoked');
    const after = (await pool.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1', [student])).rows[0];
    assert.deepEqual(after, before); assert.equal(await audits(pool, 'lab_request_revoked'), 1);
    const details = (await pool.query('SELECT details FROM certification_audit_events WHERE action=$1', ['lab_request_revoked'])).rows[0].details;
    assert.equal(details.providerSessionTerminated, false);
  }));
  await t.test('audit failure rolls back lab status and reason', async () => isolated(async pool => {
    const id = await seedLab(pool), before = await lab(pool, id);
    await pool.query(`CREATE FUNCTION lab_test_reject_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected lab audit failure'; END; $$; CREATE TRIGGER lab_test_audit_failure BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION lab_test_reject_audit();`);
    await assert.rejects(createCertificationLabManagement(pool, config).changeLabStatus(owner, id, 'deny', 'Fixture reason'), /Injected lab audit failure/);
    assert.deepEqual(await lab(pool, id), before); assert.equal(await audits(pool, 'lab_request_denied'), 0);
  }));
  await t.test('invalid transition and missing request produce no audit', async () => isolated(async pool => {
    const id = await seedLab(pool, 'approved'), service = createCertificationLabManagement(pool, config);
    await assert.rejects(service.changeLabStatus(owner, id, 'deny', 'Fixture reason'), /does not permit/);
    await assert.rejects(service.changeLabStatus(owner, randomUUID(), 'revoke', 'Fixture reason'), /not found/);
    assert.equal((await lab(pool, id)).status, 'approved'); assert.equal(await audits(pool, 'lab_request_denied'), 0);
  }));
  await t.test('reason text is stored as data rather than SQL', async () => isolated(async pool => {
    const id = await seedLab(pool), reason = "Owner's reason; DROP TABLE certification_lab_requests; --";
    await createCertificationLabManagement(pool, config).changeLabStatus(owner, id, 'deny', reason);
    assert.equal((await lab(pool, id)).status_reason, reason);
  }));
  await t.test('real overview SQL returns database aggregates', async () => isolated(async pool => {
    await seedLab(pool, 'approved'); const request = interaction('cert:admin:overview:0');
    await createCertificationRouter(pool, config, guild)(request);
    const text = JSON.stringify(request.replies[0].embeds[0].toJSON());
    assert.match(text, /Total: 1/); assert.match(text, /Within recorded time window: 1/);
  }));
  await t.test('student and audit browser SQL run against migrated schema', async () => isolated(async pool => {
    const id = await seedLab(pool); await createCertificationLabManagement(pool, config).changeLabStatus(owner, id, 'deny', 'Fixture reason');
    const students = interaction(`cert:dir:awaiting_acknowledgment:0:${student}`);
    await handleConsoleBrowser(students, pool, config, guild); assert.equal(students.replies[0].embeds[0].fields.length, 1);
    const history = interaction('cert:audit:0'); await handleConsoleBrowser(history, pool, config, guild);
    assert.equal(history.replies[0].embeds[0].fields.length, 1);
    assert.match(history.replies[0].embeds[0].fields[0].name, /lab.request.denied/);
  }));
});
