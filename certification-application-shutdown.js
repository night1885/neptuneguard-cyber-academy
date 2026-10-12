export function createApplicationShutdown({ stopAdmission, drainAcademy, detachCertification,
  closeAcademyPool, destroyClient, signals = process, exit = code => process.exit(code),
  log = (...args) => console.error(...args), timeoutMs = 15000 } = {}) {
  if ([stopAdmission, drainAcademy, detachCertification, closeAcademyPool, destroyClient, exit, log].some(fn => typeof fn !== 'function') ||
    typeof signals?.on !== 'function' || typeof signals?.off !== 'function' ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid application shutdown configuration');
  let installed = false; let closing; let resolveClosing; let finished = false; let timer; let failed = false;
  function report(message, details) { try { log(message, details); } catch {} }
  function finish(code) {
    if (finished) return; finished = true; clearTimeout(timer);
    if (installed) { signals.off('SIGINT', onSignal); signals.off('SIGTERM', onSignal); installed = false; }
    resolveClosing(code); exit(code);
  }
  async function step(callback) {
    try { await callback(); }
    catch (error) { failed = true; report('Application shutdown step failed:', { name: error?.name, code: error?.code }); }
  }
  function shutdown() {
    if (closing) return closing;
    closing = new Promise(resolve => { resolveClosing = resolve; });
    timer = setTimeout(() => { report('Application shutdown deadline exceeded; unfinished outcomes require review.'); finish(1); }, timeoutMs);
    void (async () => {
      await step(stopAdmission); if (finished) return;
      await Promise.all([step(drainAcademy), step(detachCertification)]); if (finished) return;
      await step(closeAcademyPool); if (finished) return;
      await step(destroyClient); if (finished) return;
      finish(failed ? 1 : 0);
    })().catch(error => {
      report('Application shutdown controller failed:', { name: error?.name, code: error?.code }); finish(1);
    });
    return closing;
  }
  function onSignal() { void shutdown(); }
  return Object.freeze({ shutdown, install() {
    if (finished) throw new Error('Application shutdown already finished');
    if (!installed) { signals.on('SIGINT', onSignal); signals.on('SIGTERM', onSignal); installed = true; }
    return shutdown;
  } });
}
