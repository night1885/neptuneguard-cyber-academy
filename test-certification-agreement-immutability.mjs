import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const migrationFiles = ['001-certification.sql', '002-typed-acknowledgment.sql',
  '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql'];
const digest = text => createHash('sha256').update(text, 'utf8').digest('hex');

test('published agreement snapshots reject mutation and allow a new version', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`;
  let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000,
      options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of migrationFiles) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v1', 'Original fixture.', digest('Original fixture.')]);
    await pool.query(await readFile(new URL('./migrations/004-immutable-agreement-versions.sql', import.meta.url), 'utf8'));
    await assert.rejects(pool.query('UPDATE certification_agreements SET content=$1 WHERE version=$2', ['Changed fixture.', 'fixture-v1']), /versions are immutable/);
    await assert.rejects(pool.query('UPDATE certification_agreements SET content_sha256=$1 WHERE version=$2', [digest('Changed fixture.'), 'fixture-v1']), /versions are immutable/);
    await assert.rejects(pool.query('DELETE FROM certification_agreements WHERE version=$1', ['fixture-v1']), /versions are immutable/);
    await assert.rejects(pool.query('TRUNCATE certification_agreements CASCADE'), /versions are immutable/);
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v2', 'Revised fixture.', digest('Revised fixture.')]);
    const rows = (await pool.query('SELECT version, content, content_sha256 FROM certification_agreements ORDER BY version')).rows;
    assert.deepEqual(rows, [
      { version: 'fixture-v1', content: 'Original fixture.', content_sha256: digest('Original fixture.') },
      { version: 'fixture-v2', content: 'Revised fixture.', content_sha256: digest('Revised fixture.') }
    ]);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
});
