import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
const G='100000000000000001',O='100000000000000002',A='100000000000000003',C='100000000000000004',W='11111111-1111-4111-8111-111111111111',KEY='ethical-hacking-reading';
const scope={actorId:A,guildId:G,learnerId:A,studentId:'NG-bound',courseKey:KEY,exerciseKey:'EH-NET-02',workId:W,sourceChannelId:C};
const native="SELECT e.*,c.status AS course_status,c.course_key AS authorized_course_key FROM certification_enrollments e JOIN certification_course_enrollments c ON c.discord_user_id=e.discord_user_id WHERE e.discord_user_id=$1 AND c.course_key=$2 AND e.status='approved' AND c.status='active'";
function fixture(flag=true){
 const state={removed:false,grants:0,checks:0,profileReads:0,profile:{removal_read:true,removal_no_writes:true},row:{student_id:'NG-bound',course_key:KEY}};
 const readPool={async query(sql,args){
  if(sql.includes('pg_catalog.pg_roles'))return {rows:[{database:'formal_review_test',login:'formal_reader',direct:true,restricted:true,schemas:['public'],statement_ms:'2000',no_create:true,reads:true,no_writes:true}]};
  if(sql.includes('AS removal_read')){state.profileReads++;if(state.profileError)throw Error('PRIVATE fixture');return {rows:[state.profile]};}
  assert.deepEqual(args,[A,KEY]);
  if(sql.includes('AS clear')){state.checks++;if(state.checkError)throw Error('PRIVATE fixture');return {rows:state.badRows??[{clear:!state.removed}]};}
  assert.ok(sql.includes('FROM public.certification_enrollments'));state.grants++;if(state.hook)state.hook();return {rows:[state.row]};
 }};
 const adapter=createFormalReviewCourseAuthorization({enabled:true,guildId:G,ownerId:O,readPool,expectedDatabase:'formal_review_test',expectedLogin:'formal_reader',isReady:()=>true,config:{enabled:true,ownerId:O,activeAgreementVersion:'v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'c1'},courseRemovalEnabled:flag},createLifecycle:async facade=>({async getCourseAuthorization(subject,key){return (await facade.query(native,[subject,key])).rows[0];}})});
 return {state,adapter};
}
for(const actorId of [A,O])test('review checks target learner removal before and after grant: '+actorId,async()=>{const f=fixture();try{await f.adapter.initialize();assert.deepEqual(await f.adapter.authorizeCourse({...scope,actorId}),{studentId:'NG-bound',courseKey:KEY});assert.equal(f.state.profileReads,1);assert.equal(f.state.checks,2);f.state.removed=true;assert.equal(await f.adapter.authorizeCourse({...scope,actorId}),null);assert.equal(f.state.grants,1);}finally{f.adapter.dispose();await f.adapter.drain();}});
test('removal committed during current grant retrieval suppresses returned grant',async()=>{const f=fixture();try{await f.adapter.initialize();f.state.hook=()=>{f.state.removed=true;};assert.equal(await f.adapter.authorizeCourse(scope),null);assert.equal(f.state.grants,1);assert.equal(f.state.checks,2);}finally{f.adapter.dispose();await f.adapter.drain();}});
for(const mode of ['unreadable','writable','missing-table'])test('initialization rejects removal metadata '+mode,async()=>{const f=fixture();try{if(mode==='unreadable')f.state.profile.removal_read=false;if(mode==='writable')f.state.profile.removal_no_writes=false;if(mode==='missing-table')f.state.profileError=true;await assert.rejects(f.adapter.initialize(),/authorization unavailable/);assert.equal(f.adapter.ready,false);assert.equal(await f.adapter.authorizeCourse(scope),null);}finally{f.adapter.dispose();await f.adapter.drain();}});
for(const rows of [[],[{clear:'true'}],[{clear:true},{clear:true}]])test('missing or ambiguous removal evidence denies '+JSON.stringify(rows),async()=>{const f=fixture();try{await f.adapter.initialize();f.state.badRows=rows;assert.equal(await f.adapter.authorizeCourse(scope),null);assert.equal(f.state.grants,0);}finally{f.adapter.dispose();await f.adapter.drain();}});
test('removal query provider errors do not reveal details',async()=>{const f=fixture();try{await f.adapter.initialize();f.state.checkError=true;assert.equal(await f.adapter.authorizeCourse(scope),null);}finally{f.adapter.dispose();await f.adapter.drain();}});
test('explicitly disabled removal feature preserves original query profile',async()=>{const f=fixture(false);try{await f.adapter.initialize();assert.ok(await f.adapter.authorizeCourse(scope));assert.equal(f.state.profileReads,0);assert.equal(f.state.checks,0);}finally{f.adapter.dispose();await f.adapter.drain();}});
