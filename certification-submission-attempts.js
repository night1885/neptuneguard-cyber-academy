import { performance } from 'node:perf_hooks';

export function createSubmissionAttemptGuard({ clock = () => performance.now(), maxActors = 1000 } = {}) {
  if (typeof clock !== 'function' || !Number.isInteger(maxActors) || maxActors < 1 || maxActors > 10000) throw new Error('Invalid attempt-guard configuration');
  const actors = new Map();
  const limits = { start: { count: 3, window: 60000 }, send: { count: 5, window: 900000 } };
  let previousTime = -Infinity;

  async function run(actorId, action, operation) {
    if (typeof actorId !== 'string' || !/^\d{17,20}$/.test(actorId)) return { allowed: false, reason: 'invalid_actor' };
    if (!['start', 'send', 'navigate', 'form', 'cancel'].includes(action) || typeof operation !== 'function') throw new Error('Invalid guarded action');
    const current = clock();
    if (!Number.isFinite(current) || current < previousTime) throw new Error('Attempt guard requires a monotonic clock');
    previousTime = current;
    for (const [id, record] of actors) if (!record.busy && current - record.lastSeen >= 1800000) actors.delete(id);
    let record = actors.get(actorId);
    if (!record) {
      if (actors.size >= maxActors) return { allowed: false, reason: 'capacity' };
      record = { busy: false, lastSeen: current, counters: {} }; actors.set(actorId, record);
    }
    if (record.busy) return { allowed: false, reason: 'busy' };
    const limit = limits[action];
    if (limit) {
      let counter = record.counters[action];
      if (!counter || current - counter.openedAt >= limit.window) counter = record.counters[action] = { openedAt: current, count: 0 };
      if (counter.count >= limit.count) return { allowed: false, reason: 'rate_limit', retryAfterMs: Math.max(0, counter.openedAt + limit.window - current) };
      counter.count++;
    }
    record.busy = true; record.lastSeen = current;
    try { return { allowed: true, value: await operation() }; }
    finally { record.busy = false; }
  }

  return Object.freeze({ run });
}
