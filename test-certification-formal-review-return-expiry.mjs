import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {REVIEW_POLICY} from './formal-review-policy.mjs';

const guildId='100000000000000001',ownerId='100000000000000002',learnerId='100000000000000003',channelId='100000000000000004';
const workId='11111111-1111-4111-8111-111111111111',reportId='22222222-2222-4222-8222-222222222222';
const body='Fictional report for expiry regression.';
const deadline=1000+REVIEW_POLICY.reportMs;

for(const actorId of [learnerId,ownerId]){
 for(const expiresDuringCommit of [false,true]){
  test('saved report return deadline: '+(actorId===ownerId?'owner':'learner')+'; expires during commit='+expiresDuringCommit,async()=>{
   let clock=deadline-1;
   const work={id:workId,guildId,learnerId,channelId,studentId:'NG-fixture',courseKey:'ethical-hacking-reading',exerciseKey:'EH-NET-02',revision:2,state:'changes-requested',expiresAtMs:deadline+10000};
   const report={id:reportId,workId,revision:1,body,bodyDigest:createHash('sha256').update(body,'utf8').digest('hex'),submittedAtMs:1000,expiresAtMs:deadline};
   const core=createFormalReviewCore({enabled:true,guildId,ownerId,courseKey:work.courseKey,exerciseKeys:[work.exerciseKey]},{
    isReady:()=>true,now:()=>clock,
    authorizeCourse:async()=>({studentId:work.studentId,courseKey:work.courseKey}),
    authorizeExercise:async()=>true,authorizeReviewer:async()=>true,
    readSource:async()=>{assert.fail('Saved reads must not retrieve a Discord source');},
    async transaction(callback){
     const result=await callback({lockWork:async()=>({...work}),readReport:async()=>({...report}),readReview:async()=>null});
     if(expiresDuringCommit)clock=deadline;
     return result;
    }
   });
   try{
    const result=await core.read({actorId,guildId},{workId,reportId});
    if(expiresDuringCommit)assert.deepEqual(result,{ok:false});
    else{assert.equal(result.ok,true);assert.equal(result.body,body);assert.equal(result.expiresAtMs,deadline);}
   }finally{core.dispose();}
  });
 }
}
