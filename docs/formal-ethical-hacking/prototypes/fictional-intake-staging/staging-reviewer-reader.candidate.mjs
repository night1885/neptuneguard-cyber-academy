// Detached candidate: no launcher integration, SDK, pool creation or publication.
import {createHash} from 'node:crypto';
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const demo=x=>typeof x==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(x);
const fail=()=>Error('Staging reviewer read unavailable');
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
export function createStagingReviewerReader(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({readReport:async()=>{throw fail();},dispose(){}});
 const {guildId,recordId,learnerId,reviewerId,courseKey,exerciseKey,database,productionDatabase,expectedRole}=config;
 const {getResources,isReady,now}=ports;
 if(!snow(guildId)||!uuid(recordId)||!snow(learnerId)||!snow(reviewerId)||learnerId===reviewerId||!demo(courseKey)||!demo(exerciseKey)||typeof database!=='string'||!/^\w+$/.test(database)||typeof productionDatabase!=='string'||!/^\w+$/.test(productionDatabase)||database===productionDatabase||typeof expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole)||![getResources,isReady,now].every(f=>typeof f==='function'))throw fail();
 let closed=false,busy=false,last=-1;
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw fail();}
 function clock(){const at=now();if(!stamp(at)||at<last)throw fail();last=at;return at;}
 function project(r,id){
  const at=clock();
  if(!r||r.ok!==true||r.reportId!==id||r.recordId!==recordId||r.learnerId!==learnerId||!Number.isSafeInteger(r.revision)||r.revision<1||!stamp(r.submittedAtMs)||!stamp(r.expiresAtMs)||r.submittedAtMs>at||at>=r.expiresAtMs||r.expiresAtMs!==r.submittedAtMs+86400000||typeof r.body!=='string'||!r.body.trim()||Array.from(r.body).length>2000||Buffer.byteLength(r.body,'utf8')>8192||r.digest!==createHash('sha256').update(r.body).digest('hex'))throw fail();
  return Object.freeze(Object.fromEntries(['ok','reportId','recordId','learnerId','body','digest','revision','submittedAtMs','expiresAtMs'].map(k=>[k,r[k]])));
 }
 return Object.freeze({async readReport(ctx,id){
  if(busy)throw fail();busy=true;let client,discard=false;
  try{
   guard();clock();
   if(!ctx||Object.keys(ctx).sort().join(',')!=='actorId,guildId'||ctx.actorId!==reviewerId||ctx.guildId!==guildId||!uuid(id))throw fail();
   client=await getResources()?.pool.connect();guard();await client.query('BEGIN');guard();
   await client.query("SET LOCAL statement_timeout='5s'");await client.query("SET LOCAL lock_timeout='2s'");guard();
   const meta=(await client.query("SELECT current_database() AS db,current_user AS actor,fi_stage.contract() AS contract,has_schema_privilege(current_user,'fi_stage','CREATE') AS can_create,(has_table_privilege(current_user,'fi_stage.records','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.reports','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.drafts','SELECT,INSERT,UPDATE,DELETE')) AS table_access,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated,has_function_privilege(current_user,'fi_stage.reviewer_read(text,text,uuid,text,text,uuid)','EXECUTE') AS can_read")).rows?.[0];guard();
   if(meta?.db!==database||meta.actor!==expectedRole||meta.contract!==1||meta.can_create!==false||meta.table_access!==false||meta.elevated!==false||meta.can_read!==true)throw fail();
   const response=await client.query('SELECT fi_stage.reviewer_read($1,$2,$3::uuid,$4,$5,$6::uuid) AS result',[ctx.actorId,guildId,recordId,courseKey,exerciseKey,id]);guard();
   if(response.rows?.length!==1)throw fail();const result=project(response.rows[0].result,id);
   await client.query('COMMIT');guard();project(result,id);return result;
  }catch{if(client)try{await client.query('ROLLBACK');}catch{discard=true;}throw fail();}
  finally{busy=false;if(client)try{client.release(discard);}catch{throw fail();}}
 },dispose(){closed=true;}});
}
