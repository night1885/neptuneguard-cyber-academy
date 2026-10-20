import { auditDeletionEligibleAt } from './certification-retention-deadlines.js';

const discordId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const maxId = 9223372036854775807n;
function bigintId(value) { return typeof value === 'string' && /^(?:0|[1-9][0-9]{0,18}|-[1-9][0-9]{0,18})$/.test(value) && BigInt(value) >= -maxId - 1n && BigInt(value) <= maxId; }
function microInstant(value) {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$/.test(value)) throw new Error('Canonical UTC timestamp with six fractional digits required');
  const base = value.slice(0, 23) + 'Z', date = new Date(base);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== base || date.getUTCFullYear() < 1970 || date.getUTCFullYear() > 9998) throw new Error('Unsupported UTC timestamp');
  return { date, remainder: value.slice(23, 26), epoch: BigInt(date.getTime()) * 1000n + BigInt(value.slice(23, 26)) };
}
export function classifyAuditRetention(record, asOfUtc, { unreviewedForeignKeys = false } = {}) {
  const cutoff = microInstant(asOfUtc);
  const result = { eventId: record?.event_id ?? null, occurredAt: record?.occurred_at_utc ?? null, timingEligibleAt: null,
    timingEligible: false, disposition: 'review_required', reasons: [] };
  if (!bigintId(record?.event_id) || BigInt(record.event_id) <= 0n) return { ...result, reasons: ['unsupported_event_id'] };
  let occurred;
  try { occurred = microInstant(record.occurred_at_utc); } catch { return { ...result, reasons: ['unsupported_event_timestamp'] }; }
  const deadline = auditDeletionEligibleAt(occurred.date);
  if (deadline.getUTCFullYear() > 9998) return { ...result, reasons: ['unsupported_deadline_range'] };
  result.timingEligibleAt = deadline.toISOString().slice(0, 23) + occurred.remainder + 'Z';
  result.timingEligible = BigInt(deadline.getTime()) * 1000n + BigInt(occurred.remainder) <= cutoff.epoch;
  result.disposition = result.timingEligible ? (unreviewedForeignKeys ? 'blocked' : 'timing_candidate') : 'not_due';
  result.reasons = !result.timingEligible ? ['timing_boundary_not_reached'] : unreviewedForeignKeys ? ['unreviewed_foreign_key_dependencies'] : [];
  return result;
}
const dependencySql = `SELECT n.nspname AS table_schema,c.relname AS table_name,k.conname AS constraint_name
  FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE k.contype='f' AND k.confrelid=to_regclass('certification_audit_events') ORDER BY n.nspname,c.relname,k.conname`;
const pageSql = `SELECT event_id::text AS event_id,
  to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at_utc
  FROM certification_audit_events WHERE ($1::bigint IS NULL OR event_id>$1::bigint) ORDER BY event_id LIMIT $2`;
export function createAuditRetentionPreview(pool, { ownerId, previewEnabled = false } = {}) {
  if (!discordId(ownerId)) throw new Error('Explicit preview owner required');
  return Object.freeze({ async preview(actorId, { asOfUtc, limit = 100, afterEventId = null } = {}) {
    if (previewEnabled !== true || !discordId(actorId) || actorId !== ownerId) throw new Error('Enabled retention preview and owner authorization required');
    microInstant(asOfUtc);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 250 || (afterEventId !== null && !bigintId(afterEventId))) throw new Error('Bounded limit and exact bigint cursor required');
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const dependencies = (await db.query(dependencySql)).rows;
      const rows = (await db.query(pageSql, [afterEventId, limit + 1])).rows, hasMore = rows.length > limit;
      const selected = rows.slice(0, limit);
      const records = selected.map(record => classifyAuditRetention(record, asOfUtc, { unreviewedForeignKeys: dependencies.length > 0 }));
      await db.query('COMMIT');
      return { planningOnly: true, executionAuthorized: false, preservationReviewed: false, providerCopiesVerified: false,
        evaluatedAsOfUtc: asOfUtc, enrollmentRecordsEvaluated: false, auditScanComplete: afterEventId === null && !hasMore,
        hasMore, nextAfterEventId: hasMore ? selected.at(-1).event_id : null, unreviewedForeignKeys: dependencies, records };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  } });
}
