import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const owner='1223123544301633567',subject='1223123544301633568';
function fixture(){return{database:'certification_test',schema:'fixture',subjectId:subject,asOf:new Date('2026-10-22T04:00:00Z'),labCount:0,unreviewedDependencies:[],
  enrollment:{discord_user_id:subject,status:'approved',student_id:'NG-fixture',approved_by:owner,approved_at_utc:'2026-10-18T12:00:00.123456Z',application_closed_at:null,application_closed_by:null,application_closed_as:null},
  courses:['course-one','course-two'].map(course_key=>({discord_user_id:subject,course_key,status:'completed',assigned_at_utc:'2026-10-19T12:00:00.123000Z',assigned_by:owner,completed_at_utc:'2026-10-21T12:00:00.456000Z',completed_by:owner}))};}
test('complete set produces immutable evidence, not execution authorization',()=>{
  const input=fixture(),before=structuredClone(input),result=buildSharedCompletionSnapshot(input);
  assert.equal(result.courseCount,2);assert.equal(result.executionAuthorized,false);assert.match(result.snapshotSha256,/^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.courseKeys));assert.deepEqual(input,before);
});
test('course ordering does not change the bound snapshot',()=>{
  const a=fixture(),b=fixture();b.courses.reverse();assert.equal(buildSharedCompletionSnapshot(a).snapshotSha256,buildSharedCompletionSnapshot(b).snapshotSha256);
});
for(const status of ['suspended','revoked'])test(`completed ${status} enrollment can be represented without reinstatement`,()=>{
  const f=fixture();f.enrollment.status=status;assert.equal(buildSharedCompletionSnapshot(f).courseCount,2);assert.equal(f.enrollment.status,status);
});
for(const [name,change]of Object.entries({active_course:f=>{f.courses[1].status='active';},no_courses:f=>{f.courses=[];},lab:f=>{f.labCount=1;},unknown_dependency:f=>{f.unreviewedDependencies=['unreviewed_fk'];},missing_dependency_review:f=>{delete f.unreviewedDependencies;},closed_application:f=>{f.enrollment.application_closed_as='withdrawn';},missing_closure_field:f=>{delete f.enrollment.application_closed_at;},pending:f=>{f.enrollment.status='pending';},no_student_id:f=>{f.enrollment.student_id=null;},no_approval:f=>{f.enrollment.approved_by=null;},wrong_account:f=>{f.courses[0].discord_user_id=owner;},duplicate_course:f=>{f.courses[1].course_key=f.courses[0].course_key;},missing_completion_actor:f=>{f.courses[0].completed_by=null;},imprecise_completion:f=>{f.courses[0].completed_at_utc='2026-10-21T12:00:00.456001Z';},future_completion:f=>{f.courses[0].completed_at_utc='2026-10-23T12:00:00.000000Z';},reversed_chronology:f=>{f.courses[0].completed_at_utc='2026-10-18T12:00:00.000000Z';},invalid_calendar_date:f=>{f.courses[0].assigned_at_utc='2026-02-30T12:00:00.000000Z';},future_approval:f=>{f.enrollment.approved_at_utc='2026-10-23T12:00:00.000000Z';},submillisecond_future_approval:f=>{f.enrollment.approved_at_utc='2026-10-22T04:00:00.000001Z';},oversized_set:f=>{f.courses=Array.from({length:51},(_,i)=>({...f.courses[0],course_key:`course-${i}`}));}}))test(`blocks ${name}`,()=>{
  const f=fixture();change(f);assert.throws(()=>buildSharedCompletionSnapshot(f));
});
for(const [name,change]of Object.entries({target_database:f=>{f.database='other_test';},target_schema:f=>{f.schema='other_schema';},status:f=>{f.enrollment.status='revoked';},student_id:f=>{f.enrollment.student_id='NG-other';},approval_microseconds:f=>{f.enrollment.approved_at_utc='2026-10-18T12:00:00.123457Z';},completion_actor:f=>{f.courses[0].completed_by=subject;},completion_time:f=>{f.courses[0].completed_at_utc='2026-10-21T12:00:00.457000Z';},course_set:f=>{f.courses.pop();}}))test(`changed ${name} invalidates prior evidence hash`,()=>{
  const a=fixture(),b=fixture();change(b);assert.notEqual(buildSharedCompletionSnapshot(a).snapshotSha256,buildSharedCompletionSnapshot(b).snapshotSha256);
});
test('a later as-of time does not change unchanged record evidence',()=>{
  const a=fixture(),b=fixture();b.asOf=new Date('2026-10-23T04:00:00Z');assert.equal(buildSharedCompletionSnapshot(a).snapshotSha256,buildSharedCompletionSnapshot(b).snapshotSha256);
});
