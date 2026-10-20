import pg from 'pg';

export function buildCertificationPoolConfig({ connectionString, ssl } = {}, {
  connectionTimeoutMs = 3000, statementTimeoutMs = 5000, lockTimeoutMs = 2000,
  idleTransactionTimeoutMs = 10000, max = 4, readOnly = false
} = {}) {
  if (typeof connectionString !== 'string' || !connectionString) throw new Error('Explicit certification database URL required');
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('Invalid certification database URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1) || url.search || url.hash) {
    throw new Error('Certification database URL must name a database and have no query parameters or fragment');
  }
  if ([connectionTimeoutMs, statementTimeoutMs, lockTimeoutMs, idleTransactionTimeoutMs].some(value =>
    !Number.isSafeInteger(value) || value < 1 || value > 60000) ||
    typeof readOnly !== 'boolean' || !Number.isSafeInteger(max) || max < 1 || max > 16 || lockTimeoutMs >= statementTimeoutMs) {
    throw new Error('Invalid certification database limits');
  }
  return { connectionString, ssl, max, connectionTimeoutMillis: connectionTimeoutMs, idleTimeoutMillis: 10000,
    options: `-c statement_timeout=${statementTimeoutMs} -c lock_timeout=${lockTimeoutMs} -c idle_in_transaction_session_timeout=${idleTransactionTimeoutMs}` + (readOnly ? ' -c default_transaction_read_only=on' : '') };
}

export function createCertificationDatabasePool(connection, limits) {
  const pool = new pg.Pool(buildCertificationPoolConfig(connection, limits));
  pool.on('error', error => console.error('Certification database idle-client error:', { name: error?.name, code: error?.code }));
  return pool;
}
