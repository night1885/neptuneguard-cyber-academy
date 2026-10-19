import pg from 'pg';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';
import { buildCertificationPoolConfig } from './certification-database-pool.js';

const target = Object.freeze({ host: 'dpg-db1touu7bikc73bl9vhg-a.oregon-postgres.render.com', database: 'neptuneguard_cyber_academy_db', role: 'neptuneguard_certification_app' });
export async function probeCertificationConnection(env = process.env, { createPool = options => new pg.Pool(options) } = {}) {
  let pool, client, result, committed = false, discard = false, failed = false, idleFailure = false, stage = 'configuration';
  try {
    if (env.CERTIFICATION_DATABASE_TLS !== 'verify-full' || typeof createPool !== 'function') throw new Error();
    const connection = loadCertificationDatabaseConnection(env), url = new URL(connection.connectionString);
    if (url.hostname !== target.host || (url.port && url.port !== '5432') || decodeURIComponent(url.pathname.slice(1)) !== target.database || decodeURIComponent(url.username) !== target.role || connection.ssl?.rejectUnauthorized !== true) throw new Error();
    stage = 'connection'; pool = createPool(buildCertificationPoolConfig(connection, { max: 1 }));
    pool.on('error', () => { idleFailure = true; });
    client = await pool.connect();
    stage = 'transaction'; await client.query('BEGIN READ ONLY');
    stage = 'identity';
    const identity = (await client.query('SELECT current_database() AS database_name, current_user AS effective_role, session_user AS session_role')).rows;
    if (identity.length !== 1 || identity[0].database_name !== target.database || identity[0].effective_role !== target.role || identity[0].session_role !== target.role) throw new Error();
    stage = 'tls';
    const tls = (await client.query('SELECT ssl, version FROM pg_catalog.pg_stat_ssl WHERE pid=pg_backend_pid()')).rows;
    if (tls.length !== 1 || tls[0].ssl !== true || typeof tls[0].version !== 'string' || !/^TLSv1\.[23]$/.test(tls[0].version)) throw new Error();
    if (idleFailure) throw new Error();
    stage = 'transaction'; await client.query('COMMIT'); committed = true;
    result = { ok: true, database: target.database, login: target.role, configuredTls: 'verify-full', serverReportsTls: true, tlsProtocol: tls[0].version, discordStarted: false, applicationRowsRead: false };
  } catch { failed = true; }
  finally {
    if (client) {
      if (!committed) { try { await client.query('ROLLBACK'); } catch { discard = true; } }
      try { client.release(discard); } catch { failed = true; stage = 'cleanup'; }
    }
    if (pool) { try { await pool.end(); } catch { failed = true; stage = 'cleanup'; } }
  }
  if (failed || idleFailure) throw new Error(`Certification connection preflight failed at ${stage}; no credentials or driver details are reported`);
  return Object.freeze(result);
}
