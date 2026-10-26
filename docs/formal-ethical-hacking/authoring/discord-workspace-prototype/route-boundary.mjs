// Detached review-route boundary. Never attaches a listener or enables a runtime flag.
const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const notice = 'Formal review workspace is unavailable. Use the approved entry when it is ready.';
export function createFormalReviewRoute({ enabled = false, reviewOnly = false, mode = 'disabled',
  guildId, entryChannelId, isReady, createWorkspace, drainMs = 5000 } = {}) {
  if (typeof enabled !== 'boolean') throw new TypeError('Explicit boolean enablement required');
  if (!enabled) return Object.freeze({ enabled: false, handle: async () => false, dispose: async () => ({ drained: true }) });
  if (reviewOnly !== true || mode !== 'review' || !validId(guildId) || !validId(entryChannelId) ||
      typeof isReady !== 'function' || typeof createWorkspace !== 'function' ||
      !Number.isSafeInteger(drainMs) || drainMs < 10 || drainMs > 15000) throw new TypeError('Explicit isolated review-route dependencies required');
  const workspace = createWorkspace();
  if (workspace && typeof workspace.then === 'function') {
    void Promise.resolve(workspace).then(value => value?.dispose?.()).catch(() => {});
    throw new TypeError('Synchronous workspace factory required');
  }
  if (!workspace || typeof workspace.handle !== 'function' || typeof workspace.dispose !== 'function') {
    try { void Promise.resolve(workspace?.dispose?.()).catch(() => {}); } catch {}
    throw new TypeError('Owned disposable workspace required');
  }
  const active = new Set(); let stopping = false, closing;
  const deny = async i => {
    // Do not edit a response this boundary did not acknowledge or create.
    if (i.deferred || i.replied) return true;
    try { await i.reply({ content: notice, embeds: [], components: [], flags: 64, allowedMentions: { parse: [] } }); } catch {}
    return true;
  };
  function owned(i) { return typeof i?.customId === 'string' && i.customId.startsWith('fws:'); }
  return Object.freeze({ enabled: true,
    handle(i) {
      if (!owned(i)) return Promise.resolve(false);
      if (stopping) return Promise.resolve(true);
      const task = (async () => {
        try {
          if (i.isButton?.() !== true || i.guildId !== guildId || i.channelId !== entryChannelId) return await deny(i);
          const ready = isReady();
          if (ready !== true) {
            // Readiness is a synchronous snapshot, never awaited before acknowledgement.
            if (ready && typeof ready.catch === 'function') void ready.catch(() => {});
            return await deny(i);
          }
          if (stopping) return true;
          const handled = await workspace.handle(i);
          return handled === true ? true : await deny(i);
        } catch { return stopping ? true : await deny(i); }
      })();
      active.add(task); void task.finally(() => active.delete(task)); return task;
    },
    dispose() {
      if (closing) return closing;
      stopping = true;
      let disposal;
      try { disposal = Promise.resolve(workspace.dispose()); } catch { disposal = Promise.reject(new Error('Workspace disposal failed')); }
      const tasks = [...active, disposal];
      closing = (async () => {
        let timer;
        try {
          return await Promise.race([
            Promise.allSettled(tasks).then(results => ({ drained: results.every(result => result.status === 'fulfilled') })),
            new Promise(resolve => { timer = setTimeout(() => resolve({ drained: false }), drainMs); })
          ]);
        } finally { clearTimeout(timer); }
      })();
      return closing;
    }
  });
}
