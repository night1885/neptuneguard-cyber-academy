import { randomUUID } from 'node:crypto';
import { hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';
import { hasCurrentAgeEligibility, CERTIFICATION_AGE_POLICY_VERSION } from './certification-age-evidence.js';
import { createCertificationService } from './certification-service.js';

export function createAgeCheckedCertificationService(pool, config) {
  const existing = createCertificationService(pool, config);
  async function approveEnrollment(actorId, studentDiscordId) {
    if (!config.enabled) throw new Error('Certification is disabled');
    if (actorId !== config.ownerId) throw new Error('Owner authorization required');
    if (typeof studentDiscordId !== 'string' || !/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid student Discord ID');
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN');
      const row = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [studentDiscordId])).rows[0];
      if (!row) throw new Error('Enrollment request not found');
      if (row.status === 'approved') {
        if (!row.student_id) throw new Error('Approved enrollment is missing its permanent student ID');
        await db.query('COMMIT'); return { studentId: row.student_id, alreadyApproved: true };
      }
      if (row.status !== 'pending') throw new Error('Only pending requests can be approved; reinstatement is separate');
      if (!hasCompleteTypedAcknowledgment(row)) throw new Error('Complete acknowledgment with typed name, reading confirmation, and comprehension check required');
      if (!hasCurrentAgeEligibility(row)) throw new Error('Current self-reported age eligibility is required; request fresh learner confirmation before approval');
      const studentId = row.student_id || `NG-PT-${randomUUID()}`;
      await db.query(`UPDATE certification_enrollments SET status='approved', student_id=$2, approved_by=$3, approved_at=NOW(), status_reason=NULL, updated_at=NOW() WHERE discord_user_id=$1`, [studentDiscordId, studentId, actorId]);
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$2,'enrollment_approved',$3::jsonb)`, [actorId, studentDiscordId, JSON.stringify({ studentId, agreementVersion: row.agreement_version, acknowledgmentMethod: 'typed_name', agePolicyVersion: CERTIFICATION_AGE_POLICY_VERSION, ageEligibilityMethod: 'self_report' })]);
      await db.query('COMMIT'); return { studentId, alreadyApproved: false };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ approveEnrollment, getCourseAuthorization: existing.getCourseAuthorization });
}
