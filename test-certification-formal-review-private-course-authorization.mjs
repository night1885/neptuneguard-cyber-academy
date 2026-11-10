import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewPrivateCourseAuthorization} from './formal-review-private-course-authorization.mjs';
const G='100000000000000001',O='100000000000000002',A='100000000000000003',C='100000000000000004',D='100000000000000005';
const W='11111111-1111-4111-8111-111111111111',R='22222222-2222-4222-8222-222222222222',OP='33333333-3333-4333-8333-333333333333';
const scope={actorId:A,guildId:G,learnerId:A,studentId:'fictional-id',courseKey:'ethical-hacking-reading',exerciseKey:'EH-NET-02',workId:W,sourceChannelId:C};
function fixture(){
 const state={private:true,available:true,checks:0,courseReads:0,reportReads:0,writes:0,sourceReads:0};
 const course={enabled:true,ready:false,async initialize(){this.ready=true;return {ready:true};},async authorizeCourse(s){state.courseReads++;state.onCourse?.();return {studentId:s.studentId,courseKey:s.courseKey};},dispose(){this.ready=false;},drain:async()=>{}};
 const source={enabled:true,async verifyPrivateChannel(s){assert.equal(Object.isFrozen(s),true);assert.deepEqual({...s},{...scope,actorId:s.actorId});state.checks++;if(state.throwPrivacy)throw Error('Fictional unavailable provider');return state.private;}};
 const gate=createFormalReviewPrivateCourseAuthorization({enabled:true,courseAuthorization:course,source,isReady:()=>state.available});
 const stamp=Date.now(),body='Fictional privacy-gated report',expires=stamp-1000+86400000;
 const work={id:W,guildId:G,learnerId:A,studentId:scope.studentId,channelId:C,courseKey:scope.courseKey,exerciseKey:scope.exerciseKey,revision:1,state:'submitted',expiresAtMs:expires};
 const report={id:R,workId:W,revision:1,body,bodyDigest:createHash('sha256').update(body).digest('hex'),submittedAtMs:stamp-1000,expiresAtMs:expires};
 const core=createFormalReviewCore({enabled:true,guildId:G,ownerId:O,courseKey:scope.courseKey,exerciseKeys:[scope.exerciseKey],reviewerMode:'current-administrator'},{transaction:async fn=>fn({lockWork:async()=>({...work}),readReport:async()=>{state.reportReads++;state.onReport?.();return report;},readReview:async()=>null,findOperation:async()=>null,insertReview:async()=>{state.writes++;return {reportId:R,revision:2,expiresAtMs:expires};},saveOperation:async()=>{}}),authorizeCourse:s=>gate.authorizeCourse(s),authorizeExercise:async()=>true,authorizeReviewer:async s=>s.actorId===D,readSource:async()=>{state.sourceReads++;return null;},now:()=>stamp,isReady:()=>gate.ready});
 return {state,course,source,gate,core,async close(){core.dispose();gate.dispose();await gate.drain();}};
}
const read=f=>f.core.read({actorId:A,guildId:G},{workId:W,reportId:R});
test('default-off gate performs no provider calls',async()=>{const gate=createFormalReviewPrivateCourseAuthorization();assert.equal(gate.enabled,false);assert.equal(await gate.authorizeCourse(scope),null);});
test('enabled gate requires a private-channel verifier',()=>{assert.throws(()=>createFormalReviewPrivateCourseAuthorization({enabled:true,courseAuthorization:{enabled:true},source:{enabled:true},isReady:()=>true}),/private authorization unavailable/);});
test('actual core saved read rechecks privacy without fetching source content',async()=>{const f=fixture();try{await f.gate.initialize();const result=await read(f);assert.equal(result.ok,true);assert.equal(result.body,'Fictional privacy-gated report');assert.equal(f.state.checks,6);assert.equal(f.state.sourceReads,0);assert.equal(f.state.writes,0);}finally{await f.close();}});
for(const mode of ['denied','exception','course-drift','read-drift'])test('actual core denies private report on '+mode,async()=>{const f=fixture();try{await f.gate.initialize();if(mode==='denied')f.state.private=false;if(mode==='exception')f.state.throwPrivacy=true;if(mode==='course-drift')f.state.onCourse=()=>{f.state.private=false;};if(mode==='read-drift')f.state.onReport=()=>{f.state.private=false;};assert.deepEqual(await read(f),{ok:false});assert.equal(f.state.reportReads,mode==='read-drift'?1:0);assert.equal(f.state.sourceReads,0);assert.equal(f.state.writes,0);}finally{await f.close();}});
test('actual core denies Administrator review before report read or write when privacy is lost',async()=>{const f=fixture();try{await f.gate.initialize();f.state.private=false;assert.deepEqual(await f.core.review({actorId:D,guildId:G},{workId:W,operationId:OP,expectedRevision:1,reportId:R,decision:'review-recorded',feedback:'Fictional feedback'}),{ok:false});assert.equal(f.state.reportReads,0);assert.equal(f.state.writes,0);assert.equal(f.state.sourceReads,0);}finally{await f.close();}});
test('scope is snapshotted before awaiting privacy',async()=>{const f=fixture();try{await f.gate.initialize();const selected={...scope};const result=f.gate.authorizeCourse(selected);selected.studentId='different';assert.deepEqual(await result,{studentId:scope.studentId,courseKey:scope.courseKey});}finally{await f.close();}});
test('readiness loss during course authorization denies access',async()=>{const f=fixture();try{await f.gate.initialize();f.state.onCourse=()=>{f.state.available=false;};assert.equal(await f.gate.authorizeCourse(scope),null);}finally{await f.close();}});
test('malformed scope is rejected before providers',async()=>{const f=fixture();try{await f.gate.initialize();assert.equal(await f.gate.authorizeCourse({...scope,extra:true}),null);assert.equal(f.state.checks,0);assert.equal(f.state.courseReads,0);}finally{await f.close();}});
