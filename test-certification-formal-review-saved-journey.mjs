import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewIntake} from './formal-review-intake.mjs';
import {createFormalReviewInteractions} from './formal-review-interactions.mjs';
const guildId='100000000000000001',ownerId='100000000000000002',learnerId='100000000000000003',channelId='100000000000000004',applicationId='100000000000000005',botId='100000000000000006',messageId='100000000000000007',otherId='100000000000000008';
const workId='11111111-1111-4111-8111-111111111111',reportId='22222222-2222-4222-8222-222222222222',reviewOperation='33333333-3333-4333-8333-333333333333';
function fixture(){
 const state={clock:1000,course:true,output:[],sourceReads:0,data:{work:{id:workId,guildId,learnerId,channelId,studentId:'NG-fictional',courseKey:'ethical-hacking-reading',exerciseKey:'EH-NET-02',revision:0,state:'working',expiresAtMs:100000000},report:null,review:null,operations:{}}};
 let tail=Promise.resolve(),serial=100000000000000100n;
 const core=createFormalReviewCore({enabled:true,guildId,ownerId,courseKey:'ethical-hacking-reading',exerciseKeys:['EH-NET-02']},{
  now:()=>state.clock,isReady:()=>true,authorizeCourse:async()=>state.course?{studentId:'NG-fictional',courseKey:'ethical-hacking-reading'}:null,authorizeExercise:async()=>true,authorizeReviewer:async()=>true,
  async readSource(){state.sourceReads++;return {messageId,guildId,channelId,authorId:learnerId,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body:'Fictional bounded report.',createdAtMs:500};},
  transaction(callback){const task=tail.then(async()=>{const d=structuredClone(state.data);const result=await callback({
   lockWork:async id=>id===workId?structuredClone(d.work):null,
   findOperation:async(w,a,op)=>d.operations[a+op]??null,
   readReport:async(w,id)=>w===workId&&id===reportId?structuredClone(d.report):null,
   readReview:async()=>structuredClone(d.review),
   async insertSubmission(scope,p){assert.equal(scope.learnerId,learnerId);assert.equal(p.expectedRevision,d.work.revision);const revision=d.work.revision+1;d.report={id:reportId,workId,revision,body:p.body,bodyDigest:p.bodyDigest,submittedAtMs:p.submittedAtMs,expiresAtMs:p.expiresAtMs};d.work.revision=revision;d.work.state='submitted';return {reportId,revision,expiresAtMs:p.expiresAtMs};},
   async insertReview(scope,p){assert.equal(scope.actorId,ownerId);assert.equal(p.expectedRevision,d.work.revision);d.review={...p};d.work.revision++;d.work.state=p.decision;return {reportId,revision:d.work.revision,expiresAtMs:p.expiresAtMs};},
   async saveOperation(scope,r){d.operations[scope.actorId+r.operationId]={...r};}
  });state.data=d;return result;});tail=task.catch(()=>{});return task;}
 });
 const intake=createFormalReviewIntake({enabled:true,core,isReady:()=>true,now:()=>state.clock});
 const handler=createFormalReviewInteractions({enabled:true,guildId,applicationId,botId,core,intake,isReady:()=>true,now:()=>state.clock});
 function interaction(customId,actorId=learnerId){return {id:(serial++).toString(),customId,guildId,applicationId,channelId,channel:{id:channelId,guildId,type:0},user:{id:actorId},message:{author:{id:botId},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;this.ephemeral=true;},async editReply(p){state.output.push(p);},async reply(p){state.output.push(p);}};}
 async function submit(){const preview=await intake.preview({actorId:learnerId,guildId,channelId},{workId,sourceMessageId:messageId,consent:true});assert.equal(preview.ok,true);await handler.handle(interaction('frv:confirm:'+preview.previewId));assert.equal(state.data.work.revision,1);const ids=state.output.at(-1).components.flatMap(r=>r.components.map(c=>c.custom_id));assert.ok(ids.includes('frv:report:'+workId+':'+reportId));return state.data.report.expiresAtMs;}
 async function close(){handler.dispose();intake.dispose();core.dispose();await Promise.all([handler.drain(),intake.drain()]);}
 return {state,core,handler,interaction,submit,close};
}
test('actual core and intake: submit, reopen report, record review, read feedback',async()=>{const f=fixture();try{const deadline=await f.submit(),reads=f.state.sourceReads;await f.handler.handle(f.interaction('frv:report:'+workId+':'+reportId));assert.equal(f.state.output.at(-1).embeds[0].description,'Fictional bounded report.');const result=await f.core.review({actorId:ownerId,guildId},{workId,operationId:reviewOperation,expectedRevision:1,reportId,decision:'changes-requested',feedback:'Explain the fictional timeout.'});assert.equal(result.ok,true);await f.handler.handle(f.interaction('frv:feedback:'+workId+':'+reportId));assert.equal(f.state.output.at(-1).embeds[0].description,'Explain the fictional timeout.');assert.equal(f.state.data.report.expiresAtMs,deadline);assert.equal(f.state.sourceReads,reads);assert.equal(f.state.data.work.revision,2);}finally{await f.close();}});
for(const denial of ['other-learner','course-revoked','expired'])test('actual core denies saved access: '+denial,async()=>{const f=fixture();try{const deadline=await f.submit();if(denial==='course-revoked')f.state.course=false;if(denial==='expired')f.state.clock=deadline;await f.handler.handle(f.interaction('frv:report:'+workId+':'+reportId,denial==='other-learner'?otherId:learnerId));const p=f.state.output.at(-1);assert.equal(p.content,'Saved report unavailable or expired.');assert.deepEqual(p.embeds,[]);assert.equal(f.state.data.work.revision,1);assert.equal(f.state.data.report.body,'Fictional bounded report.');}finally{await f.close();}});
