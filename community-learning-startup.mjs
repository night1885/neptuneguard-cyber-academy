import pg from 'pg';
import { buildCertificationPoolConfig } from './certification-database-pool.js';
import { loadCertificationDatabaseConnection } from './certification-database-config.js';
import { readCommunityOptions } from './community-learning-policy.mjs';
import { createCommunityRouter } from './community-learning-router.mjs';
import { createNativeCommunityClassroom, communityBadgeKeys } from './community-learning-native.mjs';
import { buildBadgePage } from './badge-pages.js';
import { verifyCommunityDatabase } from './community-learning-readiness.mjs';
import { attachCommunityLifecycle } from './community-learning-runtime.mjs';
export function attachNativeCommunityRuntime(client, guildId, env = process.env, { createPool = config => new pg.Pool(config), verifyDatabase = verifyCommunityDatabase } = {}) {
  const options = readCommunityOptions(env);
  if (!options.enabled) return attachCommunityLifecycle({ enabled: false });
  if (options.guildId !== guildId) throw new Error('Community server identity mismatch');
  const connection = loadCertificationDatabaseConnection({ CERTIFICATION_DATABASE_URL: env.COMMUNITY_DATABASE_URL,
    CERTIFICATION_DATABASE_TLS: env.COMMUNITY_DATABASE_TLS, CERTIFICATION_DATABASE_CA_PEM: env.COMMUNITY_DATABASE_CA_PEM });
  let community, certification;
  try { community = new URL(connection.connectionString); certification = new URL(env.CERTIFICATION_DATABASE_URL); }
  catch { throw new Error('Explicit separate community and certification connections required'); }
  if (decodeURIComponent(community.username) !== 'academy_community_learning' || !community.password ||
      community.hostname !== certification.hostname || community.port !== certification.port || community.pathname !== certification.pathname || community.username === certification.username) throw new Error('Community connection must use its dedicated login on the existing academy database');
  const poolConfig = buildCertificationPoolConfig(connection, { max: 2 });
  poolConfig.options += ' -c search_path=pg_catalog,public,pg_temp';
  const pool = createPool(poolConfig);
  pool.on('error', () => console.error('Community database connection requires attention.'));
  return attachCommunityLifecycle({ client, enabled: true, close: () => pool.end(), log: message => console.log(message),
    createRoute: ready => createCommunityRouter({ pool, options, ready, ...createNativeCommunityClassroom(), renderBadges: buildBadgePage, badgeKeys: communityBadgeKeys }),
    async initialize() {
      await verifyDatabase(pool, decodeURIComponent(community.pathname.slice(1)));
      const guild = await client.guilds.fetch(guildId), role = await guild.roles.fetch(options.verifiedRoleId);
      if (guild.id !== guildId || role?.id !== options.verifiedRoleId || role.guild?.id !== guildId) throw new Error('Community server or Verified role unavailable');
      return { ready: true };
    }
  });
}
