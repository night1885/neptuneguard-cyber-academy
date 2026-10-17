import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

export function createCertificationAccessManagement(pool, config) {
  const transitions = {
    deny: { from: ['pending'], to: 'denied' },
    suspend: { from: ['approved'], to: 'suspended' },
    revoke: { from: ['approved', 'suspended'], to: 'revoked' },
    reinstate: { from: ['suspended', 'revoked'], to: 'approved' }
  };
  async function changeEnrollmentStatus(actorId, studentDiscordId, action, reason) {
    if (!config.enabled || actorId !== config.ownerId) throw new Error('Enabled certification and owner authorization required');
    if (typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid student Discord ID');
    const transition = Object.hasOwn(transitions, action) ? transitions[action] : null;
    if (!transition) throw new Error('Invalid access-management action');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw new Error('A reason of 1–1000 characters is required');
    const db = await pool.connect();
    let discard = false;
    try {
      await db.query('BEGIN');
      const row = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      if (!row || !transition.from.includes(row.status)) throw new Error('Enrollment status does not permit this action');
      if (action === 'reinstate' && (typeof row.student_id !== 'string' || !row.student_id.trim() || !row.approved_by || !row.approved_at || !hasCompleteAccountAcknowledgment(row) ||
          (config.activeAgreementVersion && row.agreement_version !== config.activeAgreementVersion) ||
          (config.activeAgreementSha256 && row.agreement_content_sha256 !== config.activeAgreementSha256) ||
          (config.comprehensionCheck?.version && row.comprehension_check_version !== config.comprehensionCheck.version))) throw new Error('Prior approval, current account acknowledgment, and self-declared age 18 eligibility required for reinstatement');
      await db.query(`UPDATE certification_enrollments SET status=$2, status_reason=$3, updated_at=NOW() WHERE discord_user_id=$1`, [studentDiscordId, transition.to, reason.trim()]);
      let revokedLabRequests = [];
      if (action === 'suspend' || action === 'revoke') {
        const labs = await db.query(`UPDATE certification_lab_requests SET status='revoked', status_reason=$2, updated_at=NOW() WHERE discord_user_id=$1 AND status IN ('pending','approved','suspended') RETURNING request_id`, [studentDiscordId, `Course access ${transition.to}: ${reason.trim()}`]);
        revokedLabRequests = labs.rows.map(lab => lab.request_id);
      }
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$2,$3,$4::jsonb)`,
        [actorId, studentDiscordId, `enrollment_${action}`, JSON.stringify({ from: row.status, to: transition.to, reason: reason.trim(), studentId: row.student_id, revokedLabRequests })]);
      await db.query('COMMIT');
      return { status: transition.to, studentId: row.student_id, revokedLabRequests, sessionTerminationRequired: action === 'suspend' || action === 'revoke' };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ changeEnrollmentStatus });
}
