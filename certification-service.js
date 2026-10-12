import { randomUUID } from 'node:crypto';

export function createCertificationService(pool, config) {
  function requireOwner(actorId) {
    if (!config.enabled) throw new Error('Certification is disabled');
    if (actorId !== config.ownerId) throw new Error('Owner authorization required');
  }

  async function approveEnrollment(actorId, studentDiscordId) {
    requireOwner(actorId);
    if (!/^\d{17,20}$/.test(studentDiscordId)) throw new Error('Invalid student Discord ID');
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const result = await db.query(
        'SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE',
        [studentDiscordId]
      );
      const enrollment = result.rows[0];
      if (!enrollment) throw new Error('Enrollment request not found');
      if (enrollment.status === 'approved') {
        await db.query('COMMIT');
        return { studentId: enrollment.student_id, alreadyApproved: true };
      }
      if (enrollment.status !== 'pending') throw new Error('Only pending requests can be approved; reinstatement is separate');
      if (!enrollment.agreement_version || !enrollment.acknowledged_at ||
          !enrollment.signature_method || !enrollment.signature_reference ||
          !enrollment.learner_confirmed_read_at || !enrollment.comprehension_passed_at) {
        throw new Error('Complete acknowledgment, signing record, and comprehension check required');
      }
      const studentId = enrollment.student_id || `NG-PT-${randomUUID()}`;
      await db.query(
        `UPDATE certification_enrollments
         SET status='approved', student_id=$2, approved_by=$3, approved_at=NOW(),
             status_reason=NULL, updated_at=NOW() WHERE discord_user_id=$1`,
        [studentDiscordId, studentId, actorId]
      );
      await db.query(
        `INSERT INTO certification_audit_events
         (actor_discord_user_id, subject_discord_user_id, action, details)
         VALUES ($1,$2,'enrollment_approved',$3::jsonb)`,
        [actorId, studentDiscordId, JSON.stringify({ studentId, agreementVersion: enrollment.agreement_version })]
      );
      await db.query('COMMIT');
      return { studentId, alreadyApproved: false };
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      db.release();
    }
  }

  async function getCourseAuthorization(studentDiscordId) {
    if (!config.enabled) return null;
    const result = await pool.query(
      `SELECT student_id FROM certification_enrollments
       WHERE discord_user_id=$1 AND status='approved'`, [studentDiscordId]
    );
    return result.rows[0] || null;
  }

  return Object.freeze({ approveEnrollment, getCourseAuthorization });
}
