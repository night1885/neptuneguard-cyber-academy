import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
const G='100000000000000001',O='100000000000000002',A='100000000000000003',C='100000000000000004',D='100000000000000005',W='11111111-1111-4111-8111-111111111111',KEY='ethical-hacking-reading';
const scope={actorId:D,guildId:G,learnerId:A,studentId:'fictional-id',courseKey:KEY,exerciseKey:'EH-NET-02',workId:W,sourceChannelId:C};
const native="SELECT e.*,c.status AS course_status,c.course_key AS authorized_course_key FROM certification_enrollments e JOIN certification_course_enrollments c ON c.discord_user_id=e.discord_user_id WHERE e.discord_user_id=$1 AND c.course_key=$2 AND e.status='approved' AND c.status='active'";
function fixture(mode='current-administrator'){
 const state={permitted:true,removed:false,grants:0,reviewers:[],row:{student_id:'fictional-id',course_key:KEY}};
 const readPool={async query(sql,args){
  if(sql.includes('pg_catalog.pg_roles'))return {rows:[{database:'formal_review_test',login:'formal_reader',direct:true,restricted:true,schemas:['public'],statement_ms:'2000',no_create:true,reads:true,no_writes:true}]};
  if(sql.includes('AS removal_read'))return {rows:[{removal_read:true,removal_no_writes:true}]};
  assert.deepEqual(args,[A,KEY]);if(sql.includes('AS clear'))return {rows:[{clear:!state.removed}]};
  state.grants++;state.hook?.();return {rows:state.row?[state.row]:[]};
 }};
 const adapter=createFormalReviewCourseAuthorization({enabled:true,guildId:G,ownerId:O,readPool,expectedDatabase:'formal_review_test',expectedLogin:'formal_reader',isReady:()=>true,reviewerMode:mode,...(mode==='current-administrator'?{authorizeReviewer:async s=>{state.reviewers.push(s.actorId);return s.actorId===D&&state.permitted;}}:{}),config:{enabled:true,ownerId:O,activeAgreementVersion:'v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'c1'},courseRemovalEnabled:true},createLifecycle:async facade=>({async getCourseAuthorization(subject,key){return (await facade.query(native,[subject,key])).rows[0];}})});
 return {state,adapter,async close(){adapter.dispose();await adapter.drain();}};
}
test('Administrator course checks use learner identity and repeat reviewer authority',async()=>{const f=fixture();try{await f.adapter.initialize();assert.deepEqual(await f.adapter.authorizeCourse(scope),{studentId:'fictional-id',courseKey:KEY});assert.deepEqual(f.state.reviewers,[D,D]);assert.equal(f.state.grants,1);}finally{await f.close();}});
test('non-Administrator and owner-mode foreign actor are denied before grant retrieval',async()=>{for(const mode of ['owner','current-administrator']){const f=fixture(mode);try{await f.adapter.initialize();f.state.permitted=false;assert.equal(await f.adapter.authorizeCourse(scope),null);assert.equal(f.state.grants,0);}finally{await f.close();}}});
test('permission loss or learner removal during retrieval suppresses authorization',async()=>{for(const mode of ['reviewer','removal']){const f=fixture();try{await f.adapter.initialize();f.state.hook=()=>{if(mode==='reviewer')f.state.permitted=false;else f.state.removed=true;};assert.equal(await f.adapter.authorizeCourse(scope),null);assert.equal(f.state.grants,1);}finally{await f.close();}}});
test('missing eligibility or mismatched permanent student ID still denies Administrator',async()=>{for(const row of [null,{student_id:'other-id',course_key:KEY}]){const f=fixture();try{await f.adapter.initialize();f.state.row=row;assert.equal(await f.adapter.authorizeCourse(scope),null);}finally{await f.close();}}});
test('learner own course authorization does not require Administrator permission',async()=>{const f=fixture();try{await f.adapter.initialize();f.state.permitted=false;assert.deepEqual(await f.adapter.authorizeCourse({...scope,actorId:A}),{studentId:'fictional-id',courseKey:KEY});assert.deepEqual(f.state.reviewers,[]);}finally{await f.close();}});
