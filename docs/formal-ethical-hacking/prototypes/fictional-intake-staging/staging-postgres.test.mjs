import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
const enabled=process.env.FICTIONAL_STAGE_SQL_TESTS==='true';
test('actual disposable PostgreSQL staging contract',{skip:!enabled},async()=>{
 if(process.env.FICTIONAL_STAGE_TEST_DB!=='fi_stage_test')throw Error('Explicit disposable test database required');
 const {Pool}=await import('pg');const pool=new Pool({host:'127.0.0.1',port:5432,user:'postgres',password:'fixture-only-admin-password',database:'fi_stage_test',connectionTimeoutMillis:3000});const client=await pool.connect();
 const G='100000000000000001',A='100000000000000004',O='100000000000000099',C='100000000000000005',M='100000000000000006',R=randomUUID(),op=randomUUID(),q=randomUUID(),body='Disposable fictional SQL report.',created=Date.now()-1000;
 const digest=createHash('sha256').update(body).digest('hex');
 const call=async(operation,p={},actor=A)=>(await client.query('SELECT fi_stage.dispatch($1,$2,$3::uuid,$4,$5,$6,$7::jsonb) AS r',[actor,G,R,'demo-course','demo-exercise',operation,JSON.stringify(p)])).rows[0].r;
 async function denied(work){await client.query('SAVEPOINT expected_failure');try{await assert.rejects(work);}finally{await client.query('ROLLBACK TO SAVEPOINT expected_failure');await client.query('RELEASE SAVEPOINT expected_failure');}}
 try{
  const meta=(await client.query('SELECT current_database() AS db,current_user AS role,fi_stage.contract() AS contract')).rows[0];assert.equal(meta.db,'fi_stage_test');assert.equal(meta.role,'postgres');assert.equal(meta.contract,1);
  await client.query('BEGIN');await client.query("INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until) VALUES($1,$2,$3,$4,'demo-course','demo-exercise',clock_timestamp()+interval '2 days')",[R,G,A,O]);await client.query('SET LOCAL ROLE fi_stage_worker');
  assert.equal((await call('resolve')).revision,0);assert.equal((await call('journalRead')).journal,null);
  await denied(()=>call('resolve',{},O));await denied(()=>client.query('SELECT * FROM fi_stage.records'));
  await call('journalWrite',{state:'creating',operationId:op});await denied(()=>call('journalWrite',{state:'available',operationId:randomUUID(),channelId:C}));
  await call('journalWrite',{state:'verify-pending',operationId:op,channelId:C});await call('journalWrite',{state:'available',operationId:op,channelId:C});
  const p={requestId:q,expectedRevision:0,body,digest,channelId:C,messageId:M,createdAtMs:created};const ack=await call('submit',p);assert.equal(ack.ok,true);assert.equal(ack.expiresAtMs-ack.submittedAtMs,86400000);
  assert.deepEqual(await call('submit',p),ack);assert.deepEqual(await call('receipt',{requestId:q}),ack);assert.equal((await call('discover',{limit:5})).items.length,1);
  await denied(()=>call('submit',{...p,requestId:randomUUID(),expectedRevision:1}));await denied(()=>call('submit',{...p,requestId:randomUUID(),body:'changed',expectedRevision:1}));
  await client.query('RESET ROLE');await client.query("UPDATE fi_stage.reports SET submitted_at='2000-01-01T00:00:00Z',expires_at='2000-01-02T00:00:00Z' WHERE record_id=$1",[R]);await client.query("UPDATE fi_stage.records SET journal_expires='2000-01-02T00:00:00Z' WHERE id=$1",[R]);await client.query('SET LOCAL ROLE fi_stage_worker');
  await denied(()=>call('receipt',{requestId:q}));const due=(await call('due',{},O)).items;assert.equal(due.length,1);assert.equal(due[0].kind,'report');
  await client.query('RESET ROLE');const erased=(await client.query('SELECT body,digest FROM fi_stage.reports WHERE record_id=$1',[R])).rows[0];assert.equal(erased.body,null);assert.equal(erased.digest,null);await client.query('SET LOCAL ROLE fi_stage_worker');
  await denied(()=>call('erase',{...due[0],confirmed:false},O));await call('erase',{...due[0],confirmed:true},O);assert.equal((await call('due',{},O)).items.length,0);
  await client.query('RESET ROLE');assert.equal((await client.query('SELECT count(*)::int AS n FROM fi_stage.records WHERE id=$1',[R])).rows[0].n,1);
 }finally{try{await client.query('ROLLBACK');}finally{client.release();await pool.end();}}
});

test('lock wait cannot preserve a pre-expiry authority timestamp',{skip:!enabled},async()=>{
 if(process.env.FICTIONAL_STAGE_TEST_DB!=='fi_stage_test')throw Error('Explicit disposable test database required');
 const {Pool}=await import('pg');const pool=new Pool({host:'127.0.0.1',port:5432,user:'postgres',password:'fixture-only-admin-password',database:'fi_stage_test',connectionTimeoutMillis:3000,query_timeout:5000});
 const holder=await pool.connect(),racer=await pool.connect(),observer=await pool.connect(),rid=randomUUID();let work,rejection;
 async function until(check){for(let n=0;n<200;n++){if(await check())return;await new Promise(r=>setTimeout(r,20));}throw Error('Expected server-side condition not observed');}
 try{
  assert.equal((await holder.query('SELECT current_database() AS db')).rows[0].db,'fi_stage_test');
  await holder.query("INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until) VALUES($1,'100000000000000001','100000000000000004','100000000000000099','demo-course','demo-exercise',clock_timestamp()+interval '1 hour')",[rid]);
  const pid=(await racer.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await racer.query('SET ROLE fi_stage_worker');
  await holder.query('BEGIN');const deadline=(await holder.query("UPDATE fi_stage.records SET valid_until=clock_timestamp()+interval '2 seconds' WHERE id=$1 RETURNING valid_until",[rid])).rows[0].valid_until;
  work=racer.query("SELECT fi_stage.dispatch('100000000000000004','100000000000000001',$1::uuid,'demo-course','demo-exercise','resolve','{}'::jsonb)",[rid]);rejection=assert.rejects(work,e=>e.code==='P0001');void rejection.catch(()=>{});
  await until(async()=>{const r=(await observer.query('SELECT wait_event_type,query_start<$2::timestamptz AS started_before,clock_timestamp()<$2::timestamptz AS still_before FROM pg_stat_activity WHERE pid=$1',[pid,deadline])).rows[0];if(r?.wait_event_type!=='Lock')return false;assert.equal(r.started_before,true);assert.equal(r.still_before,true);return true;});
  await until(async()=>(await observer.query('SELECT clock_timestamp()>=$1::timestamptz AS expired',[deadline])).rows[0].expired===true);
  await holder.query('COMMIT');await rejection;
 }finally{
  try{await holder.query('ROLLBACK');if(work)await work.catch(()=>{});await holder.query('DELETE FROM fi_stage.records WHERE id=$1',[rid]);}
  finally{holder.release();racer.release();observer.release();await pool.end();}
 }
});
