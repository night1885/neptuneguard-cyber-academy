import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';

const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const categories = ['denied', 'withdrawn', 'abandoned'];
const fields = ['application_closed_at', 'application_closed_by', 'application_closed_as'];

function closureResult(row, alreadyClosed) {
  if (row.status !== 'denied' || row.student_id != null || row.approved_by != null || row.approved_at != null ||
      row.application_closed_at == null || !validId(row.application_closed_by) || !categories.includes(row.application_closed_as)) {
    throw new Error('Recorded application closure is incomplete or inconsistent');
  }
  const deadline = applicationDeletionEligibleAt(row.application_closed_at);
  return Object.freeze({ status: 'denied', closureCategory: row.application_closed_as,
    closedAt: new Date(row.application_closed_at).toISOString(), closedBy: row.application_closed_by,
    deletionEligibleAt: deadline.toISOString(), alreadyClosed });
}

// Staged service only: no runtime route, scheduler, or deletion is installed here.
export function createCertificationApplicationClosure(pool, config = {}, { now = () => new Date() } = {}) {
  const enabled = config.enabled === true, ownerId = config.ownerId;
  async function closeApplication(actorId, studentDiscordId, category) {
    if (!enabled || !validId(actorId) || actorId !== ownerId) throw new Error('Enabled certification and owner authorization required');
    if (!validId(studentDiscordId)) throw new Error('Invalid student Discord ID');
    if (!categories.includes(category)) throw new Error('Invalid application closure category');
    const db = await pool.connect();
    let discard = false;
    try {
      await db.query('BEGIN');
      const row = (await db.query(`SELECT discord_user_id,status,student_id,approved_by,approved_at,
        application_closed_at,application_closed_by,application_closed_as
        FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE`, [studentDiscordId])).rows[0];
      if (!row) throw new Error('Enrollment request not found');
      if (!fields.every(field => Object.hasOwn(row, field))) throw new Error('Application closure schema required');
      if (fields.some(field => row[field] != null)) {
        const result = closureResult(row, true);
        if (result.closureCategory !== category) throw new Error('Application already closed under a different category');
        await db.query('COMMIT');
        return result;
      }
      if (row.student_id != null || row.approved_by != null || row.approved_at != null) throw new Error('Issued-ID or previously approved enrollment requires separate review');
      if (!['awaiting_acknowledgment', 'pending', 'denied'].includes(row.status)) throw new Error('Enrollment status does not permit application closure');
      const value = now();
      applicationDeletionEligibleAt(value);
      const closedAt = new Date(value).toISOString();
      const update = await db.query(`UPDATE certification_enrollments SET status='denied',
        application_closed_at=$2,application_closed_by=$3,application_closed_as=$4,updated_at=$2
        WHERE discord_user_id=$1 RETURNING discord_user_id,status,student_id,approved_by,approved_at,
        application_closed_at,application_closed_by,application_closed_as`, [studentDiscordId, closedAt, actorId, category]);
      if (update.rowCount !== 1 || update.rows.length !== 1) throw new Error('Application closure update was not recorded');
      const result = closureResult(update.rows[0], false);
      if (result.closedAt !== closedAt || result.closedBy !== actorId || result.closureCategory !== category) throw new Error('Application closure update did not match the request');
      await db.query(`INSERT INTO certification_audit_events
        (actor_discord_user_id,subject_discord_user_id,action,details,created_at)
        VALUES ($1,$2,'application_closed',$3::jsonb,$4)`, [actorId, studentDiscordId,
        JSON.stringify({ from: row.status, to: 'denied', closureCategory: category, closedAt }), closedAt]);
      await db.query('COMMIT');
      return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ closeApplication });
}
