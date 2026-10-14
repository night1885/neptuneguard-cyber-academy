import { randomUUID } from 'node:crypto';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

export function createCertificationService(pool, config) {
  function requireOwner(actorId) {
    if (!config.enabled) throw new Error('Certification is disabled');
    if (actorId !== config.ownerId) throw new Error('Owner authorization required');
  }
  function complete(row) {
    return hasCompleteAccountAcknowledgment(row) &&
      (!config.activeAgreementVersion || row.agreement_version === config.activeAgreementVersion) &&
      (!config.activeAgreementSha256 || row.agreement_content_sha256 === config.activeAgreementSha256) &&
      (!config.comprehensionCheck?.version || row.comprehension_check_version === config.comprehensionCheck.version);
  }
  async function approveEnrollment(actorId, studentDiscordId) {
    requireOwner(actorId);
    if (typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid student Discord ID');
    const db = await pool.connect();
    let discard = false;
    try {
      await db.query('BEGIN');
      const enrollment = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      if (!enrollment) throw new Error('Enrollment request not found');
      if (!complete(enrollment)) throw new Error('Complete current account acknowledgment and self-declared age 18 eligibility required');
      if (enrollment.status === 'approved') {
        if (!enrollment.student_id || !enrollment.approved_by || !enrollment.approved_at) throw new Error('Approved enrollment is incomplete');
        await db.query('COMMIT');
        return { studentId: enrollment.student_id, alreadyApproved: true };
      }
      if (enrollment.status !== 'pending') throw new Error('Only pending requests can be approved; reinstatement is separate');
      const studentId = enrollment.student_id || `NG-PT-${randomUUID()}`;
      await db.query(`UPDATE certification_enrollments SET status='approved', student_id=$2, approved_by=$3, approved_at=NOW(), status_reason=NULL, updated_at=NOW() WHERE discord_user_id=$1`, [studentDiscordId, studentId, actorId]);
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$2,'enrollment_approved',$3::jsonb)`,
        [actorId, studentDiscordId, JSON.stringify({ studentId, agreementVersion: enrollment.agreement_version, acknowledgmentMethod: 'discord_account', ageDeclarationVersion: enrollment.age_declaration_version })]);
      await db.query('COMMIT');
      return { studentId, alreadyApproved: false };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  async function getCourseAuthorization(studentDiscordId) {
    if (!config.enabled || typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) return null;
    const row = (await pool.query(`SELECT * FROM certification_enrollments WHERE discord_user_id=$1 AND status='approved'`, [studentDiscordId])).rows[0];
    if (!row || row.status !== 'approved' || !row.student_id || !row.approved_by || !row.approved_at || !complete(row)) return null;
    return { student_id: row.student_id };
  }
  return Object.freeze({ approveEnrollment, getCourseAuthorization });
}
