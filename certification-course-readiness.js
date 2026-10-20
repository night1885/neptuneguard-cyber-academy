import { validateCertificationSchema } from './certification-schema-readiness.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createProtectedCourseNavigation } from './certification-course-navigation.js';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';

const columns = { discord_user_id: ['text', true], course_key: ['text', true], status: ['text', true],
  assigned_at: ['timestamp with time zone', true], assigned_by: ['text', true],
  completed_at: ['timestamp with time zone', false], completed_by: ['text', false] };
const permissions = ['direct_login', 'origin_mode', 'restricted_role', 'not_owner', 'no_schema_create',
  'read_enrollment', 'lock_enrollment', 'read_courses', 'insert_courses', 'update_courses', 'insert_audit', 'use_sequence', 'no_destructive', 'no_audit_update'];

export async function validateCourseLifecycleReadiness(pool) {
  const db = await pool.connect(); let discard = false;
  try {
    await db.query('BEGIN READ ONLY');
    await validateCertificationSchema(db);
    const tables = (await db.query(`SELECT e.oid AS enrollment,c.oid AS courses,a.oid AS audit,
      e.relnamespace=c.relnamespace AND e.relnamespace=a.relnamespace AS same_schema,
      (SELECT attnum FROM pg_attribute WHERE attrelid=e.oid AND attname='discord_user_id' AND NOT attisdropped) AS subject_column
      FROM pg_class e,pg_class c,pg_class a WHERE e.oid=to_regclass('certification_enrollments')
        AND c.oid=to_regclass('certification_course_enrollments') AND a.oid=to_regclass('certification_audit_events')`)).rows[0];
    if (!tables || tables.same_schema !== true || !tables.subject_column) throw new Error('Reviewed course table and consistent schema required; migration 007 is not ready');
    const rootColumns = (await db.query('SELECT attname FROM pg_attribute WHERE attrelid=$1::oid AND attnum>0 AND NOT attisdropped', [tables.enrollment])).rows;
    if (['application_closed_at', 'application_closed_by', 'application_closed_as'].some(name => !rootColumns.some(column => column.attname === name))) throw new Error('Closure metadata from migration 006 required');
    const attributes = (await db.query(`SELECT attname,attnum,format_type(atttypid,atttypmod) AS type,attnotnull,atthasdef,attgenerated,attidentity
      FROM pg_attribute WHERE attrelid=$1::oid AND attnum>0 AND NOT attisdropped`, [tables.courses])).rows;
    const byName = new Map(attributes.map(column => [column.attname, column]));
    for (const [name, [type, required]] of Object.entries(columns)) {
      const column = byName.get(name);
      if (!column || column.type !== type || column.attnotnull !== required || column.atthasdef !== false || column.attgenerated !== '' || column.attidentity !== '') throw new Error('Course lifecycle column definitions are incomplete or unexpected');
    }
    const constraints = (await db.query(`SELECT conname,contype,convalidated,condeferrable,conkey,confkey,confrelid,confdeltype
      FROM pg_constraint WHERE conrelid=$1::oid`, [tables.courses])).rows;
    const subject = byName.get('discord_user_id').attnum, course = byName.get('course_key').attnum;
    if (!constraints.some(row => row.contype === 'p' && row.convalidated === true && row.conkey?.length === 2 && row.conkey[0] === subject && row.conkey[1] === course)) throw new Error('Course account/key primary key required');
    if (!constraints.some(row => row.conname === 'certification_course_enrollments_discord_user_id_fkey' && row.contype === 'f' && row.convalidated === true &&
        row.condeferrable === false && row.confrelid === tables.enrollment && row.confdeltype === 'r' && row.conkey?.length === 1 && row.conkey[0] === subject && row.confkey?.length === 1 && row.confkey[0] === tables.subject_column)) throw new Error('Restrictive course-to-enrollment foreign key required');
    const checks = constraints.filter(row => row.contype === 'c');
    if (checks.length < 6 || checks.some(row => row.convalidated !== true)) throw new Error('Validated course lifecycle CHECK safeguards required');
    const triggers = (await db.query(`SELECT t.tgname,t.tgenabled,t.tgtype,t.tgattr::text AS attributes,t.tgqual IS NULL AS unconditional,
      p.proname,p.pronargs,p.prosecdef,p.pronamespace=c.relnamespace AS local_function
      FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_class c ON c.oid=t.tgrelid
      WHERE t.tgrelid=$1::oid AND NOT t.tgisinternal`, [tables.courses])).rows;
    if (!triggers.some(row => row.tgname === 'certification_course_lifecycle_immutable' && ['O', 'A'].includes(row.tgenabled) && row.tgtype === 19 &&
        row.attributes === '' && row.unconditional === true && row.proname === 'certification_preserve_course_lifecycle' && row.pronargs === 0 && row.prosecdef === false && row.local_function === true)) throw new Error('Enabled course lifecycle trigger required');
    const access = (await db.query(`SELECT current_user=session_user AS direct_login,current_setting('session_replication_role')='origin' AS origin_mode,
      NOT EXISTS (SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND
        (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted_role,
      NOT EXISTS (SELECT 1 FROM pg_class WHERE oid IN ($1::oid,$2::oid,$3::oid) AND pg_has_role(current_user,relowner,'MEMBER')) AS not_owner,
      NOT has_schema_privilege(current_user,(SELECT relnamespace FROM pg_class WHERE oid=$2::oid),'CREATE') AS no_schema_create,
      has_table_privilege(current_user,$1::oid,'SELECT') AS read_enrollment,has_any_column_privilege(current_user,$1::oid,'UPDATE') AS lock_enrollment,
      has_table_privilege(current_user,$2::oid,'SELECT') AS read_courses,has_table_privilege(current_user,$2::oid,'INSERT') AS insert_courses,
      has_table_privilege(current_user,$2::oid,'UPDATE') AS update_courses,has_table_privilege(current_user,$3::oid,'INSERT') AS insert_audit,
      has_sequence_privilege(current_user,pg_get_serial_sequence($3::regclass::text,'event_id'),'USAGE') AS use_sequence,
      NOT EXISTS (SELECT 1 FROM unnest(ARRAY[$1::oid,$2::oid,$3::oid]) AS target(oid) WHERE has_table_privilege(current_user,target.oid,'DELETE,TRUNCATE,TRIGGER')) AS no_destructive,
      NOT has_any_column_privilege(current_user,$3::oid,'UPDATE') AS no_audit_update`, [tables.enrollment, tables.courses, tables.audit])).rows[0];
    if (!access || permissions.some(name => access[name] !== true)) throw new Error('Course runtime database privileges are missing or excessive');
    await db.query('COMMIT'); return Object.freeze({ ready: true });
  } catch (error) {
    try { await db.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally { db.release(discard); }
}

export async function createReadyCourseLifecycle(pool, config, options) {
  if (config?.enabled !== true || typeof config.ownerId !== 'string' || !/^[0-9]{17,20}$/.test(config.ownerId)) throw new Error('Enabled certification and configured owner required');
  const service = createCertificationCourseLifecycle(pool, config, options);
  await validateCourseLifecycleReadiness(pool); return service;
}
export async function createReadyCourseNavigation(pool, config, guildId, options) {
  const navigation = createProtectedCourseNavigation(pool, config, guildId, { ...options, renderPage: renderStudentCoursePage });
  try { await validateCourseLifecycleReadiness(pool); return navigation; }
  catch (error) { navigation.dispose(); throw error; }
}
