import { createHash } from 'node:crypto';
export const registrationAcknowledgmentUpdateColumns=Object.freeze(["status", "agreement_version", "agreement_content_sha256", "acknowledgment_name", "signature_method", "signature_reference", "acknowledged_at", "learner_confirmed_read_at", "comprehension_passed_at", "comprehension_check_version", "age_eligible", "age_declared_at", "age_declaration_version", "status_reason", "updated_at"]);
const expectedConstraint=["or", ["is-null", "registration_owner_id"], ["and", ["~", "registration_owner_id", "^[0-9]{17,20}$"], ["~", "discord_user_id", "^[0-9]{17,20}$"], ["=", "status", "awaiting_acknowledgment"], ["is-null", "student_id"], ["is-null", "approved_by"], ["is-null", "approved_at"], ["is-null", "acknowledgment_name"], ["is-null", "signature_reference"]]];
const expectedBodySha256='f67912ac979f1f80948bc1b9c5dbff309ee4c0a5ec3c1992f5228fab4630d151';
function constraintMatches(value){
  if(typeof value!=='string'||value.length>4096)return false;
  try{
    const tokens=value.match(/'(?:''|[^'])*'|::|[A-Za-z_][A-Za-z0-9_]*|[()~=]|\S/g);let at=0;
    if(!tokens||tokens.length>512||tokens[at++]!=='CHECK')return false;
    const take=word=>{if(tokens[at]===word){at++;return true;}return false;};
    const need=word=>{if(!take(word))throw new Error();};
    const combine=(name,items)=>items.length===1?items[0]:[name,...items.flatMap(item=>item[0]===name?item.slice(1):[item])];
    function factor(){
      if(take('(')){const node=or();need(')');return node;}
      const field=tokens[at++];if(!/^[a-z_][a-z0-9_]*$/.test(field||''))throw new Error();
      if(take('IS')){need('NULL');return ['is-null',field];}
      const op=tokens[at++];if(!['~','='].includes(op))throw new Error();
      const literal=tokens[at++];if(!/^'(?:''|[^'])*'$/.test(literal||''))throw new Error();
      if(take('::'))need('text');
      return [op,field,literal.slice(1,-1).replaceAll("''", "'")];
    }
    function and(){const items=[factor()];while(take('AND'))items.push(factor());return combine('and',items);}
    function or(){const items=[and()];while(take('OR'))items.push(and());return combine('or',items);}
    const parsed=or();return at===tokens.length&&JSON.stringify(parsed)===JSON.stringify(expectedConstraint);
  }catch{return false;}
}
export const registrationProvenanceReadinessSql=`SELECT
  pg_catalog.current_database()::pg_catalog.text=$3::pg_catalog.text AND current_user::pg_catalog.text=$2::pg_catalog.text AND session_user::pg_catalog.text=$2::pg_catalog.text
    AND pg_catalog.current_setting('session_replication_role')='origin' AS identity_ok,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_catalog.pg_has_role(current_user,r.oid,'MEMBER') AND
    (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted_role,
  c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity AND NOT c.relispartition
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=c.oid OR inhparent=c.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=c.oid) AS table_shape,
  d.relkind='r' AND NOT d.relrowsecurity AND NOT d.relforcerowsecurity AND NOT d.relispartition AND d.relnamespace=c.relnamespace
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=d.oid OR inhparent=d.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=d.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=d.oid AND NOT tgisinternal) AS audit_shape,
  NOT pg_catalog.pg_has_role(current_user,c.relowner,'MEMBER') AND NOT pg_catalog.pg_has_role(current_user,d.relowner,'MEMBER') AS non_owner,
  pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE') AND NOT pg_catalog.has_schema_privilege(current_user,n.oid,'CREATE') AS schema_limits,
  a.atttypid='pg_catalog.text'::pg_catalog.regtype AND NOT a.attnotnull AND NOT a.atthasdef
    AND a.attgenerated='' AND a.attidentity='' AS column_shape,
  k.contype='c' AND k.convalidated AS constraint_validated,
  pg_catalog.pg_get_constraintdef(k.oid,true) AS constraint_definition,
  t.tgtype=23 AND t.tgenabled IN ('O','A') AND NOT t.tgisinternal AND t.tgqual IS NULL
    AND t.tgnargs=0 AND pg_catalog.cardinality(t.tgattr::pg_catalog.int2[])=0 AND t.tgconstraint=0 AS trigger_shape,
  p.proname='certification_guard_registration_provenance' AND p.pronamespace=c.relnamespace
    AND p.proowner=c.relowner AND NOT p.prosecdef AND p.prokind='f' AND NOT p.proretset
    AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype
    AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='plpgsql') AS function_shape,
  p.prosrc AS function_body,p.proconfig AS function_settings,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger x WHERE x.tgrelid=c.oid AND NOT x.tgisinternal
    AND x.tgname NOT IN ('certification_student_id_immutable','certification_application_closure_immutable','certification_registration_provenance_guard')) AS trigger_set,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['discord_user_id','status','registration_owner_id','student_id','approved_by','approved_at','acknowledgment_name','signature_reference']) x(name)
    WHERE NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'SELECT')) AS can_read_invitation,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['discord_user_id','status','registration_owner_id']) x(name)
    WHERE NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'INSERT')) AS can_register,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest($4::pg_catalog.text[]) x(name) WHERE NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'UPDATE')) AS can_submit,
  NOT pg_catalog.has_column_privilege(current_user,c.oid,'registration_owner_id','UPDATE')
    AND NOT pg_catalog.has_column_privilege(current_user,c.oid,'discord_user_id','UPDATE')
    AND NOT pg_catalog.has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER')
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['student_id','approved_by','approved_at','application_closed_at','application_closed_by','application_closed_as']) x(name)
      WHERE pg_catalog.has_column_privilege(current_user,c.oid,x.name,'INSERT') OR pg_catalog.has_column_privilege(current_user,c.oid,x.name,'UPDATE')) AS enrollment_limits,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['actor_discord_user_id','subject_discord_user_id','action','details']) x(name)
    WHERE NOT pg_catalog.has_column_privilege(current_user,d.oid,x.name,'INSERT'))
    AND pg_catalog.has_sequence_privilege(current_user,pg_catalog.pg_get_serial_sequence(pg_catalog.format('%I.%I',$1::pg_catalog.text,'certification_audit_events'),'event_id'),'USAGE') AS can_append_audit,
  NOT pg_catalog.has_any_column_privilege(current_user,d.oid,'UPDATE') AND NOT pg_catalog.has_table_privilege(current_user,d.oid,'DELETE,TRUNCATE,TRIGGER') AS audit_limits
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_catalog.pg_class d ON d.relnamespace=c.relnamespace AND d.relname='certification_audit_events'
  LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attname='registration_owner_id' AND a.attnum>0 AND NOT a.attisdropped
  LEFT JOIN pg_catalog.pg_constraint k ON k.conrelid=c.oid AND k.conname='certification_active_registration_owner'
  LEFT JOIN pg_catalog.pg_trigger t ON t.tgrelid=c.oid AND t.tgname='certification_registration_provenance_guard'
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
  WHERE n.nspname::pg_catalog.text=$1::pg_catalog.text AND c.relname='certification_enrollments'`;
