import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerPreservationReview} from './certification-preservation-owner-review.js';
import {createClosedApplicationRetentionExecutor} from './certification-retention-closed-application.js';
import {createAuditRetentionExecutor} from './certification-retention-audit-executor.js';
import {createSharedEnrollmentRetentionExecutor} from './certification-retention-shared-executor.js';
import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const owner='1223123544301633567',subject='1223123544301633568',guild='1223123544301633569';
const stamp=new Date('2026-10-24T04:00:00.000Z'),event='9007199254740993',occurred='2026-01-31T23:59:59.123456Z',cutoff='2026-10-24T04:00:00.000000Z';
const config={ownerId:owner,executorRole:'retention_fixture',expectedDatabase:'certification_test',schema:'fixture',enabled:true};
const tables=['certification_enrollments','certification_course_enrollments','certification_lab_requests','certification_audit_events'];
const flags=keys=>Object.fromEntries(keys.split(' ').map(k=>[k,true]));
function fixture(kind,mode='allow'){
  const calls=[],released=[],lookups=[];let connects=0;
  const closed={discord_user_id:subject,status:'denied',student_id:null,approved_by:null,approved_at:null,application_closed_at:new Date('2026-10-16T16:00:00.123Z'),application_closed_by:owner,application_closed_as:'withdrawn',exact_closure:true};
  const enrollment={discord_user_id:subject,status:'approved',student_id:'NG-fixture',approved_by:owner,approved_at_utc:'2026-10-18T12:00:00.123456Z',application_closed_at:null,application_closed_by:null,application_closed_as:null};
  const courses=['one','two'].map(course_key=>({discord_user_id:subject,course_key,status:'completed',assigned_by:owner,completed_by:owner,assigned_at_utc:'2026-10-20T12:00:00.000000Z',completed_at_utc:'2026-10-22T12:00:00.000000Z'}));
  const snapshot=buildSharedCompletionSnapshot({database:config.expectedDatabase,schema:config.schema,subjectId:subject,enrollment,courses,labCount:0,unreviewedDependencies:[],asOf:stamp});
  const evidence=kind==='closed'?{category:'closed_application',subjectId:subject,closedAt:closed.application_closed_at.toISOString()}:kind==='audit'?{category:'audit_event',eventId:event,occurredAt:occurred}:{category:'completed_shared_enrollment',subjectId:subject,snapshotSha256:snapshot.snapshotSha256,courseKeys:['one','two']};
  const scope={policyVersion:'owner-preservation-v1',guildId:guild,database:config.expectedDatabase,schema:config.schema,actorId:owner,...evidence};
  const stored={...scope,decision:'allow',reviewerId:owner,reviewComplete:true,uncertain:false,preservationRequired:false,revoked:false,reference:'composition_fixture',reviewedAt:new Date(stamp.getTime()-100),expiresAt:new Date(stamp.getTime()+1000)};
  if(mode==='wrong_reviewer')stored.reviewerId=subject;
  if(mode==='wrong_scope')stored.guildId=subject;
  if(mode==='stale_binding'){if(kind==='closed')stored.closedAt='2026-10-16T16:00:00.124Z';else if(kind==='audit')stored.occurredAt='2026-01-31T23:59:59.123457Z';else stored.snapshotSha256='b'.repeat(64);}
  if(mode==='hold')stored.decision='hold';if(mode==='uncertain')stored.uncertain=true;if(mode==='preserve')stored.preservationRequired=true;if(mode==='revoked')stored.revoked=true;if(mode==='expired')stored.expiresAt=new Date(stamp);
  const reviewPreservation=createOwnerPreservationReview({ownerId:owner,guildId:guild,database:config.expectedDatabase,schema:config.schema,enabled:mode!=='disabled',lookupTimeoutMs:mode==='timeout'?5:500},{now:()=>new Date(stamp),readClearance:async request=>{
    lookups.push(request);const {signal,...actual}=request;assert.deepEqual(actual,scope);assert.ok(signal instanceof AbortSignal);
    if(mode==='missing')return null;if(mode==='throw')throw new Error('PRIVATE lookup details');if(mode==='timeout')return new Promise(()=>{});return stored;
  }});
  const pool={async connect(){connects++;return{async query(sql,params){
    calls.push({sql,params});if(/^(BEGIN|SET|LOCK|COMMIT|ROLLBACK)/.test(sql))return{rows:[]};
    if(sql.includes('AS session_role'))return{rows:[{database:config.expectedDatabase,role:config.executorRole,session_role:config.executorRole,origin:true,restricted:true}]};
    if(sql.includes('AS ordinary_table'))return{rows:[flags('ordinary_table non_owner schema_access can_delete can_read audit_limits other_limits')]};
    if(sql.includes('c.relrowsecurity'))return{rows:tables.map(relname=>({relname,relkind:'r',relrowsecurity:false,relforcerowsecurity:false,owner_member:false}))};
    if(sql.includes('AS schema_access'))return{rows:[flags(kind==='closed'?'schema_access can_delete can_lock parent_limits update_scope parent_read child_read child_limits':'schema_access parent_write parent_limits parent_read course_write course_read lab_read unrelated_limits')]};
    if(sql.includes('AS bigint_id'))return{rows:[flags('bigint_id timestamp_column primary_key no_inbound_fk no_delete_trigger no_rules')]};
    if(sql.includes('AS parent_schema')||sql.includes('AS child_schema'))return{rows:[tables[1],tables[2]].map(child_table=>({parent_schema:config.schema,parent_table:tables[0],child_schema:config.schema,child_table,convalidated:true,condeferrable:false,confdeltype:child_table===tables[1]?'r':'a',child_columns:['discord_user_id'],parent_columns:['discord_user_id']}))};
    if(sql.includes('AS no_delete_triggers'))return{rows:[{no_delete_triggers:true,no_rules:true}]};
    if(sql.includes('FOR UPDATE'))return{rows:[kind==='closed'?closed:enrollment]};
    if(sql.includes('AS courses_exist'))return{rows:[{courses_exist:false,labs_exist:false}]};
    if(sql.includes('AS assigned_at_utc'))return{rows:courses};
    if(sql.includes('AS has_labs'))return{rows:[{has_labs:false}]};
    if(sql.startsWith('SELECT event_id'))return{rows:[{event_id:event,occurred_at_utc:occurred}]};
    if(sql.startsWith('DELETE')){if(kind==='audit')return{rowCount:1,rows:[{event_id:event}]};if(sql.includes('RETURNING course_key'))return{rowCount:2,rows:courses.map(c=>({course_key:c.course_key}))};return{rowCount:1,rows:[{discord_user_id:subject}]};}
    throw new Error('Unexpected composition fixture SQL');
  },release(discard){released.push(discard);}};}};
  const dependencies={reviewPreservation,now:()=>new Date(stamp),cutoffUtc:()=>cutoff};
  const executor=kind==='closed'?createClosedApplicationRetentionExecutor(pool,config,dependencies):kind==='audit'?createAuditRetentionExecutor(pool,config,dependencies):createSharedEnrollmentRetentionExecutor(pool,config,dependencies);
  return{calls,released,lookups,get connects(){return connects;},execute:(actorId=owner)=>kind==='audit'?executor.execute(actorId,event):kind==='shared'?executor.execute(actorId,subject,snapshot.snapshotSha256):executor.execute(actorId,subject)};
}
const modes=['missing','wrong_reviewer','wrong_scope','stale_binding','hold','uncertain','preserve','revoked','expired','throw','timeout','disabled'];
for(const kind of ['closed','audit','shared']){
  test(`${kind}: real adapter clearance is accepted by the real executor with mocked SQL`,async()=>{
    const f=fixture(kind),result=await f.execute();assert.equal(result.outcome,'deleted');assert.equal(result.preservationReference,'composition_fixture');assert.equal(f.lookups.length,1);assert.equal(f.lookups[0].signal.aborted,true);
    const deletes=f.calls.filter(q=>q.sql.startsWith('DELETE'));assert.equal(deletes.length,kind==='shared'?2:1);
    if(kind==='shared'){assert.equal(result.deletedEnrollments,1);assert.equal(result.deletedCourses,2);assert.match(deletes[0].sql,/certification_course_enrollments/);assert.match(deletes[1].sql,/certification_enrollments/);assert.equal(deletes[1].params[4],'2026-10-18T12:00:00.123456Z');}
    else{assert.equal(result.deleted,1);if(kind==='audit')assert.deepEqual(deletes[0].params,[event,occurred,cutoff]);else assert.equal(deletes[0].params[1],'2026-10-16T16:00:00.123Z');}
    assert.equal(f.calls.at(-1).sql,'COMMIT');assert.deepEqual(f.released,[false]);
  });
  test(`${kind}: non-owner executor invocation cannot reach a connection or review lookup`,async()=>{const f=fixture(kind);await assert.rejects(f.execute(subject));assert.equal(f.connects,0);assert.equal(f.lookups.length,0);});
  for(const mode of modes)test(`${kind}: ${mode} clearance blocks every DELETE and rolls back`,async()=>{
    const f=fixture(kind,mode);await assert.rejects(f.execute(),e=>/preservation/.test(e.message)&&!e.message.includes('PRIVATE'));
    assert.equal(f.calls.filter(q=>q.sql.startsWith('DELETE')).length,0);assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.deepEqual(f.released,[false]);
    assert.equal(f.lookups.length,mode==='disabled'?0:1);if(f.lookups.length)assert.equal(f.lookups[0].signal.aborted,true);
  });
}
