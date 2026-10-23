import { createHash, randomUUID } from 'node:crypto';
import { hasManualReviewAcknowledgment } from './certification-manual-review-data.mjs';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const version = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
const stamp = value => {
  const parsed = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!parsed || !Number.isFinite(parsed.getTime())) throw new Error('Valid stored timestamps required');
  return parsed.toISOString();
};

// Staged server-side guard only: not a decision executor or runtime feature activation.
// consume() must be called with a freshly locked database row inside the decision transaction.
// Its result is not course authorization; commit and audit remain the executor's responsibility.
export function createManualReviewDecisionGuard(config, { guildId, now = Date.now, ttlMs = 300000, capacity = 100 } = {}) {
  if (config?.enabled !== true || config.manualReviewEnabled !== true || config.manualReviewDecisionsEnabled !== true) {
    throw new Error('Explicitly enabled manual-review owner decisions required');
  }
  if (!id(config.ownerId) || !id(guildId) || typeof now !== 'function' ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 300000 ||
      !Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100 ||
      !version(config.activeAgreementVersion) || !/^[a-f0-9]{64}$/.test(config.activeAgreementSha256 || '') ||
      !version(config.comprehensionCheck?.version)) throw new Error('Explicit valid owner-decision scope required');
  const scope = Object.freeze({ ownerId: config.ownerId, guildId, agreementVersion: config.activeAgreementVersion,
    agreementHash: config.activeAgreementSha256, checkVersion: config.comprehensionCheck.version });
  const pending = new Map();
  function authorize(actorId, actualGuildId) {
    if (actorId !== scope.ownerId || actualGuildId !== scope.guildId) throw new Error('Owner authorization in the configured server required');
  }
  function clock() {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - ttlMs) throw new Error('Invalid confirmation clock');
    return value;
  }
  function fingerprint(record) {
    if (!hasManualReviewAcknowledgment(record) || record.status !== 'pending' ||
        record.approved_by != null || record.approved_at != null ||
        (record.student_id != null && (typeof record.student_id !== 'string' || !record.student_id.trim())) ||
        record.agreement_version !== scope.agreementVersion || record.agreement_content_sha256 !== scope.agreementHash ||
        record.comprehension_check_version !== scope.checkVersion) throw new Error('Current complete pending manual-review record required');
    const snapshot = record.comprehension_review_snapshot;
    const binding = [scope, record.discord_user_id, record.status, record.student_id ?? null,
      record.signature_method, record.agreement_version, record.agreement_content_sha256,
      stamp(record.acknowledged_at), stamp(record.learner_confirmed_read_at),
      record.age_eligible, record.age_declaration_version, stamp(record.age_declared_at),
      record.comprehension_check_version, stamp(record.comprehension_submitted_at), stamp(record.updated_at),
      snapshot.formatVersion, snapshot.checkVersion, snapshot.items.map(item => [item.question, item.response, item.expectedAnswer])];
    return createHash('sha256').update(JSON.stringify(binding), 'utf8').digest('hex');
  }
  return Object.freeze({
    issue({ actorId, actualGuildId, record, action, reason, reviewedResponses } = {}) {
      authorize(actorId, actualGuildId);
      if (!['approve', 'deny'].includes(action) || reviewedResponses !== true || typeof reason !== 'string' ||
          !reason.trim() || reason.length > 1000) throw new Error('Explicit response review, decision, and bounded reason required');
      const digest = fingerprint(record), issuedAt = clock();
      for (const [token, entry] of pending) if (entry.expiresAt <= issuedAt || entry.issuedAt > issuedAt) pending.delete(token);
      if (pending.size >= capacity) throw new Error('Too many pending owner-decision confirmations');
      const token = randomUUID(), expiresAt = issuedAt + ttlMs;
      pending.set(token, Object.freeze({ actorId, guildId: scope.guildId, studentDiscordId: record.discord_user_id,
        action, reason: reason.trim(), reviewFingerprint: digest, issuedAt, expiresAt }));
      return Object.freeze({ token, studentDiscordId: record.discord_user_id, action, expiresAt });
    },
    consume({ actorId, actualGuildId, token, record } = {}) {
      authorize(actorId, actualGuildId);
      const entry = typeof token === 'string' ? pending.get(token) : undefined;
      if (!entry) throw new Error('Confirmation unavailable, consumed, canceled, or invalidated by restart');
      pending.delete(token);
      const current = clock();
      if (current < entry.issuedAt || current >= entry.expiresAt) throw new Error('Confirmation expired or clock changed');
      if (record?.discord_user_id !== entry.studentDiscordId || fingerprint(record) !== entry.reviewFingerprint) {
        throw new Error('Application changed; review it again before deciding');
      }
      return Object.freeze({ actorId: entry.actorId, guildId: entry.guildId, studentDiscordId: entry.studentDiscordId,
        action: entry.action, reason: entry.reason, reviewFingerprint: entry.reviewFingerprint });
    },
    cancel({ actorId, actualGuildId, token } = {}) {
      authorize(actorId, actualGuildId);
      return typeof token === 'string' && pending.delete(token);
    }
  });
}
