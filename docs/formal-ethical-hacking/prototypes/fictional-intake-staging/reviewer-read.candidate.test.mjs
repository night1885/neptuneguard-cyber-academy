import test from 'node:test';
import assert from 'node:assert/strict';
// Explicit disposable SQL gate, separate from the existing baseline SQL test gate.
const enabled=process.env.FICTIONAL_STAGE_REVIEW_SQL_TESTS==='true';
test('candidate reviewer read: real disposable PostgreSQL contract',{skip:!enabled},async t=>{
 const env=process.env;
 assert.equal(env.PGDATABASE,'fi_stage_test');assert.equal(env.PGUSER,'postgres');
 assert.ok(['127.0.0.1','localhost'].includes(env.PGHOST));
 const {Client}=await import('pg');const client=new Client();await client.connect();
 const record='11111111-1111-4111-8111-111111111111';
 const report='22222222-2222-4222-8222-222222222222';
 const other='33333333-3333-4333-8333-333333333333';
 const args=['100000000000000003','100000000000000001',record,'demo-course','demo-exercise',report];
 const query='SELECT fi_stage.reviewer_read($1,$2,$3::uuid,$4,$5,$6::uuid) AS result';
 try{
  await client.query('BEGIN');await client.query("SET LOCAL statement_timeout='10s'");await client.query("SET LOCAL lock_timeout='2s'");
  const identity=(await client.query('SELECT current_database() AS db,current_user AS actor')).rows[0];
  assert.equal(identity.db,'fi_stage_test');assert.equal(identity.actor,'postgres');
  assert.equal((await client.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
  await client.query(`INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,active,valid_until,revision,journal,journal_expires)
  VALUES($1,$2,$3,$4,'demo-course','demo-exercise',true,statement_timestamp()+interval '1 hour',1,
  '{"state":"available","channelId":"100000000000000004"}',statement_timestamp()+interval '24 hours')`,[record,args[1],'100000000000000002',args[0]]);
  await client.query(`INSERT INTO fi_stage.reports(id,record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
  SELECT $1,$2,$3,1,'FICTIONAL_TEST_BODY',encode(sha256(convert_to('FICTIONAL_TEST_BODY','UTF8')),'hex'),
  '100000000000000004','100000000000000005',floor(extract(epoch FROM at)*1000)::bigint,at,at+interval '24 hours'
  FROM(SELECT date_trunc('milliseconds',statement_timestamp())-interval '1 minute' AS at) fixture`,[report,record,other]);
  async function scenario(label,setup,values,allow=false){
   await t.test(label,async()=>{
    await client.query('SAVEPOINT scenario');
    try{
     if(setup)await client.query(setup);
     await client.query('SET LOCAL ROLE fi_stage_worker');
     if(allow){
      const result=(await client.query(query,values)).rows[0].result;
      assert.equal(result.ok,true);assert.equal(result.body,'FICTIONAL_TEST_BODY');assert.equal(result.reportId,report);
      const rights=(await client.query("SELECT has_table_privilege(current_user,'fi_stage.records','SELECT') AS records,has_table_privilege(current_user,'fi_stage.reports','SELECT') AS reports")).rows[0];
      assert.equal(rights.records,false);assert.equal(rights.reports,false);
     }else await assert.rejects(()=>client.query(query,values),e=>e.code==='42501');
    }finally{await client.query('ROLLBACK TO SAVEPOINT scenario');await client.query('RELEASE SAVEPOINT scenario');}
   });
  }
  await scenario('authorized read with no direct table SELECT',null,args,true);
  for(const [label,index,value]of [['learner',0,'100000000000000002'],['outsider',0,'100000000000000099'],['wrong guild',1,'100000000000000099'],['wrong record',2,other],['wrong course',3,'demo-other'],['wrong exercise',4,'demo-other'],['wrong report',5,other],['null actor',0,null]]){
   const values=[...args];values[index]=value;await scenario(label,null,values);
  }
  for(const [label,sql]of [
   ['revoked record','UPDATE fi_stage.records SET active=false'],
   ['expired grant',"UPDATE fi_stage.records SET valid_until=statement_timestamp()-interval '1 second'"],
   ['expired journal',"UPDATE fi_stage.records SET journal_expires=statement_timestamp()-interval '1 second'"],
   ['unavailable journal',`UPDATE fi_stage.records SET journal='{"state":"reconcile-required"}'`],
   ['wrong source channel',"UPDATE fi_stage.reports SET source_channel='100000000000000099'"],
   ['expired report',"UPDATE fi_stage.reports SET submitted_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour'"],
   ['redacted report','UPDATE fi_stage.reports SET body=NULL,digest=NULL'],
   ['digest mismatch',"UPDATE fi_stage.reports SET digest=repeat('0',64)"],
   ['future report',"UPDATE fi_stage.reports SET submitted_at=statement_timestamp()+interval '1 hour',expires_at=statement_timestamp()+interval '25 hours'"]
  ])await scenario(label,sql,args);
 }finally{try{await client.query('ROLLBACK');}finally{await client.end();}}
});
