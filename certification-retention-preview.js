import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const instant = value => value instanceof Date && Number.isFinite(value.getTime()) && value.getUTCFullYear() >= 1970 && value.getUTCFullYear() <= 9998;
const countFields = ['course_count', 'active_course_count', 'completed_course_count', 'confirmed_completed_count', 'lab_record_count'];
export function classifyEnrollmentRetention(record, asOf, { unreviewedForeignKeys = false } = {}) {
  if (!instant(asOf)) throw new Error('Explicit supported as-of Date required');
  const result = { discordUserId: record?.discord_user_id ?? null, category: null, disposition: 'not_due', timingEligible: false, timingEligibleAt: null,
    courseRecordCount: record?.course_count ?? null, labRecordCount: record?.lab_record_count ?? null, reasons: [] };
  const review = reason => ({ ...result, disposition: 'review_required', reasons: [reason] });
  if (!record || !id(record.discord_user_id) || countFields.some(name => !Number.isSafeInteger(record[name]) || record[name] < 0)) return review('invalid_identity_or_counts');
  const closure = ['application_closed_at', 'application_closed_by', 'application_closed_as'];
  if (!closure.every(name => Object.hasOwn(record, name))) return review('closure_metadata_missing');
  if (record.active_course_count + record.completed_course_count !== record.course_count || record.confirmed_completed_count > record.completed_course_count) return review('inconsistent_course_counts');
  if (closure.some(name => record[name] != null)) {
    if (record.status !== 'denied' || record.student_id != null || record.approved_by != null || record.approved_at != null || record.course_count !== 0 ||
        !['denied', 'withdrawn', 'abandoned'].includes(record.application_closed_as) || !id(record.application_closed_by) ||
        !instant(record.application_closed_at) || record.closure_millisecond_exact !== true) return review('inconsistent_or_imprecise_application_closure');
    result.category = 'closed_application';
    result.timingEligibleAt = applicationDeletionEligibleAt(record.application_closed_at).toISOString();
  } else if (record.course_count > 0 && record.active_course_count === 0) {
    if (!['approved', 'suspended', 'revoked'].includes(record.status) || typeof record.student_id !== 'string' || !record.student_id.trim() ||
        !id(record.approved_by) || record.approved_at == null || record.confirmed_completed_count !== record.course_count || !instant(record.latest_completed_at)) return review('incomplete_shared_completion_evidence');
    result.category = 'completed_shared_enrollment'; result.timingEligibleAt = record.latest_completed_at.toISOString();
  } else {
    result.reasons = [record.active_course_count > 0 ? 'active_courses_remain' : 'no_recorded_completion_or_explicit_closure']; return result;
  }
  result.timingEligible = new Date(result.timingEligibleAt).getTime() <= asOf.getTime();
  if (!result.timingEligible) { result.reasons = ['timing_boundary_not_reached']; return result; }
  if (record.lab_record_count > 0) result.reasons.push('lab_records_require_separate_retention_review');
  if (unreviewedForeignKeys) result.reasons.push('unreviewed_foreign_key_dependencies');
  result.disposition = result.reasons.length ? 'blocked' : 'timing_candidate';
  return result;
}

