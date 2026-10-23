export function attachCommunityLifecycle({ client, enabled, createRoute, initialize, close, log = () => {} } = {}) {
  if (typeof enabled !== 'boolean') throw new Error('Explicit community runtime flag required');
  if (!enabled) return Object.freeze({ enabled: false, ready: false, detach: async () => {} });
  if (['on','once','off','isReady'].some(key => typeof client?.[key] !== 'function') || [createRoute,initialize,close,log].some(fn => typeof fn !== 'function')) throw new Error('Explicit community runtime dependencies required');
  let ready = false, stopped = false, starting, closing;
  const active = new Set(), report = message => { try { log(message); } catch {} };
  let route;
  try { route = createRoute(() => ready && !stopped); if (typeof route !== 'function') throw new Error('Community router required'); }
  catch (error) { void Promise.resolve().then(close).catch(() => report('Community construction cleanup requires attention.')); throw error; }
  function start() {
    if (stopped) return Promise.resolve();
    if (!starting) starting = Promise.resolve().then(initialize).then(result => {
      if (result?.ready !== true) throw new Error('Community readiness not confirmed');
      if (!stopped) { ready = true; report('Community learning readiness checks passed.'); }
    }).catch(() => { ready = false; report('Community learning startup checks failed; access remains unavailable.'); });
    return starting;
  }
  function onInteraction(i) {
    if (stopped) return;
    const task = Promise.resolve().then(() => route(i)); active.add(task);
    void task.catch(() => report('Community interaction requires attention.')).finally(() => active.delete(task));
  }
  client.on('interactionCreate', onInteraction); client.once('clientReady', start);
  if (client.isReady()) void start();
  return Object.freeze({ enabled: true, get ready() { return ready && !stopped; },
    detach() {
      if (closing) return closing;
      stopped = true; ready = false;
      client.off('interactionCreate', onInteraction); client.off('clientReady', start);
      closing = (async () => { if (starting) await starting; await Promise.allSettled([...active]); await close(); })();
      return closing;
    }
  });
}
