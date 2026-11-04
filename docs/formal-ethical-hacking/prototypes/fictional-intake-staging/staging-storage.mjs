import {createHash} from 'node:crypto';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const fail=()=>Error('Staging storage unavailable');
export function createStagingStorage({profile,scope,recordId,reviewerId,expectedRole,getResources}){
 if(!uuid(recordId)||!snow(reviewerId)||reviewerId===profile.staging.operatorId||!/^demo-[a-zA-Z0-9-]{1,70}$/.test(scope.courseKey)||!/^demo-[a-zA-Z0-9-]{1,70}$/.test(scope.exerciseKey)||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole)||typeof getResources!=='function')throw fail();
 let ready=false,closed=false;
 const actor=profile.staging.operatorId,guild=profile.staging.guildId;
 function valid(b){return b?.recordId===recordId&&b.guildId===guild&&b.actorId===actor&&b.learnerId===actor&&b.courseKey===scope.courseKey&&b.exerciseKey===scope.exerciseKey;}
 async function call(op,p={},reviewer=false){
  if(!ready||closed)throw fail();const pool=getResources()?.pool;let client,rollbackFailed=false;
  try{client=await pool.connect();if(closed)throw fail();await client.query('BEGIN');
   const result=await client.query('SELECT fi_stage.dispatch($1,$2,$3::uuid,$4,$5,$6,$7::jsonb) AS r',[reviewer?reviewerId:actor,guild,recordId,scope.courseKey,scope.exerciseKey,op,JSON.stringify(p)]);
   if(closed)throw fail();await client.query('COMMIT');if(closed)throw fail();return result.rows?.[0]?.r;
  }catch{try{await client?.query('ROLLBACK');}catch{rollbackFailed=true;}throw fail();}finally{client?.release(rollbackFailed);}
 }
 async function resolve(ctx){if(ctx?.guildId!==guild||ctx.actorId!==actor||!['prepare','preview','submit'].includes(ctx.action))throw fail();const r=await call('resolve');
  if(r?.ok!==true||r.recordId!==recordId||r.learnerId!==actor||r.courseKey!==scope.courseKey||r.exerciseKey!==scope.exerciseKey||!Number.isSafeInteger(r.revision)||r.revision<0)throw fail();
  return Object.freeze({recordId,learnerId:actor,courseKey:scope.courseKey,exerciseKey:scope.exerciseKey,revision:r.revision});}
 const checked=b=>{if(!valid(b))throw fail();};
 function receipt(r){if(r===null)return null;if(r?.ok!==true||r.recordId!==recordId||r.learnerId!==actor||r.sourceGuildId!==guild||!uuid(r.reportId)||!snow(r.sourceChannelId)||!snow(r.sourceMessageId)||!Number.isSafeInteger(r.revision)||r.revision<1||!/^[a-f0-9]{64}$/.test(r.digest)||!Number.isSafeInteger(r.submittedAtMs)||r.expiresAtMs!==r.submittedAtMs+86400000)throw fail();
  return Object.freeze(Object.fromEntries(['ok','reportId','recordId','learnerId','revision','digest','submittedAtMs','expiresAtMs','sourceGuildId','sourceChannelId','sourceMessageId','sourceCreatedAtMs'].map(k=>[k,r[k]])));}
 async function ok(op,p,reviewer=false){const r=await call(op,p,reviewer);if(r?.ok!==true)throw fail();return r;}
 return Object.freeze({get ready(){return ready&&!closed;},
  async initialize(){try{const r=(await getResources().pool.query("SELECT current_database() AS db,current_user AS actor,fi_stage.contract() AS contract,has_schema_privilege(current_user,'fi_stage','CREATE') AS can_create,(has_table_privilege(current_user,'fi_stage.records','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.reports','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.drafts','SELECT,INSERT,UPDATE,DELETE')) AS table_access,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated")).rows[0];if(closed||r?.db!==profile.staging.database.name||r.actor!==expectedRole||r.contract!==1||r.elevated!==false||r.can_create!==false||r.table_access!==false)throw fail();ready=true;await resolve({actorId:actor,guildId:guild,action:'prepare'});}catch{ready=false;throw fail();}},resolve,
  async authorize(b){try{checked(b);const fresh=await resolve(b);return ['recordId','learnerId','courseKey','exerciseKey'].every(k=>fresh[k]===b[k]);}catch{return false;}},
  async journalRead(b){checked(b);const r=await ok('journalRead');if(r.journal!==null&&(!r.journal||typeof r.journal.state!=='string'))throw fail();return r.journal;},
  async journalWrite(b,j){checked(b);if(!uuid(j?.operationId)||!['creating','verify-pending','available','reconcile-required'].includes(j.state)||j.channelId!==undefined&&!snow(j.channelId))throw fail();await ok('journalWrite',j);},
  async receipt(b,id){checked(b);if(!uuid(id))throw fail();return receipt(await call('receipt',{requestId:id}));},
  async submit(b,p){checked(b);if(!uuid(p?.requestId)||!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision<0||!snow(p.channelId)||!snow(p.messageId)||!Number.isSafeInteger(p.createdAtMs)||p.createdAtMs<0||typeof p.body!=='string'||!p.body.trim()||Array.from(p.body).length>2000||Buffer.byteLength(p.body)>8192||createHash('sha256').update(p.body).digest('hex')!==p.digest)throw fail();return receipt(await call('submit',p));},
  async discoverReceipts(b,n=5){checked(b);if(!Number.isInteger(n)||n<1||n>20)throw fail();const r=await ok('discover',{limit:n});if(!Array.isArray(r.items)||r.items.length>n||r.items.some(x=>!uuid(x.requestId)||!uuid(x.reportId)||!Number.isSafeInteger(x.revision)||!Number.isSafeInteger(x.expiresAtMs)))throw fail();return Object.freeze(r.items.map(x=>Object.freeze({requestId:x.requestId,reportId:x.reportId,revision:x.revision,expiresAtMs:x.expiresAtMs})));},
  noteDraft:p=>ok('noteDraft',p,true),
  retireJournal:()=>ok('retireJournal',{},true),
  async maintenance(){const r=await ok('maintenance',{},true);if(!r.journal||!Number.isSafeInteger(r.journalExpiresAtMs))throw fail();return {...r.journal,expiresAtMs:r.journalExpiresAtMs};},
  async due(){const r=await ok('due',{},true);if(!Array.isArray(r.items)||r.items.length>20||r.items.some(x=>!['draft','report'].includes(x.kind)||!snow(x.channelId)||!snow(x.messageId)||!Number.isSafeInteger(x.deadlineMs)||x.kind==='report'&&!uuid(x.id)))throw fail();return r.items;},
  async claim(item){return item.kind==='report'||(await ok('claim',item,true)).claimed===true;},
  eraseConfirmed:item=>ok('erase',{...item,confirmed:true},true),
  dispose(){closed=true;ready=false;}
 });
}
