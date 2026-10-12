export class StatusReadLimitError extends Error {
  constructor(reason) { super('Enrollment status read limited'); this.reason = reason; }
}

export function createStatusReadGuard({ now = Date.now, windowMs = 60000, limit = 5, maxEntries = 1000, maxInFlight = 16 } = {}) {
  if (typeof now !== 'function' || [windowMs, limit, maxEntries, maxInFlight].some(n => !Number.isSafeInteger(n) || n < 1) || maxInFlight > maxEntries) throw new Error('Invalid status read limits');
  const entries = new Map(); let inFlight = 0;
  return { async run(actor, operation) {
    if (!/^\d{17,20}$/.test(actor || '') || typeof operation !== 'function') throw new Error('Invalid status read actor');
    const time = now();
    for (const [key, entry] of entries) if (!entry.busy && time >= entry.expiresAt) entries.delete(key);
    let entry = entries.get(actor);
    if (entry?.busy) throw new StatusReadLimitError('busy');
    if (entry && entry.count >= limit) throw new StatusReadLimitError('rate_limit');
    if (inFlight >= maxInFlight || (!entry && entries.size >= maxEntries)) throw new StatusReadLimitError('capacity');
    if (!entry) { entry = { count: 0, busy: false, expiresAt: time + windowMs }; entries.set(actor, entry); }
    entry.count++; entry.busy = true; inFlight++;
    try { return await operation(); }
    finally { entry.busy = false; inFlight--; }
  } };
}
