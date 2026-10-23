const identifier = value => typeof value === 'string' && /^[a-z_][a-z0-9_]{0,62}$/.test(value);
const shapes = ['e', 'g', 'a'].map(alias => `${alias}.relkind='r' AND NOT ${alias}.relrowsecurity AND NOT ${alias}.relforcerowsecurity AND NOT ${alias}.relispartition
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=${alias}.oid OR inhparent=${alias}.oid)
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=${alias}.oid)`).join(' AND ');
export const manualReviewDecisionCapabilitiesSql = `SELECT
  current_user=session_user AND current_user=$1::pg_catalog.name AND pg_catalog.current_database()=$2::pg_catalog.text AS identity,
  r.rolcanlogin AND NOT r.rolinherit AND NOT r.rolsuper AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND NOT r.rolreplication AND NOT r.rolbypassrls
    AND pg_catalog.current_setting('session_replication_role')='origin'
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=r.oid) AS restricted_login,
  pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AND NOT pg_catalog.has_schema_privilege(current_user,n.oid,'CREATE')
    AND NOT pg_catalog.has_database_privilege(current_user,d.oid,'CREATE')
    AND NOT pg_catalog.pg_has_role(current_user,d.datdba,'MEMBER')
    AND NOT pg_catalog.pg_has_role(current_user,n.nspowner,'MEMBER')
    AND NOT pg_catalog.pg_has_role(current_user,e.relowner,'MEMBER')
    AND NOT pg_catalog.pg_has_role(current_user,g.relowner,'MEMBER')
    AND NOT pg_catalog.pg_has_role(current_user,a.relowner,'MEMBER')
    AND NOT pg_catalog.pg_has_role(current_user,s.relowner,'MEMBER') AS ownership_limits,
  ${shapes} AND s.relkind='S' AND s.relnamespace=n.oid AS relation_shapes,
  pg_catalog.to_regclass('certification_enrollments')=e.oid
    AND pg_catalog.to_regclass('certification_agreements')=g.oid
    AND pg_catalog.to_regclass('certification_audit_events')=a.oid AS relation_bindings,
  pg_catalog.has_table_privilege(current_user,e.oid,'SELECT')
    AND NOT pg_catalog.has_table_privilege(current_user,e.oid,'DELETE,TRUNCATE,TRIGGER,REFERENCES')
    AND (SELECT pg_catalog.count(*)=6 FROM pg_catalog.pg_attribute x WHERE x.attrelid=e.oid AND x.attnum>0 AND NOT x.attisdropped
      AND x.attname=ANY(ARRAY['status','student_id','approved_by','approved_at','status_reason','updated_at']))
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute x WHERE x.attrelid=e.oid AND x.attnum>0 AND NOT x.attisdropped AND
      (pg_catalog.has_column_privilege(current_user,e.oid,x.attnum,'INSERT,REFERENCES') OR
       pg_catalog.has_column_privilege(current_user,e.oid,x.attnum,'UPDATE') IS DISTINCT FROM
         (x.attname=ANY(ARRAY['status','student_id','approved_by','approved_at','status_reason','updated_at'])))) AS enrollment_capabilities,
  pg_catalog.has_table_privilege(current_user,g.oid,'SELECT') AND pg_catalog.has_column_privilege(current_user,g.oid,'version','UPDATE')
    AND NOT pg_catalog.has_table_privilege(current_user,g.oid,'DELETE,TRUNCATE,TRIGGER,REFERENCES')
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute x WHERE x.attrelid=g.oid AND x.attnum>0 AND NOT x.attisdropped AND
      (pg_catalog.has_column_privilege(current_user,g.oid,x.attnum,'INSERT,REFERENCES') OR
       pg_catalog.has_column_privilege(current_user,g.oid,x.attnum,'UPDATE') IS DISTINCT FROM (x.attname='version'))) AS agreement_capabilities,
  NOT pg_catalog.has_table_privilege(current_user,a.oid,'DELETE,TRUNCATE,TRIGGER,REFERENCES')
    AND (SELECT pg_catalog.count(*)=4 FROM pg_catalog.pg_attribute x WHERE x.attrelid=a.oid AND x.attnum>0 AND NOT x.attisdropped
      AND x.attname=ANY(ARRAY['actor_discord_user_id','subject_discord_user_id','action','details']))
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute x WHERE x.attrelid=a.oid AND x.attnum>0 AND NOT x.attisdropped AND
      (pg_catalog.has_column_privilege(current_user,a.oid,x.attnum,'SELECT,UPDATE,REFERENCES') OR
       pg_catalog.has_column_privilege(current_user,a.oid,x.attnum,'INSERT') IS DISTINCT FROM
         (x.attname=ANY(ARRAY['actor_discord_user_id','subject_discord_user_id','action','details'])))) AS audit_capabilities,
  pg_catalog.has_sequence_privilege(current_user,s.oid,'USAGE') AND NOT pg_catalog.has_sequence_privilege(current_user,s.oid,'UPDATE')
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace=n.oid AND c.relkind='S' AND c.oid<>s.oid
      AND pg_catalog.has_sequence_privilege(current_user,c.oid,'USAGE,SELECT,UPDATE')) AS sequence_capabilities,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace=n.oid AND c.relkind IN ('r','p','v','m','f') AND c.oid NOT IN (e.oid,g.oid,a.oid)
    AND (pg_catalog.has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))) AS unrelated_relations_blocked,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
    WHERE pn.nspname NOT IN ('pg_catalog','information_schema') AND p.prosecdef
      AND pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE')) AS definer_functions_blocked
  FROM pg_catalog.pg_roles r JOIN pg_catalog.pg_database d ON d.datname=pg_catalog.current_database()
  JOIN pg_catalog.pg_namespace n ON n.nspname='public'
  JOIN pg_catalog.pg_class e ON e.relnamespace=n.oid AND e.relname='certification_enrollments'
  JOIN pg_catalog.pg_class g ON g.relnamespace=n.oid AND g.relname='certification_agreements'
  JOIN pg_catalog.pg_class a ON a.relnamespace=n.oid AND a.relname='certification_audit_events'
  JOIN pg_catalog.pg_class s ON s.oid=pg_catalog.to_regclass(pg_catalog.pg_get_serial_sequence('public.certification_audit_events','event_id'))
  WHERE r.rolname=current_user`;
const flags = ['identity','restricted_login','ownership_limits','relation_shapes','relation_bindings','enrollment_capabilities',
  'agreement_capabilities','audit_capabilities','sequence_capabilities','unrelated_relations_blocked','definer_functions_blocked'];

// Metadata-only preflight, not a migration, grant, or complete schema validator.
// Runtime must separately verify reviewed schema and bind this dedicated connection to the pilot database.
// UPDATE(version) is the narrow agreement privilege used for the service's FOR SHARE lock.
export async function validateManualReviewDecisionCapabilities(pool, { expectedRole, expectedDatabase } = {}) {
  try {
    if (typeof pool?.query !== 'function' || !identifier(expectedRole) || !identifier(expectedDatabase)) throw new Error();
    const result = await pool.query(manualReviewDecisionCapabilitiesSql, [expectedRole, expectedDatabase]);
    if (!Array.isArray(result?.rows) || result.rows.length !== 1 || flags.some(flag => result.rows[0]?.[flag] !== true)) throw new Error();
    return Object.freeze({ ready: true });
  } catch {
    throw Object.assign(new Error('Owner-decision database capability preflight failed; review the dedicated login and narrowly scoped privileges.'),
      { code: 'MANUAL_REVIEW_DECISION_CAPABILITY_CHECK_FAILED' });
  }
}
