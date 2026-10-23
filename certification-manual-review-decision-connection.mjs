import { loadCertificationDatabaseConnection } from './certification-database-config.js';

// Configuration parsing only. No connection is opened and no environment value is modified.
export function loadManualReviewDecisionConnection(env = {}) {
  try {
    if (env.CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED !== 'true') throw new Error();
    const primary = loadCertificationDatabaseConnection(env);
    const decision = loadCertificationDatabaseConnection({
      CERTIFICATION_DATABASE_URL: env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL,
      CERTIFICATION_DATABASE_TLS: env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS,
      CERTIFICATION_DATABASE_CA_PEM: env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_CA_PEM
    });
    const parse = connection => {
      const url = new URL(connection.connectionString);
      const role = decodeURIComponent(url.username), database = decodeURIComponent(url.pathname.slice(1)), password = decodeURIComponent(url.password);
      if (![role, database].every(value => /^[a-z_][a-z0-9_]{0,62}$/.test(value)) || !password) throw new Error();
      return { host: url.hostname, port: url.port || '5432', role, database, password };
    };
    const a = parse(primary), b = parse(decision);
    if (a.host !== b.host || a.port !== b.port || a.database !== b.database || a.role === b.role || a.password === b.password ||
        (primary.ssl === false) !== (decision.ssl === false) ||
        (primary.ssl !== false && (primary.ssl.ca ?? null) !== (decision.ssl.ca ?? null))) throw new Error();
    return Object.freeze({
      connection: Object.freeze({ ...decision, ssl: decision.ssl === false ? false : Object.freeze({ ...decision.ssl }) }),
      target: Object.freeze({ expectedRole: b.role, expectedDatabase: b.database }),
      primaryTarget: Object.freeze({ expectedRole: a.role, expectedDatabase: a.database })
    });
  } catch {
    throw Object.assign(new Error('Explicit separate owner-decision credentials for the same database endpoint and TLS policy are required.'),
      { code: 'MANUAL_REVIEW_DECISION_CONNECTION_INVALID' });
  }
}
