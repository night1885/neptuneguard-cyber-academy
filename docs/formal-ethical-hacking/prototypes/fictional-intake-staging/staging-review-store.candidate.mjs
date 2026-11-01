// Detached/default-off candidate. No SDK, pool construction, listener or automatic retry.
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const demo=x=>typeof x==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(x);
const revision=x=>Number.isInteger(x)&&x>=0&&x<=2147483647;
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const failure=(reason='unavailable',requestId)=>Object.freeze({ok:false,reason,...(requestId?{requestId}:{})});
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
export function createStagingReviewStore(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({recordReview:async()=>failure('disabled'),getStatus:async()=>failure('disabled'),dispose(){}});
 const {guildId,recordId,learnerId,reviewerId,courseKey,exerciseKey,database,productionDatabase,expectedRole}=config;
 const {getResources,isReady,now}=ports;
 if(!snow(guildId)||!uuid(recordId)||!snow(learnerId)||!snow(reviewerId)||learnerId===reviewerId||!demo(courseKey)||!demo(exerciseKey)||typeof database!=='string'||!/^\w+$/.test(database)||typeof productionDatabase!=='string'||!/^\w+$/.test(productionDatabase)||database===productionDatabase||typeof expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole)||![getResources,isReady,now].every(f=>typeof f==='function'))throw Error('Explicit isolated review store required');
 let closed=false,busy=false,last=-1;
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw Error();}
 function clock(){const at=now();if(!stamp(at)||at<last)throw Error();last=at;return at;}
 function command(input){
  if(!keys(input,'decision,expectedReviewRevision,feedback,reportId,requestId'))throw Error();
  const c=Object.freeze({reportId:input.reportId,requestId:input.requestId,expectedReviewRevision:input.expectedReviewRevision,decision:input.decision,feedback:input.feedback});
  if(!uuid(c.reportId)||!uuid(c.requestId)||!revision(c.expectedReviewRevision)||c.expectedReviewRevision>=2147483647||!['changes-requested','review-recorded'].includes(c.decision)||typeof c.feedback!=='string'||!c.feedback.trim()||Array.from(c.feedback).length>2000||Buffer.byteLength(c.feedback,'utf8')>8192)throw Error();return c;
 }
 function project(r,id,c){
  const at=clock();
  if(!keys(r,'expiresAtMs,ok,recordId,reportId,reviewRevision,status,submissionRevision')||r.ok!==true||r.reportId!==id||r.recordId!==recordId||!revision(r.submissionRevision)||r.submissionRevision<1||!revision(r.reviewRevision)||!stamp(r.expiresAtMs)||r.expiresAtMs<=at||r.expiresAtMs>at+86400000)throw Error();
  if(r.status==='submitted'?r.reviewRevision!==0:!['changes-requested','review-recorded'].includes(r.status)||r.reviewRevision<1)throw Error();
  if(c&&(r.status!==c.decision||r.reviewRevision!==c.expectedReviewRevision+1))throw Error();
  return Object.freeze({...r,...(c?{requestId:c.requestId}:{})});
 }
 async function run(ctx,input,write){
  if(busy)return failure();busy=true;
  let client,c,id,actor,operationSent=false,commitStarted=false,committed=false,rolledBack=false,discard=false,outcome;
  try{
   guard();clock();
   if(!keys(ctx,'actorId,guildId')||ctx.guildId!==guildId||ctx.actorId!==(write?reviewerId:learnerId))throw Error();actor=ctx.actorId;
   if(write){c=command(input);id=c.reportId;}else{if(!uuid(input))throw Error();id=input;}
   client=await getResources()?.pool.connect();guard();await client.query('BEGIN');guard();
   await client.query("SET LOCAL statement_timeout='5s'");await client.query("SET LOCAL lock_timeout='2s'");guard();
   const meta=(await client.query("SELECT current_database() AS db,current_user AS actor,fi_stage.contract() AS contract,has_schema_privilege(current_user,'fi_stage','CREATE') AS can_create,(has_table_privilege(current_user,'fi_stage.records','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.reports','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.drafts','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.review_state','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.review_requests','SELECT,INSERT,UPDATE,DELETE')) AS table_access,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated,has_function_privilege(current_user,'fi_stage.record_review(text,text,uuid,text,text,uuid,uuid,integer,text,text)','EXECUTE') AS can_review,has_function_privilege(current_user,'fi_stage.learner_status(text,text,uuid,text,text,uuid)','EXECUTE') AS can_status")).rows?.[0];guard();
   if(meta?.db!==database||meta.actor!==expectedRole||meta.contract!==1||meta.can_create!==false||meta.table_access!==false||meta.elevated!==false||meta.can_review!==true||meta.can_status!==true)throw Error();
   const sql=write?'SELECT fi_stage.record_review($1,$2,$3::uuid,$4,$5,$6::uuid,$7::uuid,$8::integer,$9,$10) AS result':'SELECT fi_stage.learner_status($1,$2,$3::uuid,$4,$5,$6::uuid) AS result';
   const values=[actor,guildId,recordId,courseKey,exerciseKey,id,...(write?[c.requestId,c.expectedReviewRevision,c.decision,c.feedback]:[])];
   operationSent=true;const response=await client.query(sql,values);guard();
   if(response.rows?.length!==1)throw Error();const result=project(response.rows[0].result,id,c);
   commitStarted=true;await client.query('COMMIT');committed=true;guard();
   // SQL metadata is revalidated before returning; no protected feedback is returned.
   const {requestId,...dbResult}=result;outcome=project(dbResult,id,c);
  }catch(e){
   if(client&&!committed)try{await client.query('ROLLBACK');rolledBack=true;}catch{discard=true;}
   if(commitStarted&&!committed)discard=true;
   if(write&&committed)outcome=failure('acknowledgement-unavailable',c?.requestId);
   else if(write&&(commitStarted||operationSent&&!rolledBack))outcome=failure('outcome-unknown',c?.requestId);
   else outcome=failure(write&&operationSent&&e?.code==='40001'?'conflict':'unavailable');
  }finally{
   if(client)try{client.release(discard);}catch{
    outcome=failure(write&&committed?'acknowledgement-unavailable':write&&(commitStarted||operationSent&&!rolledBack)?'outcome-unknown':'unavailable',write?c?.requestId:undefined);
   }
   busy=false;
  }
  return outcome;
 }
 return Object.freeze({recordReview:(ctx,c)=>run(ctx,c,true),getStatus:(ctx,id)=>run(ctx,id,false),dispose(){closed=true;}});
}