const flags=['identity_ok','restricted_role','table_shape','audit_shape','non_owner','schema_limits','column_shape','constraint_validated','trigger_shape','function_shape','trigger_set','can_read_invitation','can_register','can_submit','enrollment_limits','can_append_audit','audit_limits'];
export async function validateRegistrationProvenance(pool,{schema,expectedRole,expectedDatabase}={}){
  if([schema,expectedRole,expectedDatabase].some(v=>typeof v!=='string'||!/^[a-z_][a-z0-9_]{0,62}$/.test(v)))throw new Error('Explicit expected provenance database, role and schema required');
  try{
    const result=await pool.query(registrationProvenanceReadinessSql,[schema,expectedRole,expectedDatabase,registrationAcknowledgmentUpdateColumns]);
    if(!Array.isArray(result.rows)||result.rows.length!==1)throw new Error();
    const row=result.rows[0];
    if(flags.some(key=>row[key]!==true)||!constraintMatches(row.constraint_definition)||
      !Array.isArray(row.function_settings)||row.function_settings.length!==1||row.function_settings[0]!=='search_path=pg_catalog'||
      typeof row.function_body!=='string'||row.function_body.length>4096||createHash('sha256').update(row.function_body).digest('hex')!==expectedBodySha256)throw new Error();
    return Object.freeze({ready:true});
  }catch{throw new Error('Registration provenance readiness failed; reviewed schema and restricted-role safeguards required');}
}
