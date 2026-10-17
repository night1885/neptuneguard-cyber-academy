const discordId = value => typeof value === 'string' && /^\d{17,20}$/.test(value);

// Retain the existing audit action name; historical event identifiers are not UI labels.
export const PENDING_REGISTRATION_INVITATION_SQL = `SELECT 1 AS invited
  FROM certification_enrollments e
  WHERE e.discord_user_id=$1
    AND e.status='awaiting_acknowledgment'
    AND e.student_id IS NULL AND e.approved_by IS NULL AND e.approved_at IS NULL
    AND e.acknowledgment_name IS NULL AND e.signature_reference IS NULL
    AND EXISTS (SELECT 1 FROM certification_audit_events a
      WHERE a.subject_discord_user_id=e.discord_user_id
        AND a.actor_discord_user_id=$2
        AND a.action='student_registered_by_owner')
  LIMIT 1`;

export function createRegistrationInvitationReader(pool, config) {
  return Object.freeze({
    async hasPendingInvitation(studentDiscordId) {
      if (config.enabled !== true || !discordId(config.ownerId) || !discordId(studentDiscordId)) return false;
      const result = await pool.query(PENDING_REGISTRATION_INVITATION_SQL, [studentDiscordId, config.ownerId]);
      return result.rows.length === 1 && result.rows[0].invited === 1;
    }
  });
}
