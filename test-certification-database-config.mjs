import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';

const url = 'postgresql://fixture:fixture@database.example.invalid/certification_fixture';
test('explicit certification URL defaults to verified TLS without academy fallback', () => {
  assert.deepEqual(loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: url }),
    { connectionString: url, ssl: { rejectUnauthorized: true } });
  assert.throws(() => loadCertificationDatabaseConnection({ DATABASE_URL: url }), /Explicit certification database URL required/);
});
test('invalid URLs and connection-string TLS overrides are rejected without exposing credentials', () => {
  for (const value of ['', 'not-a-url', 'https://localhost/db', 'postgresql://localhost', `${url}?sslmode=disable`, `${url}#ignored`]) {
    assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: value }));
  }
  assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: 'postgresql://PRIVATE:SECRET@localhost' }),
    error => !error.message.includes('PRIVATE') && !error.message.includes('SECRET'));
});
test('TLS disable requires explicit loopback connection', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const connectionString = `postgresql://fixture:fixture@${host}/certification_test`;
    assert.deepEqual(loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: connectionString, CERTIFICATION_DATABASE_TLS: 'disable' }),
      { connectionString, ssl: false });
  }
  assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: url, CERTIFICATION_DATABASE_TLS: 'disable' }), /loopback/);
});
test('unsupported TLS modes do not silently relax verification', () => {
  for (const mode of ['', 'false', 'require', 'prefer', 'insecure']) {
    assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: url, CERTIFICATION_DATABASE_TLS: mode }), /TLS mode/);
  }
});
test('optional CA is passed with verification enabled; malformed CA shapes fail', () => {
  const ca = '-----BEGIN CERTIFICATE-----\nfixture-only-not-a-real-certificate\n-----END CERTIFICATE-----';
  assert.deepEqual(loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: url, CERTIFICATION_DATABASE_CA_PEM: ca }).ssl,
    { rejectUnauthorized: true, ca });
  for (const value of ['', null, 'not-pem', 'x'.repeat(65537)]) {
    assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: url, CERTIFICATION_DATABASE_CA_PEM: value }), /CA configuration/);
  }
});
test('CA configuration cannot be combined with disabled TLS', () => {
  assert.throws(() => loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: 'postgresql://localhost/certification_test',
    CERTIFICATION_DATABASE_TLS: 'disable', CERTIFICATION_DATABASE_CA_PEM: 'fixture' }), /without a CA/);
});
