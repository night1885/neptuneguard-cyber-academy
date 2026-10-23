import { createHash, randomUUID } from 'node:crypto';
import { createManualReviewDecisionGuard } from './certification-manual-review-decision-guard.mjs';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);

// Staged backend only. No runtime wiring, grants, notifications, or automatic grading.
// prepare() accepts only a server-held copy of the record actually presented for owner review.
export function createManualReviewDecisionService(pool, config, options = {}) {
  const guard = createManualReviewDecisionGuard(config, options);
  if (typeof pool?.connect !== 'function') throw new Error('Transactional database pool required');
  const scope = Object.freeze({ ownerId: config.ownerId, guildId: options.guildId,
    agreementVersion: config.activeAgreementVersion, agreementHash: config.activeAgreementSha256 });
  function authorize(actorId, actualGuildId) {
    if (actorId !== scope.ownerId || actualGuildId !== scope.guildId) throw new Error('Owner authorization in the configured server required');
  }
  async function confirm({ actorId, actualGuildId, studentDiscordId, token } = {}) {
    authorize(actorId, actualGuildId);
    if (!id(studentDiscordId) || !uuid(token)) throw new Error('Valid learner and confirmation required');
    const db = await pool.connect();
    let started = false, commitAttempted = false, discard = false;
    try {
      await db.query('BEGIN');
      started = true;
      await db.query("SET LOCAL lock_timeout = '5s'");
      await db.query("SET LOCAL statement_timeout = '15s'");
      const record = (await db.query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      const decision = guard.consume({ actorId, actualGuildId, token, record });
      const agreement = (await db.query('SELECT content, content_sha256 FROM public.certification_agreements WHERE version=$1 FOR SHARE', [scope.agreementVersion])).rows[0];
      if (!agreement || typeof agreement.content !== 'string' || agreement.content.length > 60000 ||
          agreement.content_sha256 !== scope.agreementHash ||
          createHash('sha256').update(agreement.content, 'utf8').digest('hex') !== scope.agreementHash) {
        throw new Error('Current agreement unavailable or changed; review again');
      }
      const approved = decision.action === 'approve';
      const status = approved ? 'approved' : 'denied';
      const studentId = approved ? record.student_id ?? `NG-PT-${randomUUID()}` : record.student_id ?? null;
      const updated = approved
        ? await db.query("UPDATE public.certification_enrollments SET status='approved', student_id=$2, approved_by=$3, approved_at=NOW(), status_reason=$4, updated_at=NOW() WHERE discord_user_id=$1 AND status='pending' RETURNING status, student_id, approved_by, approved_at", [studentDiscordId, studentId, actorId, decision.reason])
        : await db.query("UPDATE public.certification_enrollments SET status='denied', status_reason=$2, updated_at=NOW() WHERE discord_user_id=$1 AND status='pending' RETURNING status, student_id", [studentDiscordId, decision.reason]);
      const result = updated.rows[0];
      if (updated.rowCount !== 1 || updated.rows.length !== 1 || result?.status !== status || result.student_id !== studentId ||
          (approved && (result.approved_by !== actorId || !result.approved_at))) throw new Error('Decision update did not match the locked application');
      const audit = await db.query('INSERT INTO public.certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$2,$3,$4::jsonb)',
        [actorId, studentDiscordId, approved ? 'enrollment_approved' : 'enrollment_deny', JSON.stringify({
          decisionMethod: 'owner_manual_review', ownerReviewedResponses: true, from: 'pending', to: status,
          reason: decision.reason, reviewFingerprint: decision.reviewFingerprint, studentId,
          agreementVersion: record.agreement_version, comprehensionCheckVersion: record.comprehension_check_version
        })]);
      if (audit.rowCount !== 1) throw new Error('Decision audit event was not recorded');
      commitAttempted = true;
      await db.query('COMMIT');
      return Object.freeze({ status, studentId, reviewFingerprint: decision.reviewFingerprint });
    } catch (error) {
      if (started) {
        try { await db.query('ROLLBACK'); } catch { discard = true; }
      } else discard = true;
      if (commitAttempted) {
        discard = true;
        throw Object.assign(new Error('Decision outcome is unconfirmed. Inspect enrollment status and audit history before any new decision; do not retry automatically.'),
          { code: 'MANUAL_REVIEW_DECISION_OUTCOME_UNCONFIRMED' });
      }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ prepare: input => guard.issue(input), cancel: input => guard.cancel(input), confirm });
}
