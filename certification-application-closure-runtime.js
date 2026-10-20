import { createCertificationRouter } from './certification-admin-router.js';
import { createClosureEnabledAdminRouter } from './certification-application-closure-ui.js';
import { replyRetentionHold } from './certification-retention-hold.js';

export function readApplicationClosureFlag(env = {}) {
  const value = env.CERTIFICATION_APPLICATION_CLOSURE_ENABLED;
  if (value !== undefined && value !== 'true' && value !== 'false') throw new Error('Invalid application closure flag');
  return value === 'true';
}

export function createClosureRuntimeRouter(pool, config, guildId, {
  createBaseRouter = createCertificationRouter, createClosureRouter = createClosureEnabledAdminRouter
} = {}) {
  if (config?.enabled !== true || typeof createBaseRouter !== 'function' || typeof createClosureRouter !== 'function') throw new Error('Enabled certification and valid router factories required');
  const base = createBaseRouter(pool, config, guildId);
  if (typeof base !== 'function') throw new Error('Base certification router required');
  let live = null, initializing = null, disposed = false;
  const route = async interaction => {
    if (disposed || !live) { await replyRetentionHold(interaction); return true; }
    return live(interaction);
  };
  route.initialize = function initialize() {
    if (disposed) return Promise.reject(new Error('Closure router has been disposed'));
    if (live) return Promise.resolve();
    if (initializing) return initializing;
    initializing = Promise.resolve().then(() => createClosureRouter(pool, config, guildId, { createBaseRouter: () => base }))
      .then(candidate => {
        if (disposed) throw new Error('Closure initialization stopped during shutdown');
        if (typeof candidate !== 'function') throw new Error('Initialized closure router required');
        live = candidate;
      }).catch(error => { initializing = null; throw error; });
    return initializing;
  };
  route.dispose = () => { disposed = true; live = null; };
  return route;
}
