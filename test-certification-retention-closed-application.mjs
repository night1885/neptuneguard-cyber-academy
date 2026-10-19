import test from 'node:test';
import assert from 'node:assert/strict';
import {createClosedApplicationRetentionExecutor} from './certification-retention-closed-application.js';
const owner='1223123544301633567',subject='1223123544301633568';
const stamp=new Date('2026-10-22T04:00:00.000Z');
const config={ownerId:owner,executorRole:'retention_fixture',expectedDatabase:'certification_test',schema:'fixture',enabled:true};
function fixture(options={}){
  const calls=[],releases=[];let connects=0,reviews=0;
  const row={discord_user_id:subject,status:'denied',student_id:null,approved_by:null,approved_at:null,
    application_closed_at:new Date('2026-10-16T16:00:00.123Z'),application_closed_by:owner,
    application_closed_as:'withdrawn',exact_closure:true,...options.row};
  const pool={async connect(){connects++;return {async query(sql,params){
    calls.push({sql,params});
    if(sql==='ROLLBACK'&&options.rollbackFailure)throw new Error('PRIVATE rollback');
    if(sql==='COMMIT'&&options.commitFailure)throw new Error('PRIVATE commit');
    if(/^(BEGIN|SET|LOCK|COMMIT|ROLLBACK)/.test(sql))return {rows:[]};
    if(sql.includes('AS session_role'))return {rows:[{database:'certification_test',role:'retention_fixture',session_role:'retention_fixture',origin:true,restricted:!options.elevated}]};
    if(sql.includes('c.relrowsecurity'))return {rows:['certification_enrollments','certification_course_enrollments','certification_lab_requests','certification_audit_events'].map(relname=>({relname,relkind:'r',relrowsecurity:false,relforcerowsecurity:false,owner_member:false}))};
    if(sql.includes('AS schema_access'))return {rows:[Object.fromEntries(['schema_access','can_delete','can_lock','parent_limits','update_scope','parent_read','child_read','child_limits'].map(k=>[k,k!==options.denied]))]};
    if(sql.includes('FROM pg_catalog.pg_constraint')){
      const rows=['certification_course_enrollments','certification_lab_requests'].map(child_table=>({child_schema:'fixture',child_table,convalidated:true,condeferrable:false,confdeltype:child_table==='certification_course_enrollments'?'r':'a',child_columns:['discord_user_id'],parent_columns:['discord_user_id']}));
      if(options.unknownDependency)rows.push({...rows[0],child_table:'unreviewed_child'});
      if(options.cascade)rows[0].confdeltype='c';return {rows};
    }
    if(sql.includes('AS no_delete_triggers'))return {rows:[{no_delete_triggers:!options.deleteTrigger,no_rules:!options.rule}]};
    if(sql.includes('FOR UPDATE'))return {rows:options.missing?[]:[row]};
    if(sql.includes('AS courses_exist'))return {rows:[{courses_exist:!!options.courses,labs_exist:!!options.labs}]};
    if(sql.startsWith('DELETE FROM')){if(options.deleteFailure)throw new Error('PRIVATE deletion');return {rowCount:1,rows:[{discord_user_id:subject}]};}
    assert.fail('Unexpected SQL');
  },release(discard){releases.push(discard);}};}};
  const reviewPreservation=async context=>{reviews++;if(options.hang)return new Promise(()=>{});return {decision:'allow',...context,reference:'review_fixture',reviewedAt:new Date(stamp.getTime()-1000),expiresAt:new Date(stamp.getTime()+1000),...options.decision};};
  const executor=createClosedApplicationRetentionExecutor(pool,{...config,...options.config},{reviewPreservation,now:()=>new Date(options.time??stamp)});
  return {executor,calls,releases,get connects(){return connects;},get reviews(){return reviews;}};
}
test('disabled and unauthorized executions fail before connection',async()=>{
  for(const options of [{config:{enabled:false}},{config:{enabled:undefined}}]){const f=fixture(options);await assert.rejects(f.executor.execute(owner,subject));assert.equal(f.connects,0);}
  const f=fixture();await assert.rejects(f.executor.execute(subject,subject));await assert.rejects(f.executor.execute(owner,'invalid'));assert.equal(f.connects,0);
});
test('requires explicit configuration and a preservation provider',()=>{
  assert.throws(()=>createClosedApplicationRetentionExecutor({},config),/review provider/);
});
test('eligible application deletes one locked parent after fresh review and preserves audit category',async()=>{
  const f=fixture();assert.deepEqual(await f.executor.execute(owner,subject),{outcome:'deleted',deleted:1,preservationReference:'review_fixture'});
  assert.equal(f.reviews,1);assert.equal(f.calls.filter(x=>x.sql.startsWith('DELETE')).length,1);
  assert.match(f.calls.find(x=>x.sql.startsWith('DELETE')).sql,/"certification_enrollments"/);
  assert.equal(f.calls.at(-1).sql,'COMMIT');assert.deepEqual(f.releases,[false]);
  assert.ok(f.calls.findIndex(x=>x.sql.includes('FOR UPDATE'))<f.calls.findIndex(x=>x.sql.startsWith('DELETE')));
});
test('missing record is not reported as deleted and does not request preservation review',async()=>{
  const f=fixture({missing:true});assert.deepEqual(await f.executor.execute(owner,subject),{outcome:'not_found',deleted:0});assert.equal(f.reviews,0);
});
for(const [label,options] of Object.entries({elevated:{elevated:true},permission:{denied:'can_delete'},unknown_dependency:{unknownDependency:true},cascade:{cascade:true},delete_trigger:{deleteTrigger:true},rule:{rule:true},issued_id:{row:{student_id:'NG-fixture'}},prior_approval:{row:{approved_by:owner}},imprecise:{row:{exact_closure:false}},active_course:{courses:true},lab:{labs:true},not_due:{time:'2026-10-22T03:59:59.999Z'},preservation_hold:{decision:{decision:'hold'}},wrong_review_subject:{decision:{subjectId:owner}},expired_review:{decision:{expiresAt:stamp}},future_review:{decision:{reviewedAt:new Date(stamp.getTime()+1000)}},long_review:{decision:{expiresAt:new Date(stamp.getTime()+600000)}})){
  test(`blocks deletion: ${label}`,async()=>{const f=fixture(options);await assert.rejects(f.executor.execute(owner,subject),/review current state/);assert.ok(!f.calls.some(x=>x.sql.startsWith('DELETE')));assert.equal(f.calls.at(-1).sql,'ROLLBACK');});
}
for(const options of [{deleteFailure:true},{commitFailure:true},{deleteFailure:true,rollbackFailure:true}]){
  test(`failure handling ${JSON.stringify(options)}`,async()=>{const f=fixture(options);await assert.rejects(f.executor.execute(owner,subject),e=>!e.message.includes('PRIVATE')&&/review current state/.test(e.message));assert.deepEqual(f.releases,[!!options.rollbackFailure]);});
}

test('bounded preservation provider times out without deletion',async()=>{const f=fixture({hang:true,config:{reviewTimeoutMs:5}});await assert.rejects(f.executor.execute(owner,subject),/preservation/);assert.ok(!f.calls.some(x=>x.sql.startsWith('DELETE')));assert.equal(f.calls.at(-1).sql,'ROLLBACK');});
