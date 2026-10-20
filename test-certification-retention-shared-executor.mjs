import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedEnrollmentRetentionExecutor} from './certification-retention-shared-executor.js';
import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const owner='1223123544301633567',subject='1223123544301633568',stamp=new Date('2026-10-24T04:00:00Z');
const config={ownerId:owner,executorRole:'shared_fixture',expectedDatabase:'certification_test',schema:'fixture',enabled:true};
function fixture(options={}){
  const calls=[],released=[];let connects=0,reviews=0;
  const enrollment={discord_user_id:subject,status:options.status??'approved',student_id:'NG-fixture',approved_by:owner,approved_at_utc:'2026-10-18T12:00:00.123456Z',application_closed_at:null,application_closed_by:null,application_closed_as:null};
  const courses=['course-one','course-two'].map(course_key=>({discord_user_id:subject,course_key,status:'completed',assigned_by:owner,completed_by:owner,assigned_at_utc:'2026-10-20T12:00:00.000000Z',completed_at_utc:'2026-10-22T12:00:00.000000Z'}));
  const expected=buildSharedCompletionSnapshot({database:config.expectedDatabase,schema:config.schema,subjectId:subject,enrollment,courses,labCount:0,unreviewedDependencies:[],asOf:stamp}).snapshotSha256;
  if(options.active)courses[0].status='active';if(options.noCourses)courses.length=0;if(options.changed)enrollment.student_id='NG-changed';
  const pool={async connect(){connects++;if(options.connectFail)throw new Error('PRIVATE connect');return{async query(sql,params){
    calls.push({sql,params});if(sql==='ROLLBACK'&&options.rollbackFail)throw new Error('PRIVATE rollback');if(sql==='COMMIT'&&options.commitFail)throw new Error('PRIVATE commit');
    if(/^(BEGIN|SET|LOCK|COMMIT|ROLLBACK)/.test(sql))return{rows:[]};
    if(sql.includes('AS session_role'))return{rows:[{database:'certification_test',role:'shared_fixture',session_role:'shared_fixture',origin:true,restricted:!options.elevated}]};
    if(sql.includes('c.relrowsecurity'))return{rows:['certification_enrollments','certification_course_enrollments','certification_lab_requests','certification_audit_events'].map(relname=>({relname,relkind:'r',relrowsecurity:false,relforcerowsecurity:false,owner_member:false}))};
    if(sql.includes('AS schema_access'))return{rows:[Object.fromEntries(['schema_access','parent_write','parent_limits','parent_read','course_write','course_read','lab_read','unrelated_limits'].map(k=>[k,k!==options.denied]))]};
    if(sql.includes('AS approved_at_utc'))return{rows:options.missing?[]:[enrollment]};
    if(sql.includes('AS parent_schema')){
      const rows=['certification_course_enrollments','certification_lab_requests'].map(child_table=>({parent_schema:'fixture',parent_table:'certification_enrollments',child_schema:'fixture',child_table,convalidated:true,condeferrable:false,confdeltype:child_table==='certification_course_enrollments'?'r':'a',child_columns:['discord_user_id'],parent_columns:['discord_user_id']}));
      if(options.foreignKey)rows.push({...rows[0],parent_table:'certification_course_enrollments',child_table:'unknown_child'});if(options.cascade)rows[0].confdeltype='c';return{rows};
    }
    if(sql.includes('AS no_delete_triggers'))return{rows:[{no_delete_triggers:!options.trigger,no_rules:!options.rule}]};
    if(sql.includes('AS assigned_at_utc'))return{rows:courses};if(sql.includes('AS has_labs'))return{rows:[{has_labs:!!options.labs}]};
    if(sql.startsWith('DELETE FROM')&&sql.includes('RETURNING course_key')){if(options.courseFail)throw new Error('PRIVATE course');return{rowCount:options.countMismatch?1:2,rows:courses.map(c=>({course_key:c.course_key}))};}
    if(sql.startsWith('DELETE FROM')){if(options.parentFail)throw new Error('PRIVATE parent');return{rowCount:options.parentMismatch?0:1,rows:options.parentMismatch?[]:[{discord_user_id:subject}]};}
    assert.fail('Unexpected SQL');
  },release(v){released.push(v);}};}};
  const executor=createSharedEnrollmentRetentionExecutor(pool,{...config,...options.config},{now:()=>new Date(stamp),reviewPreservation:async context=>{reviews++;if(options.hang)return new Promise(()=>{});return{...context,decision:'allow',reference:'fixture_review',reviewedAt:new Date(stamp.getTime()-100),expiresAt:new Date(stamp.getTime()+1000),...options.decision};}});
  return{executor,expected,calls,released,get connects(){return connects;},get reviews(){return reviews;}};
}
test('disabled, wrong owner, malformed subject and missing hash stop before connection',async()=>{
  const f=fixture({config:{enabled:false}});await assert.rejects(f.executor.execute(owner,subject,f.expected));assert.equal(f.connects,0);
  const g=fixture();for(const args of [[subject,subject,g.expected],[owner,'invalid',g.expected],[owner,subject,undefined]])await assert.rejects(g.executor.execute(...args));assert.equal(g.connects,0);
});
for(const status of ['approved','suspended','revoked'])test(`complete ${status} record deletes children before parent in one transaction`,async()=>{
  const f=fixture({status});assert.deepEqual(await f.executor.execute(owner,subject,f.expected),{outcome:'deleted',deletedEnrollments:1,deletedCourses:2,preservationReference:'fixture_review'});
  const deletes=f.calls.filter(x=>x.sql.startsWith('DELETE'));assert.equal(deletes.length,2);assert.match(deletes[0].sql,/certification_course_enrollments/);assert.match(deletes[1].sql,/certification_enrollments/);
  assert.equal(deletes[1].params[4],'2026-10-18T12:00:00.123456Z');assert.equal(f.calls.at(-1).sql,'COMMIT');assert.deepEqual(f.released,[false]);
});
test('missing record is not reported deleted',async()=>{const f=fixture({missing:true});assert.equal((await f.executor.execute(owner,subject,f.expected)).deletedEnrollments,0);assert.equal(f.reviews,0);});
for(const [name,options]of Object.entries({elevated:{elevated:true},audit_mutation:{denied:'unrelated_limits'},active_course:{active:true},no_courses:{noCourses:true},linked_lab:{labs:true},changed_record:{changed:true},unknown_child:{foreignKey:true},cascade:{cascade:true},delete_trigger:{trigger:true},rewrite:{rule:true},hold:{decision:{decision:'hold'}},wrong_hash:{decision:{snapshotSha256:'a'.repeat(64)}},expired:{decision:{expiresAt:stamp}}}))test(`blocks ${name} before deleting anything`,async()=>{const f=fixture(options);await assert.rejects(f.executor.execute(owner,subject,f.expected));assert.ok(!f.calls.some(x=>x.sql.startsWith('DELETE')));assert.equal(f.calls.at(-1).sql,'ROLLBACK');});
for(const options of [{courseFail:true},{countMismatch:true},{parentFail:true},{parentMismatch:true},{commitFail:true},{parentFail:true,rollbackFail:true}])test(`failure rollback ${JSON.stringify(options)}`,async()=>{const f=fixture(options);await assert.rejects(f.executor.execute(owner,subject,f.expected),e=>!e.message.includes('PRIVATE')&&/review current state/.test(e.message));assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.deepEqual(f.released,[!!options.rollbackFail]);});
test('review timeout blocks deletion',async()=>{const f=fixture({hang:true,config:{reviewTimeoutMs:5}});await assert.rejects(f.executor.execute(owner,subject,f.expected),/preservation/);assert.ok(!f.calls.some(x=>x.sql.startsWith('DELETE')));});
test('connection errors are sanitized',async()=>{const f=fixture({connectFail:true});await assert.rejects(f.executor.execute(owner,subject,f.expected),e=>!e.message.includes('PRIVATE'));});
