const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const validUuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
export function createCourseRequestReader(pool, config) {
  if (typeof pool?.query !== 'function' || config?.enabled !== true || !validId(config.ownerId)) throw new Error('Explicit enabled course request reader required');
  const owner = config.ownerId;
  const actor = id => { if (!validId(id)) throw new Error('Invalid reader actor'); };
  const page = n => { if (!Number.isInteger(n) || n < 0 || n > 9999) throw new Error('Invalid reader page'); };
  const requireOwner = id => { actor(id); if (id !== owner) throw new Error('Owner request reader required'); };
  const columns = 'request_id,discord_user_id,course_key,status,requested_at,reviewed_at,reviewed_by';
  return Object.freeze({
    async listMine(id, n) {
      actor(id); page(n);
      return (await pool.query(`SELECT ${columns} FROM certification_course_requests WHERE discord_user_id=$1 ORDER BY requested_at DESC,request_id DESC LIMIT 6 OFFSET $2`, [id, n * 5])).rows;
    },
    async listPending(id, n) {
      requireOwner(id); page(n);
      return (await pool.query(`SELECT ${columns} FROM certification_course_requests WHERE status='pending' ORDER BY requested_at,request_id LIMIT 5 OFFSET $1`, [n * 4])).rows;
    },
    async getRequest(id, requestId) {
      requireOwner(id); if (!validUuid(requestId)) throw new Error('Invalid request ID');
      return (await pool.query(`SELECT ${columns} FROM certification_course_requests WHERE request_id=$1`, [requestId])).rows[0] || null;
    }
  });
}
