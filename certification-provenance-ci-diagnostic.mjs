import { randomUUID } from 'node:crypto';
import { appendFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const states=new Set(['42P18','42P08','42703','42501','42883','42P01','42601','0A000']);
const flags=['identity_ok','restricted_role','table_shape','audit_shape','non_owner','schema_limits','column_shape','constraint_validated','trigger_shape','function_shape','trigger_set','can_read_invitation','can_register','can_submit','enrollment_limits','can_append_audit','audit_limits'];
export async function classifyProvenanceDiagnostic(queryMetadata,validate){
  let result;
  try{result=await queryMetadata();}catch(error){let code;try{code=error?.code;}catch{}return states.has(code)?'sqlstate_'+code:'catalog_query_failed';}
  let failed;try{if(!Array.isArray(result?.rows)||result.rows.length!==1)return 'catalog_result_shape';failed=flags.find(flag=>result.rows[0]?.[flag]!==true);}catch{return 'catalog_result_shape';}
  if(failed)return 'flag_'+failed;
  try{return (await validate())?.ready===true?'initial_ready':'validator_result_shape';}catch{return 'definition_or_function';}
}
async function main(){
  if(process.env.GITHUB_ACTIONS!=='true'||!['16','18'].includes(process.env.PROVENANCE_DIAGNOSTIC_POSTGRES)||!process.env.GITHUB_OUTPUT||process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL!=='true')throw new Error('Explicit CI-only diagnostic context required');
  let url;try{url=new URL(process.env.CERTIFICATION_TEST_DATABASE_URL);}catch{throw new Error('Disposable URL required');}
  if(!['postgres:','postgresql:'].includes(url.protocol)||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.pathname!=='/certification_test'||url.search||url.hash)throw new Error('Disposable loopback certification_test URL only');
  const {default:pg}=await import('pg');
  const {validateRegistrationProvenance:validate,registrationAcknowledgmentUpdateColumns:updates,registrationProvenanceReadinessSql:sql}=await import('./certification-registration-provenance-readiness.js');
  const suffix=randomUUID().replaceAll('-',''),schema='diagnostic_'+suffix,role='diagnostic_role_'+suffix,password=randomUUID();
  const admin=new pg.Pool({connectionString:url.href,ssl:false,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000`});let worker,createdSchema=false,createdRole=false,label='fixture_setup_failed';
  try{
    if((await admin.query('SELECT current_database() AS name')).rows[0]?.name!=='certification_test')throw new Error();await admin.query(`CREATE SCHEMA "${schema}"`);createdSchema=true;
    for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','009-active-registration-provenance.sql'])await admin.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);createdRole=true;await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT(discord_user_id,status,registration_owner_id),UPDATE(${updates.join(',')}) ON certification_enrollments TO "${role}"`);await admin.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    const login=new URL(url);login.username=role;login.password=password;worker=new pg.Pool({connectionString:login.href,ssl:false,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000`});
    const target={schema,expectedRole:role,expectedDatabase:'certification_test'};
    label=await classifyProvenanceDiagnostic(()=>worker.query(sql,[schema,role,'certification_test',updates]),()=>validate(worker,target));
  }catch{label='fixture_setup_failed';}
  finally{
    try{if(worker)await worker.end();}catch{label='fixture_cleanup_failed';}
    try{if(createdSchema)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}catch{label='fixture_cleanup_failed';}
    try{if(createdRole)await admin.query(`DROP ROLE "${role}"`);}catch{label='fixture_cleanup_failed';}
    try{await admin.end();}catch{label='fixture_cleanup_failed';}
  }
  const allowed=new Set(['fixture_setup_failed','fixture_cleanup_failed','catalog_query_failed','catalog_result_shape','initial_ready','validator_result_shape','definition_or_function',...flags.map(f=>'flag_'+f),...Array.from(states,s=>'sqlstate_'+s)]);
  if(!allowed.has(label))throw new Error('Unsupported diagnostic category');
  await appendFile(process.env.GITHUB_OUTPUT,`diagnostic=pg${process.env.PROVENANCE_DIAGNOSTIC_POSTGRES}_${label}\n`);
  console.log('Provenance diagnostic category recorded; no raw database details emitted.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  void main().catch(()=>{console.error('Provenance CI diagnostic refused or unavailable; raw details omitted.');process.exitCode=1;});
}
