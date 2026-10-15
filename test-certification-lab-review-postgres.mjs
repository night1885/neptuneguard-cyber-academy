import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationRouter } from './certification-admin-router.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const optedIn = process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL === 'true' && process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL === 'true';
const migrations = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-account-acknowledgment-age.sql'];
const owner = '100000000000000001', student = '100000000000000002', guild = '100000000000000003';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;

test('lab review joined SQL works with a restricted read-only login on migrated disposable PostgreSQL', { skip: !databaseUrl || !optedIn, timeout: 120000 }, async () => {
  const target = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'Only loopback disposable databases allowed');
  assert.equal(target.pathname, '/certification_test'); assert.equal(target.search, ''); assert.equal(target.hash, '');
  const suffix = randomUUID().replaceAll('-', '');
  const schema = `review_test_${suffix}`, role = `review_role_${suffix}`, password = randomUUID();
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000,
    options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
  let schemaCreated = false, roleCreated = false, worker;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); schemaCreated = true;
    for (const file of migrations) await admin.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const secret = 'SYNTHETIC-PRIVATE-MUST-NOT-BE-DISPLAYED';
    await admin.query(`INSERT INTO certification_enrollments
      (discord_user_id, student_id, status, signature_method, acknowledgment_name, signature_reference)
      VALUES ($1,'NG-SYNTHETIC-LEGACY','awaiting_acknowledgment','typed_name',$2,$2)`, [student, secret]);
    const request = randomUUID();
    await admin.query(`INSERT INTO certification_lab_requests
      (request_id, discord_user_id, lab_key, status, scope, rules_version, rules_acknowledged_at)
      VALUES ($1,$2,'synthetic-lab','pending',$3::jsonb,'synthetic-rules',NOW())`, [request, student, JSON.stringify({ private: secret })]);
    const snapshot = async () => ({
      enrollment: (await admin.query('SELECT * FROM certification_enrollments ORDER BY discord_user_id')).rows,
      labs: (await admin.query('SELECT * FROM certification_lab_requests ORDER BY request_id')).rows,
      audit: (await admin.query('SELECT * FROM certification_audit_events ORDER BY event_id')).rows
    });
    const before = await snapshot();
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`); roleCreated = true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_enrollments, certification_lab_requests TO "${role}"`);
    const workerUrl = new URL(databaseUrl); workerUrl.username = role; workerUrl.password = password;
    worker = new pg.Pool({ connectionString: workerUrl.href, max: 1, connectionTimeoutMillis: 5000,
      options: `-c search_path=${schema} -c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=2000` });
    assert.equal((await worker.query('SELECT current_user AS name')).rows[0].name, role);
    assert.equal((await worker.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
    for (const table of ['certification_enrollments', 'certification_lab_requests']) {
      const grants = (await worker.query(`SELECT has_table_privilege(current_user,$1,'SELECT') AS read,
        has_table_privilege(current_user,$1,'INSERT') AS insert,
        has_table_privilege(current_user,$1,'UPDATE') AS update,
        has_table_privilege(current_user,$1,'DELETE') AS delete`, [table])).rows[0];
      assert.deepEqual(grants, { read: true, insert: false, update: false, delete: false });
    }
    const captured = [];
    const pool = { async query(sql, params) {
      assert.match(sql.trim(), /^SELECT\b/);
      const result = await worker.query(sql, params); captured.push(result.rows); return result;
    }, async connect() { assert.fail('Panel must not open a write transaction'); } };
    const route = createCertificationRouter(pool, { enabled: true, ownerId: owner }, guild);
    async function view(id) {
      let payload; const calls = [];
      await route({ customId: `cert:labview:review:${id}`, user: { id: owner }, guildId: guild,
        message: { flags: { has: flag => flag === 64 } },
        isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
        async deferUpdate() { calls.push('update'); }, async deferReply() { assert.fail('Private source must update in place'); },
        async editReply(value) { calls.push('edit'); payload = value; }, async reply() { assert.fail('Valid review rejected'); },
        client: { users: { async fetch() { assert.fail('No learner notification permitted'); } } }
      });
      assert.deepEqual(calls, ['update', 'edit']); return payload;
    }
    const payload = await view(request), text = JSON.stringify(payload);
    assert.equal(captured.length, 1);
    assert.equal(captured[0][0].acknowledgment_name, 'present');
    assert.equal(captured[0][0].signature_reference, 'present');
    assert.ok(!JSON.stringify(captured).includes(secret)); assert.ok(!text.includes(secret));
    assert.equal(captured[0][0].scope, undefined);
    const fields = json(payload.embeds[0]).fields;
    assert.match(fields.find(field => field.name === 'Linked enrollment').value, /awaiting_acknowledgment/);
    assert.match(fields.find(field => field.name === 'Account acknowledgment and age declaration').value, /^Missing/);
    assert.match(fields.find(field => field.name === 'Agreement version').value, /^Not configured/);
    assert.match(json(payload.embeds[0]).description, /not an approval decision/);
    const missing = await view(randomUUID());
    assert.match(missing.content, /not found/); assert.deepEqual(missing.embeds, []);
    assert.deepEqual(await snapshot(), before);
  } finally {
    try { if (worker) await worker.end(); }
    finally {
      try { if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally {
        try { if (roleCreated) await admin.query(`DROP ROLE "${role}"`); }
        finally { await admin.end(); }
      }
    }
  }
});
