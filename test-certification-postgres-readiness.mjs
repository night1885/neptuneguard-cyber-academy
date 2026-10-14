import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const files = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql'];

test('real PostgreSQL readiness and adult declaration constraints fail closed', { skip: !databaseUrl }, async () => {
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
    pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of files) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await assert.rejects(validateCertificationSchema(pool), /columns are incomplete/);
    const migration = await readFile(new URL('./migrations/005-account-acknowledgment-age.sql', import.meta.url), 'utf8');
    await pool.query(migration); await pool.query(migration);
    await validateCertificationSchema(pool);
    await pool.query('ALTER TABLE certification_agreements DISABLE TRIGGER certification_agreement_immutable');
    await assert.rejects(validateCertificationSchema(pool), /missing or disabled/);
    await pool.query('ALTER TABLE certification_agreements ENABLE TRIGGER certification_agreement_immutable');
    await validateCertificationSchema(pool);
    const content = 'Readiness fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v2', content, hash]);
    const config = { enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2', activeAgreementSha256: hash };
    await validateActiveEnrollmentAgreement(pool, config);
    await assert.rejects(validateActiveEnrollmentAgreement(pool, { ...config, activeAgreementSha256: '0'.repeat(64) }), /does not match/);
    await assert.rejects(validateActiveEnrollmentAgreement(pool, { ...config, activeAgreementVersion: 'missing' }), /missing/);

    const insert = `INSERT INTO certification_enrollments
      (discord_user_id,status,signature_method,agreement_version,agreement_content_sha256,
       acknowledged_at,learner_confirmed_read_at,comprehension_passed_at,comprehension_check_version,
       age_eligible,age_declared_at,age_declaration_version,acknowledgment_name,signature_reference)
      VALUES ($1,'pending','discord_account','fixture-v2',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;
    const now = '2026-10-14T10:00:00Z';
    const valid = ['123456789012345678', hash, now, now, now, 'check-v2', true, now, 'adult-18-v1', null, null];
    await pool.query(insert, valid);
    const stored = (await pool.query('SELECT age_eligible,age_declaration_version,acknowledgment_name,signature_reference FROM certification_enrollments WHERE discord_user_id=$1', [valid[0]])).rows[0];
    assert.deepEqual(stored, { age_eligible: true, age_declaration_version: 'adult-18-v1', acknowledgment_name: null, signature_reference: null });
    for (const [index, value] of [[1, null], [2, null], [3, null], [4, null], [5, null], [6, false], [6, null], [7, null], [8, null], [8, 'unknown'], [9, 'Forbidden fixture name'], [10, 'Forbidden fixture document']]) {
      const values = [...valid]; values[0] = '123456789012345679'; values[index] = value;
      await assert.rejects(pool.query(insert, values), error => error.code === '23514' && error.constraint === 'certification_account_acknowledgment_required');
    }
    assert.equal(Number((await pool.query('SELECT count(*) AS count FROM certification_enrollments')).rows[0].count), 1);
    await pool.query('ALTER TABLE certification_enrollments DROP CONSTRAINT certification_account_acknowledgment_required');
    await assert.rejects(validateCertificationSchema(pool), /Validated account acknowledgment constraint/);
    await pool.query(migration); await validateCertificationSchema(pool);
    await pool.query('ALTER TABLE certification_enrollments DROP COLUMN acknowledgment_name CASCADE');
    await assert.rejects(validateCertificationSchema(pool), /columns are incomplete/);
    await pool.query('DROP TABLE certification_audit_events');
    await assert.rejects(validateCertificationSchema(pool), /schema is missing/);
  } finally {
    try { if (pool) await pool.end(); }
    finally {
      try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); }
      finally { await admin.end(); }
    }
  }
});
