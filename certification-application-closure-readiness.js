import { createCertificationApplicationClosure } from './certification-application-closure.js';

const readColumns = ['discord_user_id', 'status', 'student_id', 'approved_by', 'approved_at', 'application_closed_at', 'application_closed_by', 'application_closed_as'];
const updateColumns = ['status', 'application_closed_at', 'application_closed_by', 'application_closed_as', 'updated_at'];
const auditColumns = ['actor_discord_user_id', 'subject_discord_user_id', 'action', 'details', 'created_at'];
const closureTypes = { application_closed_at: 'timestamp with time zone', application_closed_by: 'text', application_closed_as: 'text' };
const permissionChecks = ['direct_login', 'origin_mode', 'restricted_role', 'not_owner', 'no_schema_create', 'can_read', 'can_update', 'can_audit', 'can_sequence', 'no_enrollment_destructive', 'no_audit_mutation'];

export async function validateApplicationClosureReadiness(pool) {
  const db = await pool.connect();
  let discard = false;
  try {
    await db.query('BEGIN READ ONLY');
    const relations = (await db.query(`SELECT to_regclass('certification_enrollments')::oid AS enrollments,
      to_regclass('certification_audit_events')::oid AS audit,
      (SELECT e.relnamespace=a.relnamespace FROM pg_class e,pg_class a
       WHERE e.oid=to_regclass('certification_enrollments') AND a.oid=to_regclass('certification_audit_events')) AS same_schema`)).rows[0];
    if (!relations?.enrollments || !relations.audit || relations.same_schema !== true) throw new Error('Application closure tables are missing or in inconsistent schemas');
    const columns = (await db.query(`SELECT attname,format_type(atttypid,atttypmod) AS type,
      attnotnull,atthasdef,attgenerated,attidentity FROM pg_attribute
      WHERE attrelid=$1::oid AND attnum>0 AND NOT attisdropped`, [relations.enrollments])).rows;
    const byName = new Map(columns.map(column => [column.attname, column]));
    if ([...readColumns, ...updateColumns].some(name => !byName.has(name))) throw new Error('Application closure columns are missing; reviewed migration 006 required');
    for (const [name, type] of Object.entries(closureTypes)) {
      const column = byName.get(name);
      if (column.type !== type || column.attnotnull !== false || column.atthasdef !== false || column.attgenerated !== '' || column.attidentity !== '') {
        throw new Error('Application closure column definitions do not match the reviewed nullable, explicit-value schema');
      }
    }
    const constraints = (await db.query('SELECT conname,contype,convalidated FROM pg_constraint WHERE conrelid=$1::oid', [relations.enrollments])).rows;
    if (!constraints.some(row => row.conname === 'certification_application_closure_complete' && row.contype === 'c' && row.convalidated === true)) throw new Error('Validated application closure constraint required');
    const triggers = (await db.query(`SELECT t.tgname,t.tgenabled,t.tgtype,t.tgattr::text AS columns,t.tgqual IS NULL AS unconditional,
      p.proname,p.pronargs,p.prosecdef,p.pronamespace=c.relnamespace AS local_function
      FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_class c ON c.oid=t.tgrelid
      WHERE t.tgrelid=$1::oid AND NOT t.tgisinternal`, [relations.enrollments])).rows;
    if (!triggers.some(row => row.tgname === 'certification_application_closure_immutable' && ['O', 'A'].includes(row.tgenabled) &&
        row.tgtype === 19 && row.columns === '' && row.unconditional === true && row.proname === 'certification_preserve_application_closure' &&
        row.pronargs === 0 && row.prosecdef === false && row.local_function === true)) throw new Error('Enabled application closure safeguard trigger required');
    const permissions = (await db.query(`SELECT current_user=session_user AS direct_login,
      current_setting('session_replication_role')='origin' AS origin_mode,
      NOT EXISTS (SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER')
        AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted_role,
      NOT pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid=$1::oid),'MEMBER')
        AND NOT pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid=$2::oid),'MEMBER') AS not_owner,
      NOT has_schema_privilege(current_user,(SELECT relnamespace FROM pg_class WHERE oid=$1::oid),'CREATE') AS no_schema_create,
      (SELECT bool_and(has_column_privilege(current_user,$1::oid,name,'SELECT')) FROM unnest($3::text[]) AS cols(name)) AS can_read,
      (SELECT bool_and(has_column_privilege(current_user,$1::oid,name,'UPDATE')) FROM unnest($4::text[]) AS cols(name)) AS can_update,
      (SELECT bool_and(has_column_privilege(current_user,$2::oid,name,'INSERT')) FROM unnest($5::text[]) AS cols(name)) AS can_audit,
      has_sequence_privilege(current_user,pg_get_serial_sequence($2::regclass::text,'event_id'),'USAGE') AS can_sequence,
      NOT has_table_privilege(current_user,$1::oid,'DELETE,TRUNCATE,TRIGGER') AS no_enrollment_destructive,
      NOT has_table_privilege(current_user,$2::oid,'DELETE,TRUNCATE,TRIGGER')
        AND NOT has_any_column_privilege(current_user,$2::oid,'UPDATE') AS no_audit_mutation`,
      [relations.enrollments, relations.audit, readColumns, updateColumns, auditColumns])).rows[0];
    if (!permissions || permissionChecks.some(name => permissions[name] !== true)) throw new Error('Application closure database privileges are missing or excessive');
    await db.query('COMMIT');
    return Object.freeze({ ready: true });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally { db.release(discard); }
}

export async function createReadyCertificationApplicationClosure(pool, config, dependencies) {
  if (config?.enabled !== true || typeof config.ownerId !== 'string' || !/^[0-9]{17,20}$/.test(config.ownerId)) throw new Error('Enabled certification and configured owner required');
  await validateApplicationClosureReadiness(pool);
  return createCertificationApplicationClosure(pool, config, dependencies);
}
