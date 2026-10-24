// Offline prototype wrapper only. It does not authenticate or cancel a backend.
import { performance } from 'node:perf_hooks';
export function createBoundedDemoAuthorizer({ check, timeoutMs = 50, maxPending = 20 } = {}) {
  if (typeof check !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 1000 ||
      !Number.isSafeInteger(maxPending) || maxPending < 1 || maxPending > 100) throw new Error('Explicit bounded demo authorization required');
  const jobs = new Set(); let disposed = false;
  function finish(job, value) {
    if (job.done) return;
    job.done = true; clearTimeout(job.timer);
    job.resolve(!disposed && value === true && performance.now() < job.deadline);
  }
  return Object.freeze({
    authorize(context) {
      if (disposed || jobs.size >= maxPending) return Promise.resolve(false);
      return new Promise(resolve => {
        const job = { resolve, done: false, timer: null, deadline: performance.now() + timeoutMs };
        jobs.add(job);
        job.timer = setTimeout(() => finish(job, false), timeoutMs);
        Promise.resolve().then(() => disposed ? false : check(context)).then(
          value => { jobs.delete(job); finish(job, value); },
          () => { jobs.delete(job); finish(job, false); }
        );
      });
    },
    pendingCount() { return jobs.size; },
    dispose() { disposed = true; for (const job of jobs) finish(job, false); }
  });
}
