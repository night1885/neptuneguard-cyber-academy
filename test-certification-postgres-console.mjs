import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationRouter } from './certification-router.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const owner = '1223123544301633567'; const guild = '1339276399390887956';
function interaction(id, values = null, actor = owner) {
  return { customId: id, values, user: { id: actor }, guildId: guild, replies: [], isButton: () => values === null, isModalSubmit: () => false, isStringSelectMenu: () => values !== null, async deferReply(options) { this.options = options; }, async reply(payload) { this.replies.push(payload); }, async editReply(payload) { this.replies.push(payload); } };
}
test('real PostgreSQL console counts and queues execute read-only with deterministic pagination', { skip: !databaseUrl, timeout: 30000 }, async () => {
  const url = new URL(databaseUrl); assert.ok(['postgres:', 'postgresql:'].includes(url.protocol)); assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)); assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 }); let pool; let client; let created = false;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test'); await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` }); assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql', '005-age-eligibility-evidence.sql']) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    const ids = Array.from({ length: 8 }, (_, index) => String(1223123544301633500n + BigInt(index)));
    for (let index = 0; index < ids.length; index++) await pool.query('INSERT INTO certification_enrollments (discord_user_id,status) VALUES ($1,$2)', [ids[index], index < 6 ? 'pending' : index === 6 ? 'suspended' : 'revoked']);
    await pool.query("INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES ($1,$2,'fixture-lab','fixture-rules',NOW())", [randomUUID(), ids[0]]);
    const before = (await pool.query('SELECT * FROM certification_enrollments ORDER BY discord_user_id')).rows;
    client = await pool.connect(); await client.query('BEGIN READ ONLY'); assert.equal((await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'on');
    const calls = []; const readonly = { async query(sql, params) { calls.push({ sql, params }); return client.query(sql, params); } };
    const route = createCertificationRouter(readonly, { enabled: true, ownerId: owner }, guild);
    const overview = interaction('cert:admin:overview:0'); await route(overview); assert.equal(overview.options.flags, 64);
    const metrics = Object.fromEntries(overview.replies[0].embeds[0].toJSON().fields.map(field => [field.name, field.value]));
    assert.equal(metrics['Pending enrollments'], '6'); assert.equal(metrics['Approved enrollments'], '0'); assert.equal(metrics['Suspended enrollments'], '1'); assert.equal(metrics['Revoked enrollments'], '1'); assert.equal(metrics['Awaiting acknowledgment'], '0'); assert.equal(metrics['Pending lab requests'], '1');
    const first = interaction('cert:console:section', ['enrollments']); await route(first); const firstPayload = first.replies[0]; assert.equal(firstPayload.embeds[0].toJSON().fields.length, 5); assert.equal(firstPayload.components[1].toJSON().components[2].disabled, false); assert.deepEqual(firstPayload.allowedMentions, { parse: [] });
    assert.deepEqual(firstPayload.embeds[0].toJSON().fields.map(field => field.name), ids.slice(0, 5).map(id => `Student ${id}`));
    const second = interaction('cert:console:enrollments:1'); await route(second); assert.deepEqual(second.replies[0].embeds[0].toJSON().fields.map(field => field.name), [`Student ${ids[5]}`]); assert.equal(second.replies[0].components[1].toJSON().components[2].disabled, true);
    const restricted = interaction('cert:console:section', ['restricted']); await route(restricted); assert.equal(restricted.replies[0].embeds[0].toJSON().fields.length, 2); assert.match(restricted.replies[0].embeds[0].toJSON().fields[0].value, /Status: suspended/); assert.match(restricted.replies[0].embeds[0].toJSON().fields[1].value, /Status: revoked/);
    const labs = interaction('cert:console:section', ['labs']); await route(labs); assert.equal(labs.replies[0].embeds[0].toJSON().fields.length, 1); assert.equal(labs.replies[0].components.length, 2);
    const beforeDenied = calls.length; await route(interaction('cert:console:section', ['overview'], ids[0])); assert.equal(calls.length, beforeDenied); assert.ok(calls.every(call => call.sql.startsWith('SELECT')));
    assert.deepEqual((await client.query('SELECT * FROM certification_enrollments ORDER BY discord_user_id')).rows, before); assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM certification_audit_events')).rows[0].count, 0);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(true); }
    try { if (pool) await pool.end(); } finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } }
  }
});
