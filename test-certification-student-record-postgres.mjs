import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationRouter } from './certification-admin-router.js';
const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const optedIn = process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL === 'true';
const owner = '1223123544301633567', student = '1223123544301633568', other = '1223123544301633569', guild = '1330353166830665859';
const migrations = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];
async function isolated(operation) {
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `student_test_${randomUUID().replaceAll('-', '')}`;
  let created = false, pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of migrations) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query(`INSERT INTO certification_enrollments (discord_user_id, student_id, status) VALUES ($1,'NG-STUDENT-FIXTURE','awaiting_acknowledgment'),($2,'NG-OTHER-FIXTURE','awaiting_acknowledgment')`, [student, other]);
    await operation(pool);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
}
async function renderReadOnly(pool, customId) {
  const db = await pool.connect(), replies = [];
  try {
    await db.query('BEGIN READ ONLY');
    await createCertificationRouter({ query: db.query.bind(db), connect() { assert.fail('Inspection attempted a mutation transaction'); } }, { enabled: true, ownerId: owner }, guild)({
      customId, user: { id: owner }, guildId: guild, isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
      async deferReply(payload) { assert.equal(payload.flags, 64); }, async reply() { assert.fail('Valid owner inspection rejected'); }, async editReply(payload) { replies.push(payload); }
    });
    assert.equal(replies.length, 1); assert.deepEqual(replies[0].allowedMentions, { parse: [] });
    return replies[0];
  } finally { try { await db.query('ROLLBACK'); } finally { db.release(); } }
}
async function seedLab(pool, subject, status, start, expiry) {
  await pool.query(`INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,status,rules_version,rules_acknowledged_at,starts_at,expires_at,approved_by,approved_at) VALUES ($1,$2,'disposable-lab',$3,'fixture-rules',NOW(),NOW()+$4::int*INTERVAL '1 minute',NOW()+$5::int*INTERVAL '1 minute',CASE WHEN $3::text='approved' THEN $6::text END,NOW())`, [randomUUID(), subject, status, start, expiry, owner]);
}
test('dedicated disposable PostgreSQL student-record integration', { skip: !databaseUrl || !optedIn, timeout: 120000 }, async t => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback disposable test servers allowed');
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  await t.test('student totals isolate the subject and distinguish future, current and elapsed approvals', async () => isolated(async pool => {
    for (const [status, start, expiry] of [['pending',null,null],['approved',-30,30],['approved',-120,-60],['approved',60,120],['revoked',-30,30],['expired',-120,-60]]) await seedLab(pool, student, status, start, expiry);
    await seedLab(pool, other, 'approved', -30, 30);
    const before = (await pool.query('SELECT * FROM certification_enrollments ORDER BY discord_user_id')).rows;
    const payload = await renderReadOnly(pool, `cert:students:detail:${student}`);
    const summary = payload.embeds[0].toJSON().fields.find(field => field.name === 'This student — lab authorization records').value;
    for (const text of ['Total requests: 6','Pending: 1','Approved records: 3','Within recorded time window: 1','Approved but elapsed: 1','Revoked: 1','Stored expired status: 1','not running sessions']) assert.ok(summary.includes(text), text);
    const controls = payload.components.flatMap(row => row.toJSON().components);
    assert.ok(controls.some(control => control.custom_id === `cert:labview:student:${student}:all:0`));
    assert.ok(!JSON.stringify(payload).includes(other));
    assert.deepEqual((await pool.query('SELECT * FROM certification_enrollments ORDER BY discord_user_id')).rows, before);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 0);
  }));
  await t.test('student with no requests displays zero totals under a read-only transaction', async () => isolated(async pool => {
    const payload = await renderReadOnly(pool, `cert:students:detail:${student}`);
    const value = payload.embeds[0].toJSON().fields.at(-1).value;
    for (const text of ['Total requests: 0','Approved records: 0','Within recorded time window: 0','Approved but elapsed: 0']) assert.ok(value.includes(text));
    const shortcut = payload.components.flatMap(row => row.toJSON().components).find(control => control.custom_id === `cert:labview:student:${student}:all:0`);
    assert.ok(shortcut);
    const labs = await renderReadOnly(pool, shortcut.custom_id);
    assert.equal(labs.embeds[0].fields.length, 0);
  }));
  await t.test('audit pages preserve database ordering, exclude another subject and omit private details', async () => isolated(async pool => {
    await pool.query(`INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action,details) SELECT $1,$2,'lab_request_denied',$3::jsonb FROM generate_series(1,7)`, [owner,student,JSON.stringify({ secret: 'DO-NOT-RENDER-DETAILS' })]);
    await pool.query(`INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action) VALUES ($1,$2,'OTHER-LEARNER-SENTINEL')`, [owner,other]);
    const expected = (await pool.query('SELECT event_id FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY created_at DESC,event_id DESC', [student])).rows;
    for (const page of [0,1]) {
      const payload = await renderReadOnly(pool, `cert:student-audit:${student}:${page}`);
      const fields = payload.embeds[0].toJSON().fields;
      assert.deepEqual(fields.map(field => field.name), expected.slice(page*5,page*5+5).map(row => `Event ${row.event_id} — lab request denied`));
      assert.doesNotMatch(JSON.stringify(payload), /OTHER-LEARNER-SENTINEL|DO-NOT-RENDER-DETAILS/);
      const controls = payload.components.flatMap(row => row.toJSON().components);
      assert.equal(controls.find(control => control.label === 'Previous').disabled, page === 0);
      assert.equal(controls.find(control => control.label === 'Next').disabled, page === 1);
    }
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 8);
  }));
  await t.test('scoped lab filters and pages exclude another learner in real SQL', async () => isolated(async pool => {
    for (let index = 0; index < 7; index++) await seedLab(pool, student, index < 6 ? 'pending' : 'revoked', null, null);
    for (let index = 0; index < 3; index++) await seedLab(pool, other, 'pending', null, null);
    for (const status of ['all','pending','approved','denied','suspended','revoked','expired']) {
      const expected = (await pool.query(`SELECT request_id,status FROM certification_lab_requests WHERE discord_user_id=$1 AND ($2::text='all' OR status=$2) ORDER BY created_at DESC,request_id DESC`, [student,status])).rows;
      for (const page of [0,1,2]) {
        const payload = await renderReadOnly(pool, `cert:labview:student:${student}:${status}:${page}`);
        const selected = expected.slice(page*5,page*5+5), fields = payload.embeds[0].fields;
        assert.deepEqual(fields.map(field => field.name), selected.map(record => `Request ${record.request_id}`));
        fields.forEach((field,index) => assert.ok(field.value.includes(`Status: ${selected[index].status}`)));
        assert.ok(!JSON.stringify(payload).includes(other));
        const controls = payload.components.flatMap(row => row.components);
        assert.ok(controls.some(control => control.custom_id === `cert:labview:student:${student}:${status}:${page}` && control.label === 'Refresh'));
        assert.equal(controls.find(control => control.label === 'Previous').disabled, page === 0);
        assert.equal(controls.find(control => control.label === 'Next').disabled, expected.length <= page*5+5);
      }
    }
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_lab_requests')).rows[0].count, 10);
    assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 0);
  }));
});
