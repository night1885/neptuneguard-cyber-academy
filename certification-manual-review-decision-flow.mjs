import { randomUUID } from 'node:crypto';
import { createManualReviewDecisionPresentation } from './certification-manual-review-decision-presentation.mjs';

// Staged orchestration only. No Discord routing, message sending, runtime imports, or activation.
// loadRecord and service are trusted server dependencies, never interaction-provided capabilities.
export function createManualReviewDecisionFlow(config, { guildId, loadRecord, service, now = Date.now, ttlMs = 300000, capacity = 100 } = {}) {
  const presentation = createManualReviewDecisionPresentation(config, { guildId });
  if (typeof loadRecord !== 'function' || typeof now !== 'function' ||
      !['prepare', 'cancel', 'confirm'].every(method => typeof service?.[method] === 'function') ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 300000 ||
      !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('Bounded server-held decision dependencies required');
  const scope = Object.freeze({ actorId: config.ownerId, actualGuildId: guildId, actualChannelId: config.adminChannelId });
  const sessions = new Map();
  let closed = false;
  function authorize(context) {
    if (closed || context?.actorId !== scope.actorId || context.actualGuildId !== scope.actualGuildId || context.actualChannelId !== scope.actualChannelId) {
      throw new Error('Active owner review in the configured server and admin channel required');
    }
  }
  function clock() {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0 || value > 8640000000000000 - ttlMs) throw new Error('Invalid review clock');
    return value;
  }
  function cancelIssued(issued) {
    if (!issued) return;
    try { service.cancel({ actorId: scope.actorId, actualGuildId: scope.actualGuildId, token: issued.token }); }
    catch { /* Cleanup must not replace an uncertain transaction outcome. UI state is invalidated independently. */ }
  }
  function discard(token, entry) {
    sessions.delete(token);
    cancelIssued(entry?.issued);
  }
  function prune(current) {
    for (const [token, entry] of sessions) if (current < entry.createdAt || current >= entry.expiresAt) discard(token, entry);
  }
  function lookup(context, token, kind) {
    authorize(context);
    prune(clock());
    const entry = typeof token === 'string' ? sessions.get(token) : undefined;
    if (!entry || entry.kind !== kind) throw new Error('Review session unavailable, expired, canceled, or already used');
    return entry;
  }
  return Object.freeze({
    async open(context, studentDiscordId) {
      authorize(context);
      if (typeof studentDiscordId !== 'string' || !/^[0-9]{17,20}$/.test(studentDiscordId)) throw new Error('Valid learner required');
      const createdAt = clock();
      prune(createdAt);
      if (sessions.size >= capacity) throw new Error('Too many pending owner reviews');
      const token = randomUUID(), entry = { kind: 'loading', createdAt, expiresAt: createdAt + ttlMs };
      sessions.set(token, entry);
      try {
        const record = await loadRecord(studentDiscordId);
        if (lookup(context, token, 'loading') !== entry || record?.discord_user_id !== studentDiscordId) throw new Error('Requested application unavailable');
        entry.record = structuredClone(record);
        const payload = presentation.review(context, { record: entry.record, reviewToken: token });
        entry.kind = 'review';
        return payload;
      } catch (error) { discard(token, entry); throw error; }
    },
    choose(context, { reviewToken, action } = {}) {
      const entry = lookup(context, reviewToken, 'review');
      const payload = presentation.reasonModal(context, { reviewToken, action });
      entry.kind = 'form';
      entry.action = action;
      return payload;
    },
    submit(context, { reviewToken, action, reason, reviewAck } = {}) {
      const entry = lookup(context, reviewToken, 'form');
      if (entry.action !== action || reviewAck !== 'REVIEWED' || typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
        throw new Error('Matching decision, bounded reason, and explicit REVIEWED acknowledgment required');
      }
      const normalized = reason.trim();
      entry.kind = 'preparing';
      let issued;
      try {
        issued = service.prepare({ actorId: scope.actorId, actualGuildId: scope.actualGuildId,
          record: structuredClone(entry.record), action, reason: normalized, reviewedResponses: true });
        const current = clock();
        if (issued?.studentDiscordId !== entry.record.discord_user_id || issued.action !== action ||
            !Number.isSafeInteger(issued.expiresAt) || issued.expiresAt <= current || issued.expiresAt > current + 300000 || sessions.has(issued.token)) {
          throw new Error('Decision service returned inconsistent confirmation details');
        }
        const held = Object.freeze({ token: issued.token, studentDiscordId: issued.studentDiscordId, action: issued.action,
          expiresAt: Math.min(issued.expiresAt, current + ttlMs) });
        const payload = presentation.confirmation(context, { issued: held, reason: normalized });
        sessions.delete(reviewToken);
        sessions.set(held.token, { kind: 'confirmation', createdAt: current, expiresAt: held.expiresAt, issued: held });
        return payload;
      } catch (error) { sessions.delete(reviewToken); cancelIssued(issued); throw error; }
    },
    async confirm(context, token) {
      const entry = lookup(context, token, 'confirmation');
      sessions.delete(token);
      try {
        return await service.confirm({ actorId: scope.actorId, actualGuildId: scope.actualGuildId,
          studentDiscordId: entry.issued.studentDiscordId, token: entry.issued.token });
      } catch (error) { cancelIssued(entry.issued); throw error; }
    },
    cancel(context, token) {
      authorize(context);
      prune(clock());
      const entry = typeof token === 'string' ? sessions.get(token) : undefined;
      if (!entry) return false;
      discard(token, entry);
      return true;
    },
    close() {
      closed = true;
      for (const [token, entry] of sessions) discard(token, entry);
      // Already-started decision transactions are not canceled; runtime shutdown must await them.
    }
  });
}
