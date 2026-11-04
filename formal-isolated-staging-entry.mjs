// Explicit isolated staging launcher. Default is offline preflight, never normal startup.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const failure = 'Formal staging request failed; check the private profile and approved staging setup.';
function profileShape(profile) {
  return profile && Object.getPrototypeOf(profile) === Object.prototype &&
    Object.keys(profile).sort().join(',') === 'bundle,env,productionBoundary';
}
async function readProfile(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size < 1 || info.size > 65536) throw new Error('Invalid profile');
  const bytes = await readFile(path);
  if (bytes.length > 65536) throw new Error('Invalid profile');
  return JSON.parse(bytes.toString('utf8'));
}
export async function runFormalStagingCli(argv, deps) {
  let app;
  try {
    if (!Array.isArray(argv) || ![2, 3].includes(argv.length) || argv[0] !== '--profile' ||
        typeof argv[1] !== 'string' || !argv[1].trim() || argv[1].startsWith('--') ||
        (argv.length === 3 && argv[2] !== '--start')) throw new Error('Invalid arguments');
    const profile = await deps.readProfile(argv[1]);
    if (!profileShape(profile)) throw new Error('Invalid profile');
    const result = await deps.inspect(profile);
    if (result?.ok !== true || result.operationalReady !== false) throw new Error('Invalid preflight');
    if (argv.length === 2) {
      deps.write(JSON.stringify({ ok: true, mode: 'offline-preflight', operationalReady: false }));
      return 0;
    }
    const token = deps.readToken();
    if (typeof token !== 'string' || !token.trim()) throw new Error('Explicit staging token required');
    app = await deps.createApplication(profile);
    if (typeof app?.start !== 'function' || typeof app.shutdown !== 'function') throw new Error('Invalid lifecycle');
    await app.start(token);
    // Login return is not proof of schema, course authorization or operational readiness.
    deps.write(JSON.stringify({ ok: true, mode: 'start-request-returned', operationalReady: false }));
    return 0;
  } catch (error) {
    try { if (error?.cleanup) await error.cleanup; } catch {}
    try { if (typeof app?.shutdown === 'function') await app.shutdown(); } catch {}
    deps.error(failure);
    return 1;
  }
}
export async function createFormalStagingCliDependencies() {
  const [{ loadCertificationConfig }, staging, { createContentAdapter }, { FORMAL_REVIEW_COURSE }] = await Promise.all([
    import('./certification-config.js'),
    import('./docs/formal-ethical-hacking/authoring/discord-workspace-prototype/isolated-staging.mjs'),
    import('./docs/formal-ethical-hacking/authoring/discord-workspace-prototype/content.mjs'),
    import('./docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-course.mjs')
  ]);
  return {
    readProfile,
    inspect(profile) {
      const result = staging.inspectFormalStagingProfile(profile.env, profile.productionBoundary, loadCertificationConfig);
      if (result.ok !== true) return result;
      createContentAdapter({ courseId: FORMAL_REVIEW_COURSE.key, bundle: profile.bundle });
      return result;
    },
    readToken: () => process.env.FORMAL_STAGING_DISCORD_TOKEN,
    async createApplication(profile) {
      const [{ Client }, { createInstructorClientOptions }, { createRestoredCertificationApplication },
        { attachCertificationRuntime }, { createCertificationDatabasePool }, { createTrustedFormalReviewRoute }] = await Promise.all([
        import('discord.js'), import('./instructor-application.js'), import('./certification-restored-application.js'),
        import('./certification-runtime.js'), import('./certification-database-pool.js'),
        import('./docs/formal-ethical-hacking/authoring/discord-workspace-prototype/trusted-route.mjs')
      ]);
      const client = new Client(createInstructorClientOptions());
      try {
        return staging.createIsolatedFormalStagingApplication({ client, env: profile.env,
          productionBoundary: profile.productionBoundary, bundle: profile.bundle }, {
          loadConfig: loadCertificationConfig, createApplication: createRestoredCertificationApplication,
          attachRuntime: attachCertificationRuntime, createPool: createCertificationDatabasePool,
          createRoute: createTrustedFormalReviewRoute
        });
      } catch (error) {
        try { if (error?.cleanup) await error.cleanup; } finally { await client.destroy(); }
        throw new Error('Staging construction failed');
      }
    },
    write: text => console.log(text), error: text => console.error(text)
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = await runFormalStagingCli(process.argv.slice(2), await createFormalStagingCliDependencies());
  } catch {
    console.error(failure);
    process.exitCode = 1;
  }
}
