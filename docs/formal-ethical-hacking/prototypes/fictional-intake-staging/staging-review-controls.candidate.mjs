// Detached/default-off metadata controls. No SDK/pool construction or listener registration.
import {randomUUID,createHash} from 'node:crypto';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const rev=x=>Number.isInteger(x)&&x>=0&&x<=2147483647;
const deny=(reason='unavailable')=>Object.freeze({ok:false,reason});
const context=x=>Object.freeze({actorId:x.actorId,guildId:x.guildId});
function scope(c){
 const r=Object.freeze({...c});
 if(!snow(r.guildId)||!uuid(r.recordId)||!snow(r.reviewerId)||!snow(r.learnerId)||r.reviewerId===r.learnerId||!['courseKey','exerciseKey'].every(k=>typeof r[k]==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(r[k])))throw Error('Explicit isolated control scope required');return r;
}
function snapshot(a,c,ctx,id,purpose,at){
 if(!keys(a,'actorId,digest,expiresAtMs,ok,purpose,recordId,reportId,reviewRevision,status,submissionRevision,validUntilMs')||a.ok!==true||a.actorId!==ctx.actorId||a.recordId!==c.recordId||a.reportId!==id||a.purpose!==purpose||!/^[a-f0-9]{64}$/.test(a.digest)||!stamp(a.validUntilMs)||!stamp(a.expiresAtMs)||at>=a.validUntilMs||at>=a.expiresAtMs||!rev(a.submissionRevision)||a.submissionRevision<1||!rev(a.reviewRevision)||(a.status==='submitted'?a.reviewRevision!==0:!['changes-requested','review-recorded'].includes(a.status)||a.reviewRevision<1))throw Error();return Object.freeze({...a});
}
export function createReviewAuthorityReader(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({get:async()=>null,dispose(){}});
 const c=scope(config),{getResources,isReady,now}=ports;
 if(typeof c.database!=='string'||!/^\w+$/.test(c.database)||typeof c.productionDatabase!=='string'||!/^\w+$/.test(c.productionDatabase)||c.database===c.productionDatabase||typeof c.expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(c.expectedRole)||![getResources,isReady,now].every(f=>typeof f==='function'))throw Error('Explicit authority providers required');
 let closed=false,busy=false,last=-1;
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw Error();}
 function clock(){const at=now();if(!stamp(at)||at<last)throw Error();last=at;return at;}
 return Object.freeze({async get(input,id,purpose){
  if(busy)return null;busy=true;let client,discard=false,commitStarted=false,committed=false,result=null;
  try{
   guard();clock();if(!keys(input,'actorId,guildId')||input.guildId!==c.guildId||!uuid(id)||!['review','status'].includes(purpose)||input.actorId!==(purpose==='review'?c.reviewerId:c.learnerId))throw Error();const ctx=context(input);
   client=await getResources()?.pool.connect();guard();await client.query('BEGIN');
   await client.query("SET LOCAL statement_timeout='5s'");await client.query("SET LOCAL lock_timeout='2s'");guard();
   const m=(await client.query("SELECT current_database() AS db,current_user AS actor,fi_stage.contract() AS contract,has_schema_privilege(current_user,'fi_stage','CREATE') AS can_create,(has_table_privilege(current_user,'fi_stage.records','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.reports','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.drafts','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.review_state','SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege(current_user,'fi_stage.review_requests','SELECT,INSERT,UPDATE,DELETE')) AS table_access,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated,has_function_privilege(current_user,'fi_stage.review_authority(text,text,uuid,text,text,uuid,text)','EXECUTE') AS can_read")).rows?.[0];guard();
   if(m?.db!==c.database||m.actor!==c.expectedRole||m.contract!==1||m.can_create!==false||m.table_access!==false||m.elevated!==false||m.can_read!==true)throw Error();
   const r=await client.query('SELECT fi_stage.review_authority($1,$2,$3::uuid,$4,$5,$6::uuid,$7) AS result',[ctx.actorId,c.guildId,c.recordId,c.courseKey,c.exerciseKey,id,purpose]);guard();if(r.rows?.length!==1)throw Error();
   result=snapshot(r.rows[0].result,c,ctx,id,purpose,clock());commitStarted=true;await client.query('COMMIT');committed=true;guard();snapshot(result,c,ctx,id,purpose,clock());
  }catch{result=null;if(client&&!committed)try{await client.query('ROLLBACK');}catch{discard=true;}if(commitStarted&&!committed)discard=true;}
  finally{if(client)try{client.release(discard);}catch{result=null;}busy=false;}return result;
 },dispose(){closed=true;}});
}
export function createReviewControls(config={},ports={}){
 const disabled=()=>deny('disabled');
 if(config.enabled!==true)return Object.freeze({prepare:async()=>disabled(),confirm:async()=>disabled(),recover:async()=>disabled(),getStatus:async()=>disabled(),handle:async()=>false,dispose(){}});
 const c=scope(config),{authority,store,isReady,now,selectDraft,selectReport}=ports;
 if(!snow(c.botId)||!snow(c.reviewChannelId)||!snow(c.learnerChannelId)||c.reviewChannelId===c.learnerChannelId||!snow(c.reviewEntryMessageId)||!snow(c.learnerEntryMessageId)||typeof authority?.get!=='function'||!['recordReview','getStatus'].every(k=>typeof store?.[k]==='function')||![isReady,now,selectDraft,selectReport].every(f=>typeof f==='function'))throw Error('Explicit private control providers required');
 const entries=new Map(),bindings=new Map();let closed=false,busy=false,handling=false,last=-1;
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw Error();}
 function clock(){const at=now();if(!stamp(at)||at<last)throw Error();last=at;return at;}
 function forget(token){const p=entries.get(token);if(p){clearTimeout(p.timer);p.command=null;}entries.delete(token);for(const [id,b]of bindings)if(b.token===token)bindings.delete(id);}
 function trim(){const at=clock();for(const [token,p]of entries)if(at>=p.until)forget(token);}
 async function auth(ctx,id,purpose){guard();const a=await authority.get(ctx,id,purpose);guard();return snapshot(a,c,ctx,id,purpose,clock());}
 function validCtx(input,actor){if(!keys(input,'actorId,guildId')||input.actorId!==actor||input.guildId!==c.guildId)throw Error();return context(input);}
 async function run(work){if(busy)return deny();busy=true;try{guard();trim();return await work();}catch{return deny();}finally{busy=false;}}
 function receipt(r,id,command){
  const expected=command?'expiresAtMs,ok,recordId,reportId,requestId,reviewRevision,status,submissionRevision':'expiresAtMs,ok,recordId,reportId,reviewRevision,status,submissionRevision';
  if(!keys(r,expected)||r.ok!==true||r.recordId!==c.recordId||r.reportId!==id||!rev(r.submissionRevision)||r.submissionRevision<1||!rev(r.reviewRevision)||!stamp(r.expiresAtMs)||clock()>=r.expiresAtMs||(r.status==='submitted'?r.reviewRevision!==0:!['changes-requested','review-recorded'].includes(r.status)||r.reviewRevision<1)||command&&(r.requestId!==command.requestId||r.reviewRevision!==command.expectedReviewRevision+1||r.status!==command.decision))throw Error();return Object.freeze({...r});
 }
 async function prepare(input,draft){return run(async()=>{
  const ctx=validCtx(input,c.reviewerId);
  for(const [token,p]of entries)if(p.state==='uncertain'){await auth(ctx,p.reportId,'review');return Object.freeze({ok:false,reason:'recovery-required',token,reportId:p.reportId});}
  if(!keys(draft,'decision,feedback,reportId'))throw Error();const d=Object.freeze({reportId:draft.reportId,decision:draft.decision,feedback:draft.feedback});
  if(!uuid(d.reportId)||!['changes-requested','review-recorded'].includes(d.decision)||typeof d.feedback!=='string'||!d.feedback.trim()||Array.from(d.feedback).length>2000||Buffer.byteLength(d.feedback,'utf8')>8192)throw Error();
  const a=await auth(ctx,d.reportId,'review');if(a.reviewRevision>=2147483647)throw Error();
  for(const token of entries.keys())forget(token);
  const token=randomUUID(),command=Object.freeze({...d,requestId:token,expectedReviewRevision:a.reviewRevision});
  const until=Math.min(clock()+300000,a.validUntilMs,a.expiresAtMs);
  const p={ctx,reportId:d.reportId,command,source:a,state:'prepared',until,result:null,timer:null};
  p.timer=setTimeout(()=>forget(token),Math.max(0,until-clock()));p.timer.unref?.();entries.set(token,p);
  return Object.freeze({ok:true,token,reportId:d.reportId,decision:d.decision,expectedReviewRevision:a.reviewRevision,until,fingerprint:createHash('sha256').update(JSON.stringify([c.recordId,d.reportId,a.digest,a.submissionRevision,a.reviewRevision,d.decision,d.feedback])).digest('hex')});
 });}
 async function act(input,token,recovery){return run(async()=>{
  const ctx=validCtx(input,c.reviewerId),p=entries.get(token);if(!p||p.ctx.actorId!==ctx.actorId)throw Error();
  if(p.state==='uncertain'&&!recovery)return deny('recovery-required');if(recovery&&!['uncertain','done'].includes(p.state))throw Error();
  let a;try{a=await auth(ctx,p.reportId,'review');}catch{forget(token);return deny();}
  if(clock()>=p.until||a.digest!==p.source.digest||a.submissionRevision!==p.source.submissionRevision||a.expiresAtMs!==p.source.expiresAtMs){forget(token);return deny('refresh-required');}
  p.until=Math.min(p.until,a.validUntilMs,a.expiresAtMs);clearTimeout(p.timer);p.timer=setTimeout(()=>forget(token),Math.max(0,p.until-clock()));p.timer.unref?.();
  if(p.state==='done')return p.result;
  if(!recovery&&a.reviewRevision!==p.command.expectedReviewRevision){forget(token);return deny('conflict');}
  const command=p.command;p.state='inflight';let r;
  try{r=await store.recordReview(ctx,command);}catch{r=deny('outcome-unknown');}
  p.state='uncertain';
  if(closed||!entries.has(token)||clock()>=p.until){forget(token);return deny('acknowledgement-unavailable');}
  if(r?.ok===true){
   try{p.result=receipt(r,p.reportId,command);if(p.result.submissionRevision!==p.source.submissionRevision||p.result.expiresAtMs!==p.source.expiresAtMs)throw Error();}catch{p.state='uncertain';return Object.freeze({ok:false,reason:'recovery-required',token,reportId:p.reportId});}
   p.state='done';p.command=null;
   try{await auth(ctx,p.reportId,'review');}catch{return deny('acknowledgement-unavailable');}
   return p.result;
  }
  if(['conflict','unavailable','disabled'].includes(r?.reason)){forget(token);return deny(r.reason);}
  p.state='uncertain';return Object.freeze({ok:false,reason:'recovery-required',token,reportId:p.reportId});
 });}
 async function getStatus(input,id){return run(async()=>{const ctx=validCtx(input,c.learnerId);if(!uuid(id))throw Error();await auth(ctx,id,'status');const r=receipt(await store.getStatus(ctx,id),id);await auth(ctx,id,'status');return r;});}
 const empty=()=>({content:'Review controls are unavailable.',embeds:[],components:[],allowedMentions:{parse:[]}});
 const button=(label,custom_id)=>({type:2,style:1,label,custom_id});
 async function handle(i){
  if(typeof i?.customId!=='string'||!i.customId.startsWith('nrv:'))return false;
  let acknowledged=false;
  const reject=async()=>{try{if(acknowledged)await i.editReply(empty());else if(!i.deferred&&!i.replied)await i.reply({...empty(),flags:64});}catch{}return true;};
  if(handling)return reject();handling=true;
  try{
   guard();trim();if(i.isButton?.()!==true||i.deferred||i.replied||i.guildId!==c.guildId||i.message?.author?.id!==c.botId)throw Error();
   const ctx=context({actorId:i.user?.id,guildId:i.guildId});
   const opening=i.customId==='nrv:prepare',status=i.customId==='nrv:status';let token;
   if(opening||status){if(ctx.actorId!==(status?c.learnerId:c.reviewerId)||i.channelId!==(status?c.learnerChannelId:c.reviewChannelId)||i.message.id!==(status?c.learnerEntryMessageId:c.reviewEntryMessageId))throw Error();await i.deferReply({flags:64});acknowledged=true;}
   else{const b=bindings.get(i.message.id),match=/^nrv:(confirm|recover):([a-f0-9-]{36})$/.exec(i.customId);if(!b||!match||b.token!==match[2]||b.actorId!==ctx.actorId||ctx.actorId!==c.reviewerId||i.channelId!==c.reviewChannelId||i.message.flags?.has?.(64)!==true)throw Error();token=match[2];await i.deferUpdate();acknowledged=true;}
   guard();let r;
   if(opening){const draft=await selectDraft(ctx);r=await prepare(ctx,draft);token=r.token;}
   else if(status){const id=await selectReport(ctx);r=await getStatus(ctx,id);}
   else r=await act(ctx,token,i.customId.startsWith('nrv:recover:'));
   guard();trim();let payload=empty();
   if(r?.ok===true&&opening&&entries.has(token)){
    await auth(ctx,r.reportId,'review');payload={content:`Report: ${r.reportId}\nDecision: ${r.decision}\nExpected review revision: ${r.expectedReviewRevision}\nCommand fingerprint: ${r.fingerprint}\nConfirm this exact selection. Feedback is not copied into this control message.`,components:[{type:1,components:[button('Confirm review',`nrv:confirm:${token}`)]}]};
   }else if(r?.ok===true){
    await auth(ctx,r.reportId,status?'status':'review');payload={content:`${status?'Current status':'Review acknowledgement'}: ${r.status}\nSubmission revision: ${r.submissionRevision}\nReview revision: ${r.reviewRevision}`,components:[]};
   }else if(r?.reason==='recovery-required'&&token&&entries.has(token)){
    await auth(ctx,entries.get(token).reportId,'review');payload={content:'The review outcome needs reconciliation. Do not create a new request. Recover only the exact original request.',components:[{type:1,components:[button('Recover original review',`nrv:recover:${token}`)]}]};
   }
   guard();const message=await i.editReply({...payload,embeds:[],allowedMentions:{parse:[]}});
   if(opening&&token&&entries.get(token)?.ctx.actorId===ctx.actorId&&snow(message?.id)&&message.author?.id===c.botId&&message.flags?.has?.(64)===true&&entries.has(token))bindings.set(message.id,{token,actorId:ctx.actorId});
   return true;
  }catch{return reject();}finally{handling=false;}
 }
 return Object.freeze({prepare,confirm:(ctx,t)=>act(ctx,t,false),recover:(ctx,t)=>act(ctx,t,true),getStatus,handle,dispose(){closed=true;for(const token of entries.keys())forget(token);bindings.clear();}});
}
