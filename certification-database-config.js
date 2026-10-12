export function loadCertificationDatabaseConnection(env = process.env) {
  const connectionString = env.CERTIFICATION_DATABASE_URL;
  if (typeof connectionString !== 'string' || !connectionString || connectionString.length > 12000) {
    throw new Error('Explicit certification database URL required');
  }
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('Invalid certification database URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1) || url.search || url.hash) {
    throw new Error('Certification database URL must name a database and have no query parameters or fragment');
  }
  const mode = env.CERTIFICATION_DATABASE_TLS ?? 'verify-full';
  const ca = env.CERTIFICATION_DATABASE_CA_PEM;
  if (mode === 'disable') {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || ca !== undefined) {
      throw new Error('Disabled certification TLS is allowed only for explicit loopback test connections without a CA');
    }
    return { connectionString, ssl: false };
  }
  if (mode !== 'verify-full') throw new Error('Invalid certification database TLS mode');
  const ssl = { rejectUnauthorized: true };
  if (ca !== undefined) {
    if (typeof ca !== 'string' || ca.length > 65536 ||
        !ca.trim().startsWith('-----BEGIN CERTIFICATE-----') || !ca.trim().endsWith('-----END CERTIFICATE-----')) {
      throw new Error('Invalid certification database CA configuration');
    }
    ssl.ca = ca;
  }
  return { connectionString, ssl };
}
