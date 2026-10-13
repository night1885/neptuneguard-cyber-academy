import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';

const databaseUrl = process.env.CERTIFICATION_TEST_DATABASE_URL;
const files = ['001-certification.sql', '002-typed-acknowledgment.sql', '003-enrollment-submission-metadata.sql', '004-immutable-agreement-versions.sql'];

test('real PostgreSQL readiness requires migration 005 and rejects missing safeguards', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname, '/certification_test'); assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const schema = `cert_test_${randomUUID().replaceAll('-', '')}`; let created = false; let pool;
  try {
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name, 'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`); created = true;
    pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000` });
    assert.equal((await pool.query('SHOW search_path')).rows[0].search_path, schema);
    for (const file of files) await pool.query(await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
    await assert.rejects(validateCertificationSchema(pool), /001.*005/);
    await pool.query(await readFile(new URL('./migrations/005-age-eligibility-evidence.sql', import.meta.url), 'utf8'));
    await validateCertificationSchema(pool);
    await pool.query('ALTER TABLE certification_agreements DISABLE TRIGGER certification_agreement_immutable');
    await assert.rejects(validateCertificationSchema(pool), /missing or disabled/);
    await pool.query('ALTER TABLE certification_agreements ENABLE TRIGGER certification_agreement_immutable'); await validateCertificationSchema(pool);
    const content = 'Readiness fixture only.'; const hash = createHash('sha256').update(content).digest('hex');
    await pool.query('INSERT INTO certification_agreements (version, content, content_sha256) VALUES ($1,$2,$3)', ['fixture-v2', content, hash]);
    const config = { enrollmentSubmissionEnabled: true, activeAgreementVersion: 'fixture-v2', activeAgreementSha256: hash };
    await validateActiveEnrollmentAgreement(pool, config);
    await assert.rejects(validateActiveEnrollmentAgreement(pool, { ...config, activeAgreementSha256: '0'.repeat(64) }), /does not match/);
    await assert.rejects(validateActiveEnrollmentAgreement(pool, { ...config, activeAgreementVersion: 'missing' }), /missing/);
    await pool.query('ALTER TABLE certification_enrollments DROP COLUMN acknowledgment_name');
    await assert.rejects(validateCertificationSchema(pool), /columns are incomplete/);
    await pool.query('DROP TABLE certification_audit_events'); await assert.rejects(validateCertificationSchema(pool), /schema is missing/);
  } finally {
    try { if (pool) await pool.end(); } finally { try { if (created) await admin.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await admin.end(); } }
  }
});
