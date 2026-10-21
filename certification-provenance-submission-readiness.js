import { createHash } from 'node:crypto';
const expectedBody='ced10d0761178e50b25e0de52d428718bcf01a67d86f56cfd352b77a5ecd0de3';
const flags=['identity_ok','table_shape','non_owner','can_read','can_lock','mutation_limits','row_trigger','truncate_trigger','function_shape','trigger_set'];
export const provenanceAgreementReadinessSql=`SELECT
  pg_catalog.current_database()::pg_catalog.text=$3::pg_catalog.text AND current_user::pg_catalog.text=$2::pg_catalog.text AND session_user::pg_catalog.text=$2::pg_catalog.text AS identity_ok,
  c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity AND NOT c.relispartition
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=c.oid OR inhparent=c.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=c.oid) AS table_shape,
  NOT pg_catalog.pg_has_role(current_user,c.relowner,'MEMBER') AS non_owner,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['version','content','content_sha256']) x(name)
    WHERE NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'SELECT')) AS can_read,
  pg_catalog.has_column_privilege(current_user,c.oid,'version','UPDATE') AS can_lock,
  NOT pg_catalog.has_any_column_privilege(current_user,c.oid,'INSERT')
    AND NOT pg_catalog.has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER')
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['content','content_sha256','published_at']) x(name)
      WHERE pg_catalog.has_column_privilege(current_user,c.oid,x.name,'UPDATE')) AS mutation_limits,
  a.tgtype=27 AND a.tgenabled IN ('O','A') AND NOT a.tgisinternal AND a.tgqual IS NULL AND a.tgconstraint=0
    AND a.tgnargs=0 AND pg_catalog.cardinality(a.tgattr::pg_catalog.int2[])=0 AS row_trigger,
  b.tgtype=34 AND b.tgenabled IN ('O','A') AND NOT b.tgisinternal AND b.tgqual IS NULL AND b.tgconstraint=0
    AND b.tgnargs=0 AND pg_catalog.cardinality(b.tgattr::pg_catalog.int2[])=0 AND b.tgfoid=a.tgfoid AS truncate_trigger,
  p.proname='certification_reject_agreement_mutation' AND p.pronamespace=c.relnamespace AND p.proowner=c.relowner
    AND p.prokind='f' AND NOT p.prosecdef AND NOT p.proretset AND p.pronargs=0
    AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
    AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql') AS function_shape,
  p.prosrc AS function_body,p.proconfig AS function_settings,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger x WHERE x.tgrelid=c.oid AND NOT x.tgisinternal
    AND x.tgname NOT IN ('certification_agreement_immutable','certification_agreement_no_truncate')) AS trigger_set
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_catalog.pg_trigger a ON a.tgrelid=c.oid AND a.tgname='certification_agreement_immutable'
  LEFT JOIN pg_catalog.pg_trigger b ON b.tgrelid=c.oid AND b.tgname='certification_agreement_no_truncate'
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=a.tgfoid
  WHERE n.nspname::pg_catalog.text=$1::pg_catalog.text AND c.relname='certification_agreements'`;
export function inspectProvenanceAgreementMetadata(rows){
  try{
    if(!Array.isArray(rows)||rows.length!==1)throw new Error();const row=rows[0];
    if(flags.some(name=>row[name]!==true)||row.function_settings!==null||typeof row.function_body!=='string'||row.function_body.length>4096||createHash('sha256').update(row.function_body).digest('hex')!==expectedBody)throw new Error();
    return Object.freeze({ready:true});
  }catch{throw new Error('Provenance agreement readiness failed; reviewed immutable agreement and restricted lock privileges required');}
}
export async function validateProvenanceSubmissionReadiness(pool,target={}){
  const scope=Object.freeze({schema:target?.schema,expectedRole:target?.expectedRole,expectedDatabase:target?.expectedDatabase});
  if(Object.values(scope).some(v=>typeof v!=='string'||!/^[a-z_][a-z0-9_]{0,62}$/.test(v)))throw new Error('Explicit submission readiness database, role and schema required');
  const {validateRegistrationProvenance}=await import('./certification-registration-provenance-readiness.js');
  await validateRegistrationProvenance(pool,scope);
  try{return inspectProvenanceAgreementMetadata((await pool.query(provenanceAgreementReadinessSql,[scope.schema,scope.expectedRole,scope.expectedDatabase])).rows);}
  catch{throw new Error('Provenance agreement readiness failed; reviewed immutable agreement and restricted lock privileges required');}
}
