import {createHash} from 'node:crypto';
import {REVIEW_POLICY,discordId,operationId,boundedReviewText,reviewClock,exactFields} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal review unavailable');};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const contentDigest=x=>createHash('sha256').update(x,'utf8').digest('hex');
export function createFormalReviewCore(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({enabled:false,submit:async()=>({ok:false}),review:async()=>({ok:false}),read:async()=>({ok:false}),dispose(){}});
 const {guildId,ownerId,courseKey,exerciseKeys}=config;
 if(!discordId(guildId)||!discordId(ownerId)||courseKey!=='ethical-hacking-reading'||!Array.isArray(exerciseKeys)||!exerciseKeys.length||exerciseKeys.length>100||new Set(exerciseKeys).size!==exerciseKeys.length||!exerciseKeys.every(x=>typeof x==='string'&&/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(x)))fail();
 for(const name of ['transaction','authorizeCourse','authorizeExercise','authorizeReviewer','readSource','now','isReady'])if(typeof ports[name]!=='function')fail();
 const exercises=new Set(exerciseKeys);let disposed=false,lastNow=-1;
 const now=()=>{if(disposed||ports.isReady()!==true)fail();const n=reviewClock(ports.now());if(n<lastNow)fail();lastNow=n;return n;};
 function context(ctx){if(!exactFields(ctx,['actorId','guildId'])||!discordId(ctx.actorId)||ctx.guildId!==guildId||disposed)fail();}
 async function authorize(ctx,w,reviewer=false){
  context(ctx);if(!w||!operationId(w.id)||w.guildId!==guildId||w.courseKey!==courseKey||!discordId(w.learnerId)||!discordId(w.channelId)||!exercises.has(w.exerciseKey)||typeof w.studentId!=='string'||!w.studentId.trim()||!Number.isSafeInteger(w.revision)||w.revision<0||!['working','submitted','changes-requested','review-recorded'].includes(w.state)||now()>=reviewClock(w.expiresAtMs))fail();
  if(reviewer?(ctx.actorId!==ownerId||w.learnerId===ownerId):ctx.actorId!==w.learnerId)fail();
  const scope=Object.freeze({actorId:ctx.actorId,guildId,learnerId:w.learnerId,studentId:w.studentId,courseKey,exerciseKey:w.exerciseKey,workId:w.id,sourceChannelId:w.channelId});
  const course=await ports.authorizeCourse(scope);
  if(course?.studentId!==w.studentId||course?.courseKey!==courseKey||await ports.authorizeExercise(scope)!==true||(reviewer&&await ports.authorizeReviewer(scope)!==true)||disposed||now()>=w.expiresAtMs)fail();
  return scope;
 }
 function receipt(r,w,op,digest){if(!r||r.workId!==w.id||r.operationId!==op||r.digest!==digest||!Number.isSafeInteger(r.revision)||r.revision<1||!operationId(r.reportId)||now()>=reviewClock(r.expiresAtMs))fail();return Object.freeze({ok:true,workId:w.id,reportId:r.reportId,revision:r.revision,expiresAtMs:r.expiresAtMs});}
 function report(r,w){if(!r||!operationId(r.id)||!Number.isSafeInteger(r.revision)||r.revision<1||r.workId!==w.id||!boundedReviewText(r.body)||r.bodyDigest!==contentDigest(r.body)||!Number.isSafeInteger(r.submittedAtMs)||r.expiresAtMs!==r.submittedAtMs+REVIEW_POLICY.reportMs||r.submittedAtMs>now()||now()>=reviewClock(r.expiresAtMs))fail();}
 async function run(ctx,request,action){
  context(ctx);if(!operationId(request?.workId))fail();const reviewer=action==='review'||(action==='read'&&ctx.actorId===ownerId);let selected;
  const result=await ports.transaction(async tx=>{
   const w=await tx.lockWork(request.workId);selected=w;const scope=await authorize(ctx,w,reviewer);
   if(action==='read'){
    if(!operationId(request.reportId))fail();const r=await tx.readReport(w.id,request.reportId);report(r,w);if(r.id!==request.reportId)fail();
    const v=await tx.readReview(w.id,r.id);if(v!==null&&(v?.reportId!==r.id||v.expectedRevision!==r.revision||v.expiresAtMs!==r.expiresAtMs||!['changes-requested','review-recorded'].includes(v.decision)||!boundedReviewText(v.feedback)))fail();
    await authorize(ctx,w,reviewer);return Object.freeze({ok:true,reportId:r.id,revision:r.revision,body:r.body,expiresAtMs:r.expiresAtMs,review:v===null?null:Object.freeze({decision:v.decision,feedback:v.feedback})});
   }
   if(!operationId(request.operationId)||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)fail();
   const digest=hash([ctx.actorId,action,Object.keys(request).sort().map(k=>[k,request[k]])]),old=await tx.findOperation(w.id,ctx.actorId,request.operationId);
   if(old){await authorize(ctx,w,reviewer);return receipt(old,w,request.operationId,digest);}
   if(w.revision!==request.expectedRevision)fail();let saved,expectedExpiry;
   if(action==='submit'){
    if(!['working','changes-requested'].includes(w.state)||!discordId(request.sourceMessageId)||typeof request.sourceDigest!=='string'||!/^[a-f0-9]{64}$/.test(request.sourceDigest))fail();
    const s=await ports.readSource(scope,request.sourceMessageId),stamp=now();
    if(!s||s.messageId!==request.sourceMessageId||s.guildId!==guildId||s.channelId!==w.channelId||s.authorId!==w.learnerId||s.privateVerified!==true||s.bot!==false||s.forwarded!==false||s.attachmentCount!==0||!boundedReviewText(s.body)||contentDigest(s.body)!==request.sourceDigest||!Number.isSafeInteger(s.createdAtMs)||s.createdAtMs<0||s.createdAtMs>stamp||stamp>=reviewClock(s.createdAtMs)+REVIEW_POLICY.draftMs)fail();
    expectedExpiry=stamp+REVIEW_POLICY.reportMs;await authorize(ctx,w);saved=await tx.insertSubmission(scope,{operationId:request.operationId,expectedRevision:w.revision,body:s.body,bodyDigest:contentDigest(s.body),sourceMessageId:s.messageId,sourceChannelId:s.channelId,sourceCreatedAtMs:s.createdAtMs,submittedAtMs:stamp,expiresAtMs:expectedExpiry});
   }else{
    if(w.state!=='submitted'||!operationId(request.reportId)||!['changes-requested','review-recorded'].includes(request.decision)||!boundedReviewText(request.feedback))fail();
    const r=await tx.readReport(w.id,request.reportId);report(r,w);if(r.id!==request.reportId||r.revision!==w.revision)fail();expectedExpiry=r.expiresAtMs;
    await authorize(ctx,w,true);saved=await tx.insertReview(scope,{operationId:request.operationId,reportId:r.id,expectedRevision:w.revision,decision:request.decision,feedback:request.feedback,expiresAtMs:expectedExpiry});
   }
   await authorize(ctx,w,reviewer);if(saved?.revision!==w.revision+1||saved?.expiresAtMs!==expectedExpiry)fail();
   const r={workId:w.id,operationId:request.operationId,digest,reportId:saved?.reportId,revision:saved.revision,expiresAtMs:saved.expiresAtMs};
   const projected=receipt(r,w,request.operationId,digest);await tx.saveOperation(scope,r);await authorize(ctx,w,reviewer);return projected;
  });
  await authorize(ctx,selected,reviewer);return result;
 }
 const safe=(fields,action)=>async(ctx,request)=>{try{if(!exactFields(request,fields))fail();return await run(ctx,request,action);}catch{return Object.freeze({ok:false});}};
 return Object.freeze({enabled:true,submit:safe(['workId','operationId','expectedRevision','sourceMessageId','sourceDigest'],'submit'),review:safe(['workId','operationId','expectedRevision','reportId','decision','feedback'],'review'),read:safe(['workId','reportId'],'read'),dispose(){disposed=true;}});
}
