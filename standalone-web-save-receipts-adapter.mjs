// Detached/default-off CI-profile adapter. No pool construction, listener, retry or startup wiring.
function fields(x,keys){
  if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x)))throw Error();
  const descriptors=Object.getOwnPropertyDescriptors(x),wanted=keys.split(',');
  if(Reflect.ownKeys(descriptors).length!==wanted.length)throw Error();
  const copy={};for(const key of wanted){const d=descriptors[key];if(!d||!Object.hasOwn(d,'value'))throw Error();copy[key]=d.value;}return Object.freeze(copy);
}
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const revision=x=>Number.isSafeInteger(x)&&x>=0&&x<Number.MAX_SAFE_INTEGER-1;
const failure=(outcome='unavailable',operationId)=>Object.freeze({outcome,...(operationId?{operationId}:{})});
const identitySQL="SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num') AS version,web_review_receipt_candidate.contract() AS contract,has_schema_privilege(current_user,'web_review_receipt_candidate','CREATE') AS schema_create,(has_table_privilege(current_user,'web_review_receipt_candidate.scopes','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_table_privilege(current_user,'web_review_receipt_candidate.bookmarks','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_table_privilege(current_user,'web_review_receipt_candidate.receipts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) AS table_access,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated,EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)) AS member,has_function_privilege(current_user,'web_review_receipt_candidate.record_save(text,text,text,text,bigint,uuid,bigint,text)','EXECUTE') AS can_save,has_function_privilege(current_user,'web_review_receipt_candidate.read_receipt(text,text,text,text,bigint,uuid)','EXECUTE') AS can_read,has_function_privilege(current_user,'web_review_receipt_candidate.prune_retired(text,text,text,text)','EXECUTE') AS can_prune";

export function createWebReceiptStore(config={},ports={}) {
  if(config.enabled!==true)return Object.freeze({recordSave:async()=>failure('disabled'),readReceipt:async()=>failure('disabled'),dispose(){}});
  const {guildId,actorId,courseKey,contentRevision,generation,databaseName,expectedRole}=config;
  const {getResources,isReady}=ports;
  if(config.reviewOnly!==true||config.syntheticOnly!==true||config.disposableReview!==true||!snow(guildId)||!snow(actorId)||courseKey!=='standalone-web-review'||typeof contentRevision!=='string'||!/^[a-f0-9]{64}$/.test(contentRevision)||!Number.isSafeInteger(generation)||generation<1||generation>=Number.MAX_SAFE_INTEGER||databaseName!=='ng_web_review_ci'||expectedRole!=='web_receipt_ci_worker'||typeof getResources!=='function'||typeof isReady!=='function')throw Error('Explicit isolated receipt store required');
  let closed=false,busy=false;
  function guard(){const r=isReady.call(ports);r?.catch?.(()=>{});if(closed||r!==true)throw Error();}
  function capture(ctx,input){
    const identity=fields(ctx,'actorId,guildId'),c=fields(input,'expectedRevision,operationId,pageKey');
    if(identity.actorId!==actorId||identity.guildId!==guildId)throw Error();
    if(!uuid(c.operationId)||!revision(c.expectedRevision)||!['entry','http'].includes(c.pageKey))throw Error();return c;
  }
  function project(r,c){
    r=fields(r,'actorId,contentRevision,courseKey,expectedRevision,generation,guildId,operationId,outcome,pageKey,resultRevision');
    if(r.guildId!==guildId||r.actorId!==actorId||r.courseKey!==courseKey||r.contentRevision!==contentRevision||r.generation!==generation||r.operationId!==c.operationId||r.expectedRevision!==c.expectedRevision||r.pageKey!==c.pageKey||!['saved','conflict'].includes(r.outcome)||(r.outcome==='saved'?r.resultRevision!==c.expectedRevision+1:r.resultRevision!==null))throw Error();
    return Object.freeze({...r});
  }
  async function run(ctx,input,write){
    if(busy)return failure();busy=true;
    let c,client,operationSent=false,commitStarted=false,committed=false,rolledBack=false,discard=false,result;
    const failed=()=>failure(write&&committed?'acknowledgement-unavailable':write&&(commitStarted||operationSent&&!rolledBack)?'outcome-unknown':'unavailable',c?.operationId);
    try{
      c=capture(ctx,input);guard();const resources=await getResources.call(ports);guard();
      client=await resources?.pool.connect();guard();
      if(typeof client?.query!=='function'||typeof client?.release!=='function')throw Error();
      await client.query('BEGIN');guard();
      await client.query("SET LOCAL statement_timeout='5s'");guard();
      await client.query("SET LOCAL lock_timeout='2s'");guard();
      await client.query("SET LOCAL idle_in_transaction_session_timeout='5s'");guard();
      const meta=await client.query(identitySQL);guard();
      if(meta?.rows?.length!==1)throw Error();
      const m=fields(meta.rows[0],'actor,can_prune,can_read,can_save,contract,db,elevated,member,schema_create,table_access,version');
      if(m.db!==databaseName||m.actor!==expectedRole||typeof m.version!=='string'||!/^\d+$/.test(m.version)||![16,18].includes(Math.floor(Number(m.version)/10000))||m.contract!==1||m.schema_create!==false||m.table_access!==false||m.elevated!==false||m.member!==false||m.can_save!==true||m.can_read!==true||m.can_prune!==false)throw Error();
      const values=[guildId,actorId,courseKey,contentRevision,generation,c.operationId,...(write?[c.expectedRevision,c.pageKey]:[])];
      const sql=write?'SELECT web_review_receipt_candidate.record_save($1,$2,$3,$4,$5::bigint,$6::uuid,$7::bigint,$8) AS result':'SELECT web_review_receipt_candidate.read_receipt($1,$2,$3,$4,$5::bigint,$6::uuid) AS result';
      operationSent=true;const response=await client.query(sql,values);guard();
      if(response?.rows?.length!==1)throw Error();const raw=response.rows[0].result;
      if(raw===null&&!write)result=Object.freeze({outcome:'receipt-not-visible',operationId:c.operationId});
      else result=Object.freeze({outcome:'receipt',receipt:project(raw,c)});
      commitStarted=true;await client.query('COMMIT');committed=true;guard();
    }catch{
      if(client&&!committed)try{await client.query('ROLLBACK');rolledBack=true;}catch{discard=true;}
      if(commitStarted&&!committed)discard=true;
      result=failed();
    }finally{
      if(client)try{await client.release(discard);guard();}catch{result=failed();}
      busy=false;
    }
    return result;
  }
  return Object.freeze({recordSave:(ctx,c)=>run(ctx,c,true),readReceipt:(ctx,c)=>run(ctx,c,false),dispose(){closed=true;}});
}
