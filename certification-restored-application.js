import { Events } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createApplicationShutdown } from './certification-application-shutdown.js';
import { createRestorationRouter } from './certification-restoration-router.js';

export function createRestoredCertificationApplication({ client, guildId, env = process.env, signals = process,
  exit = code => process.exit(code), log = message => console.error(message), timeoutMs = 15000, attachRuntime = attachCertificationRuntime } = {}) {
  const id = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
  if (!id(guildId) || !id(env?.ACADEMY_OWNER_ID) || !id(env?.ACADEMY_ADMIN_CHANNEL_ID) || env.CERTIFICATION_ENABLED !== 'true') {
    throw new Error('Explicit restoration guild, admin, admin channel and certification enablement required');
  }
  const environment = Object.freeze({ ...env });
  const config = loadCertificationConfig(environment);
  if (!config.activeAgreementVersion) throw new Error('Explicit current agreement manifest required for restoration');
  if (['on', 'off', 'once', 'isReady', 'login', 'destroy'].some(name => typeof client?.[name] !== 'function') || client.isReady()) {
    throw new Error('A fresh restoration Discord client is required');
  }
  if ([exit, log, attachRuntime].some(callback => typeof callback !== 'function')) throw new Error('Invalid restoration callbacks');
  const active = new Set(); let runtime, runtimeClosing, started = false, stopping = false, failed = false;
  const report = message => { try { log(message); } catch {} };
  function detachRuntime() {
    if (!runtimeClosing) {
      try { runtimeClosing = Promise.resolve(runtime.detach()); }
      catch (error) { runtimeClosing = Promise.reject(error); }
      void runtimeClosing.catch(() => {});
    }
    return runtimeClosing;
  }
  function onError() { report('Restoration connection requires attention.'); }
  const shutdown = createApplicationShutdown({ signals, timeoutMs, exit: code => exit(failed ? 1 : code),
    log: () => report('Restoration shutdown requires attention.'),
    stopAdmission() { stopping = true; client.off(Events.Error, onError); void detachRuntime(); },
    async drainAcademy() { await Promise.allSettled([...active]); },
    detachCertification: detachRuntime, async closeAcademyPool() {}, destroyClient: () => client.destroy()
  });
  runtime = attachRuntime(client, undefined, guildId, environment, { createRouter: createRestorationRouter });
  return Object.freeze({
    get enabled() { return runtime.enabled === true; },
    get ready() { return !stopping && runtime.ready === true; },
    get stopping() { return stopping; },
    shutdown: shutdown.shutdown,
    async start(token) {
      if (started || stopping) throw new Error('Restoration application cannot be started again');
      if (typeof token !== 'string' || !token.trim()) throw new Error('Explicit Discord token required');
      started = true; client.on(Events.Error, onError); shutdown.install();
      const login = Promise.resolve().then(() => client.login(token)); active.add(login);
      try {
        await login;
        if (!stopping) report('Restoration client connected; certification readiness is checked separately.');
      } catch {
        failed = true; report('Restoration login failed.');
      } finally { active.delete(login); }
      if (failed) await shutdown.shutdown();
    }
  });
}
