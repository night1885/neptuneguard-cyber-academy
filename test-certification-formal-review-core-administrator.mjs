import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewAdministratorAuthorization} from './formal-review-administrator-authorization.mjs';
const guildId='100000000000000001',ownerId='100000000000000002',learnerId='100000000000000003',adminId='100000000000000004',courseKey='ethical-hacking-reading';
function fixture(mode='current-administrator',verify=async()=>true){
 const stamp=Date.now(),workId=randomUUID(),reportId=randomUUID(),body='Fictional report';let reads=0,writes=0;
 const w={id:workId,guildId,learnerId,studentId:'fictional-id',channelId:'100000000000000005',courseKey,exerciseKey:'EH-NET-02',revision:1,state:'submitted',createdAtMs:stamp-2000,expiresAtMs:stamp+86400000};
 const r={id:reportId,workId,revision:1,body,bodyDigest:createHash('sha256').update(body).digest('hex'),submittedAtMs:stamp,expiresAtMs:w.expiresAtMs};
 const provider=createFormalReviewAdministratorAuthorization({guildId,isReady:()=>true,verifyAdministrator:verify});
 const tx={lockWork:async()=>w,readReport:async()=>{reads++;return r;},readReview:async()=>null,findOperation:async()=>null,insertReview:async scope=>{assert.equal(scope.actorId,adminId);writes++;return {reportId,revision:2,expiresAtMs:r.expiresAtMs};},saveOperation:async()=>{}};
 const core=createFormalReviewCore({enabled:true,guildId,ownerId,courseKey,exerciseKeys:['EH-NET-02'],...(mode===undefined?{}:{reviewerMode:mode})},{transaction:fn=>fn(tx),authorizeCourse:async()=>({studentId:w.studentId,courseKey}),authorizeExercise:async()=>true,authorizeReviewer:provider.authorizeReviewer,readSource:async()=>null,now:()=>stamp,isReady:()=>true});
 return {core,provider,w,r,request:{workId,reportId},actor:actorId=>({actorId,guildId}),get reads(){return reads;},get writes(){return writes;},close(){core.dispose();provider.dispose();return provider.drain();}};
}
test('non-owner current Administrator can read and record review in explicit mode',async()=>{
 const f=fixture();try{assert.equal((await f.core.read(f.actor(adminId),f.request)).ok,true);const result=await f.core.review(f.actor(adminId),{...f.request,operationId:randomUUID(),expectedRevision:1,decision:'review-recorded',feedback:'Fictional feedback'});assert.equal(result.ok,true);assert.equal(f.writes,1);assert.equal(result.expiresAtMs,f.r.expiresAtMs);}finally{await f.close();}
});
test('owner mode continues denying a non-owner even with positive verifier',async()=>{
 const f=fixture('owner');try{assert.deepEqual(await f.core.read(f.actor(adminId),f.request),{ok:false});assert.equal(f.reads,0);}finally{await f.close();}
});
test('non-Administrator denied before report body read',async()=>{
 const f=fixture('current-administrator',async()=>false);try{assert.deepEqual(await f.core.read(f.actor(adminId),f.request),{ok:false});assert.equal(f.reads,0);assert.equal(f.writes,0);}finally{await f.close();}
});
test('permission loss during a read denies returned content',async()=>{
 let checks=0;const f=fixture('current-administrator',async()=>++checks===1);try{assert.deepEqual(await f.core.read(f.actor(adminId),f.request),{ok:false});assert.equal(f.reads,1);assert.ok(checks>=2);}finally{await f.close();}
});
test('learner retains own read but cannot self-review even if Administrator',async()=>{
 const f=fixture();try{assert.equal((await f.core.read(f.actor(learnerId),f.request)).ok,true);assert.deepEqual(await f.core.review(f.actor(learnerId),{...f.request,operationId:randomUUID(),expectedRevision:1,decision:'review-recorded',feedback:'Self review'}),{ok:false});assert.equal(f.writes,0);}finally{await f.close();}
});
test('foreign guild and administrator preview remain denied',async()=>{
 const f=fixture();try{assert.deepEqual(await f.core.read({actorId:adminId,guildId:ownerId},f.request),{ok:false});assert.deepEqual(await f.core.preview(f.actor(adminId),{workId:f.w.id,sourceMessageId:'100000000000000006'}),{ok:false});assert.equal(f.writes,0);}finally{await f.close();}
});
