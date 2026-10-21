import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';

export function createOwnerRegistrationService(pool, config) {
  const pilotPolicy = registrationPilotPolicy(config);
  return Object.freeze({
    async register(actorId, discordUserId) {
      if (!config.enabled || actorId !== config.ownerId) throw new Error('Owner authorization required');
      if (typeof discordUserId !== 'string' || !/^\d{17,20}$/.test(discordUserId)) throw new Error('Invalid student Discord ID');
      if (pilotPolicy) {
        if (!pilotPolicy.owner(actorId)) throw new Error('Pilot owner authorization required');
        pilotPolicy.assertTarget(discordUserId);
      }
      const db = await pool.connect();
      let discard = false;
      try {
        await db.query('BEGIN');
        const inserted = await db.query(
          `INSERT INTO certification_enrollments (discord_user_id, status) VALUES ($1, 'awaiting_acknowledgment') ON CONFLICT (discord_user_id) DO NOTHING RETURNING discord_user_id, status, student_id`,
          [discordUserId]
        );
        let record = inserted.rows[0];
        const created = Boolean(record);
        if (created) {
          await db.query(
            `INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1, $2, 'student_registered_by_owner', $3::jsonb)`,
            [actorId, discordUserId, JSON.stringify({ status: 'awaiting_acknowledgment', accessGranted: false })]
          );
        } else {
          record = (await db.query('SELECT discord_user_id, status, student_id FROM certification_enrollments WHERE discord_user_id=$1', [discordUserId])).rows[0];
          if (!record) throw new Error('Student record changed concurrently; retry registration');
        }
        await db.query('COMMIT');
        return { created, record };
      } catch (error) {
        try { await db.query('ROLLBACK'); } catch { discard = true; }
        throw error;
      } finally {
        db.release(discard);
      }
    }
  });
}