const enrollmentSql = `WITH selected AS (
  SELECT discord_user_id,status,student_id,approved_by,approved_at,application_closed_at,application_closed_by,application_closed_as,
    (application_closed_at IS NULL OR (application_closed_at >= TIMESTAMPTZ '1970-01-01 00:00:00+00' AND application_closed_at < TIMESTAMPTZ '9999-01-01 00:00:00+00'
      AND application_closed_at=date_trunc('milliseconds',application_closed_at))) AS closure_millisecond_exact
  FROM certification_enrollments WHERE ($1::text IS NULL OR discord_user_id>$1) ORDER BY discord_user_id LIMIT $2
), course_stats AS (
  SELECT c.discord_user_id,COUNT(*)::int AS course_count,COUNT(*) FILTER (WHERE c.status='active')::int AS active_course_count,
    COUNT(*) FILTER (WHERE c.status='completed')::int AS completed_course_count,
    COUNT(*) FILTER (WHERE c.status='completed' AND c.assigned_by ~ '^[0-9]{17,20}$' AND c.completed_by ~ '^[0-9]{17,20}$'
      AND c.assigned_at >= TIMESTAMPTZ '1970-01-01 00:00:00+00' AND c.completed_at < TIMESTAMPTZ '9999-01-01 00:00:00+00'
      AND c.completed_at>=c.assigned_at AND c.assigned_at=date_trunc('milliseconds',c.assigned_at)
      AND c.completed_at=date_trunc('milliseconds',c.completed_at))::int AS confirmed_completed_count,
    MAX(c.completed_at) FILTER (WHERE c.status='completed') AS latest_completed_at
  FROM certification_course_enrollments c JOIN selected s ON s.discord_user_id=c.discord_user_id GROUP BY c.discord_user_id
), lab_stats AS (
  SELECT l.discord_user_id,COUNT(*)::int AS lab_record_count FROM certification_lab_requests l
  JOIN selected s ON s.discord_user_id=l.discord_user_id GROUP BY l.discord_user_id
) SELECT s.*,COALESCE(c.course_count,0)::int AS course_count,COALESCE(c.active_course_count,0)::int AS active_course_count,
  COALESCE(c.completed_course_count,0)::int AS completed_course_count,COALESCE(c.confirmed_completed_count,0)::int AS confirmed_completed_count,
  c.latest_completed_at,COALESCE(l.lab_record_count,0)::int AS lab_record_count FROM selected s
  LEFT JOIN course_stats c USING(discord_user_id) LEFT JOIN lab_stats l USING(discord_user_id) ORDER BY s.discord_user_id`;
const dependencySql = `SELECT n.nspname AS table_schema,c.relname AS table_name,k.conname AS constraint_name,
  k.confrelid::regclass::text AS parent_table FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace WHERE k.contype='f'
    AND k.confrelid IN (to_regclass('certification_enrollments'),to_regclass('certification_course_enrollments'))
    AND NOT (k.conrelid=to_regclass('certification_course_enrollments') AND k.confrelid=to_regclass('certification_enrollments')
      AND k.conname='certification_course_enrollments_discord_user_id_fkey')
    AND NOT (k.conrelid=to_regclass('certification_lab_requests') AND k.confrelid=to_regclass('certification_enrollments')
      AND k.conname='certification_lab_requests_discord_user_id_fkey') ORDER BY n.nspname,c.relname,k.conname`;
const validCursor = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes(String.fromCharCode(0));

export function createEnrollmentRetentionPreview(pool, { ownerId, previewEnabled = false } = {}) {
  if (!id(ownerId)) throw new Error('Explicit preview owner required');
  return Object.freeze({ async preview(actorId, { asOf, limit = 100, afterDiscordId = null } = {}) {
    if (previewEnabled !== true || !id(actorId) || actorId !== ownerId) throw new Error('Enabled retention preview and owner authorization required');
    if (!instant(asOf) || !Number.isSafeInteger(limit) || limit < 1 || limit > 250 || (afterDiscordId !== null && !validCursor(afterDiscordId))) throw new Error('Explicit as-of Date, bounded limit, and valid cursor required');
    const evaluatedAsOf = new Date(asOf.getTime());
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const dependencies = (await db.query(dependencySql)).rows;
      const page = (await db.query(enrollmentSql, [afterDiscordId, limit + 1])).rows;
      const hasMore = page.length > limit, selected = page.slice(0, limit), last = selected.at(-1)?.discord_user_id;
      const paginationBlocked = hasMore && !validCursor(last);
      const records = selected.map(record => classifyEnrollmentRetention(record, evaluatedAsOf, { unreviewedForeignKeys: dependencies.length > 0 }));
      await db.query('COMMIT');
      return Object.freeze({ planningOnly: true, executionAuthorized: false, evaluatedAsOf: evaluatedAsOf.toISOString(),
        auditEventsEvaluated: false, preservationReviewed: false, providerCopiesVerified: false,
        enrollmentScanComplete: afterDiscordId === null && !hasMore, hasMore, paginationBlocked,
        nextAfterDiscordId: hasMore && !paginationBlocked ? last : null, unreviewedForeignKeys: dependencies, records });
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  } });
}
