export async function validateCourseRequestReadiness(pool) {
  if (typeof pool?.query !== 'function') throw new Error('Course request database required');
  const target = (await pool.query("SELECT to_regclass('certification_course_requests') AS requests")).rows[0]?.requests;
  if (!target) throw new Error('Course request migration is missing');
  await pool.query('SELECT request_id,discord_user_id,course_key,status,requested_at,reviewed_at,reviewed_by FROM certification_course_requests LIMIT 0');
  const privileges = (await pool.query(`SELECT
    has_table_privilege(current_user,'certification_course_requests','SELECT') AS can_read,
    has_table_privilege(current_user,'certification_course_requests','INSERT') AS can_insert,
    has_table_privilege(current_user,'certification_course_requests','UPDATE') AS can_update`)).rows[0];
  if (!privileges || ['can_read','can_insert','can_update'].some(name => privileges[name] !== true)) throw new Error('Course request privileges are missing');
  const indexes = (await pool.query(`SELECT c.relname,i.indisunique,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS definition
    FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    WHERE i.indrelid=to_regclass('certification_course_requests')`)).rows;
  const pending = indexes.find(row => row.relname === 'certification_one_pending_course_request');
  if (!pending || !pending.indisunique || !pending.indisvalid || !pending.indisready ||
      !/\(discord_user_id, course_key\)/.test(pending.definition || '') || !/WHERE \(status = 'pending'::text\)/.test(pending.definition || '')) throw new Error('Pending course request uniqueness is not ready');
  const triggers = (await pool.query(`SELECT tgname,tgenabled FROM pg_trigger
    WHERE tgrelid=to_regclass('certification_course_requests') AND NOT tgisinternal`)).rows;
  if (!triggers.some(row => row.tgname === 'certification_course_request_immutable' && ['O','A'].includes(row.tgenabled))) throw new Error('Course request immutability trigger is missing');
  return Object.freeze({ ready: true });
}
