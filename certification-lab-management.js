const uuid = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const transitions = Object.freeze({
  deny: Object.freeze({ from: ['pending'], to: 'denied', auditAction: 'lab_request_denied' }),
  revoke: Object.freeze({ from: ['approved', 'suspended'], to: 'revoked', auditAction: 'lab_request_revoked' }),
  suspend: Object.freeze({ from: ['approved'], to: 'suspended', auditAction: 'lab_request_suspended' })
});

export function createCertificationLabManagement(pool, config) {
  async function changeLabStatus(actorId, requestId, action, reason) {
    if (!config.enabled || actorId !== config.ownerId) throw new Error('Enabled certification and owner authorization required');
    if (typeof requestId !== 'string' || !uuid.test(requestId)) throw new Error('Invalid lab request ID');
    if (!Object.hasOwn(transitions, action)) throw new Error('Unsupported lab-management action');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw new Error('A reason of 1–1000 characters is required');
    const transition = transitions[action];
    const sessionTerminationRequired = action === 'revoke' || action === 'suspend';
    const db = await pool.connect();
    let discard = false;
    try {
      await db.query('BEGIN');
      const record = (await db.query('SELECT request_id, discord_user_id, status FROM certification_lab_requests WHERE request_id=$1::uuid FOR UPDATE', [requestId])).rows[0];
      if (!record) throw new Error('Lab request not found');
      if (record.status === transition.to) {
        await db.query('COMMIT');
        return { requestId: record.request_id, studentDiscordId: record.discord_user_id, status: record.status, alreadyApplied: true, sessionTerminationRequired };
      }
      if (!transition.from.includes(record.status)) throw new Error('Lab request status does not permit this action');
      const result = await db.query('UPDATE certification_lab_requests SET status=$2, status_reason=$3, updated_at=NOW() WHERE request_id=$1::uuid AND status=$4 RETURNING request_id', [requestId, transition.to, reason.trim(), record.status]);
      if (result.rowCount !== 1) throw new Error('Lab request changed; refresh before retrying');
      await db.query(`INSERT INTO certification_audit_events (actor_discord_user_id, subject_discord_user_id, action, details) VALUES ($1,$2,$3,$4::jsonb)`,
        [actorId, record.discord_user_id, transition.auditAction, JSON.stringify({ requestId: record.request_id, from: record.status, to: transition.to, reason: reason.trim(), providerSessionTerminated: false })]);
      await db.query('COMMIT');
      return { requestId: record.request_id, studentDiscordId: record.discord_user_id, status: transition.to, alreadyApplied: false, sessionTerminationRequired };
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ changeLabStatus });
}
