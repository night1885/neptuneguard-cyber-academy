import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuditRetentionExecutor} from './certification-retention-audit-executor.js';
const owner='1223123544301633567',event='9007199254740993',occurred='2026-01-31T23:59:59.123456Z',boundary='2026-04-30T23:59:59.123456Z';
const stamp=new Date('2026-04-30T23:59:59.124Z');
function fixture(options={}){
  const calls=[],released=[];let connects=0,reviews=0;
  const pool={async connect(){connects++;if(options.connectFail)throw new Error('PRIVATE connect');return{async query(sql,params){
    calls.push({sql,params});if(sql==='ROLLBACK'&&options.rollbackFail)throw new Error('PRIVATE rollback');
    if(sql==='COMMIT'&&options.commitFail)throw new Error('PRIVATE commit');
    if(/^(BEGIN|SET|LOCK|COMMIT|ROLLBACK)/.test(sql))return{rows:[]};
    if(sql.includes('AS session_role'))return{rows:[{database:'certification_test',role:'audit_fixture',session_role:'audit_fixture',origin:true,restricted:!options.elevated}]};
    if(sql.includes('AS ordinary_table'))return{rows:[Object.fromEntries(['ordinary_table','non_owner','schema_access','can_delete','can_read','audit_limits','other_limits'].map(k=>[k,k!==options.denied]))]};
    if(sql.includes('AS bigint_id'))return{rows:[Object.fromEntries(['bigint_id','timestamp_column','primary_key','no_inbound_fk','no_delete_trigger','no_rules'].map(k=>[k,k!==options.shape]))]};
    if(sql.startsWith('SELECT event_id'))return{rows:options.missing?[]:[{event_id:event,occurred_at_utc:options.occurred??occurred}]};
    if(sql.startsWith('DELETE')){if(options.deleteFail)throw new Error('PRIVATE delete');return{rowCount:1,rows:[{event_id:event}]};}
    assert.fail('Unexpected query');
  },release(v){released.push(v);}};}};
  const config={ownerId:owner,executorRole:'audit_fixture',expectedDatabase:'certification_test',schema:'fixture',enabled:true,...options.config};
  const executor=createAuditRetentionExecutor(pool,config,{cutoffUtc:()=>options.cutoff??boundary,now:()=>new Date(stamp),reviewPreservation:async context=>{reviews++;return{...context,decision:'allow',reference:'fixture_review',reviewedAt:new Date(stamp.getTime()-100),expiresAt:new Date(stamp.getTime()+1000),...options.decision};}});
  return{executor,calls,released,get connects(){return connects;},get reviews(){return reviews;}};
}
test('disabled or unauthorized invocation cannot connect',async()=>{
  for(const config of [{enabled:false},{enabled:undefined}]){const f=fixture({config});await assert.rejects(f.executor.execute(owner,event));assert.equal(f.connects,0);}
  const f=fixture();await assert.rejects(f.executor.execute('other',event));assert.equal(f.connects,0);
});
for(const bad of [9007199254740992,'0','01','-1','9223372036854775808'])test(`invalid event ID ${bad}`,async()=>{const f=fixture();await assert.rejects(f.executor.execute(owner,bad));assert.equal(f.connects,0);});
test('exact large ID and microsecond month-end boundary survive deletion',async()=>{
  const f=fixture();const result=await f.executor.execute(owner,event);assert.equal(result.eventId,event);
  const deletion=f.calls.find(x=>x.sql.startsWith('DELETE'));assert.deepEqual(deletion.params,[event,occurred,boundary]);
  assert.match(deletion.sql,/INTERVAL '3 months'/);assert.ok(!f.calls.some(x=>/actor_discord_user_id|subject_discord_user_id|SELECT details/.test(x.sql)));
  assert.equal(f.calls.at(-1).sql,'COMMIT');assert.deepEqual(f.released,[false]);
});
for(const [name,options]of Object.entries({one_microsecond_early:{cutoff:'2026-04-30T23:59:59.123455Z'},bad_timestamp:{occurred:'infinity'},elevated:{elevated:true},audit_update:{denied:'audit_limits'},other_table_delete:{denied:'other_limits'},foreign_key:{shape:'no_inbound_fk'},delete_trigger:{shape:'no_delete_trigger'},rewrite:{shape:'no_rules'},preservation_hold:{decision:{decision:'hold'}},wrong_event:{decision:{eventId:'1'}},expired:{decision:{expiresAt:stamp}}}))test(`blocks ${name}`,async()=>{
  const f=fixture(options);await assert.rejects(f.executor.execute(owner,event));assert.ok(!f.calls.some(x=>x.sql.startsWith('DELETE')));assert.equal(f.calls.at(-1).sql,'ROLLBACK');
});
test('missing event requests no preservation review',async()=>{const f=fixture({missing:true});assert.equal((await f.executor.execute(owner,event)).deleted,0);assert.equal(f.reviews,0);});
for(const options of [{deleteFail:true},{commitFail:true},{deleteFail:true,rollbackFail:true}])test(`failure sanitization ${JSON.stringify(options)}`,async()=>{const f=fixture(options);await assert.rejects(f.executor.execute(owner,event),e=>!e.message.includes('PRIVATE'));assert.deepEqual(f.released,[!!options.rollbackFail]);});
test('connection error is sanitized',async()=>{const f=fixture({connectFail:true});await assert.rejects(f.executor.execute(owner,event),e=>!e.message.includes('PRIVATE'));});
