import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createStagingReviewerReader as create} from './staging-reviewer-reader.candidate.mjs';
const enabled=process.env.FICTIONAL_STAGE_REVIEW_ADAPTER_SQL_TESTS==='true';
test('reviewer adapter with actual restricted-worker PostgreSQL',{skip:!enabled,timeout:60000},async t=>{
 assert.equal(process.env.PGDATABASE,'fi_stage_test');assert.equal(process.env.PGUSER,'postgres');assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
 const {Client,Pool}=await import('pg');
 const admin=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await admin.connect();
 let workers;
 try{
  const identity=(await admin.query('SELECT current_database() AS db,current_user AS actor')).rows[0];assert.equal(identity.db,'fi_stage_test');assert.equal(identity.actor,'postgres');
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
  const app='reviewer-adapter-'+randomUUID();
  workers=new Pool({host:'127.0.0.1',port:5432,database:'fi_stage_test',user:'fi_stage_worker',password:'fixture-only-worker-password',application_name:app,max:1,connectionTimeoutMillis:3000,statement_timeout:5000});
  async function fixture(work){
   const record=randomUUID(),report=randomUUID(),codes=[],pending=[];
   const G='100000000000000001',L='100000000000000002',R='100000000000000003';
   let reader;
   try{
    await admin.query('BEGIN');
    await admin.query(`INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until,revision,journal,journal_expires)
    VALUES($1,$2,$3,$4,'demo-course','demo-exercise',statement_timestamp()+interval '1 hour',1,'{"state":"available","channelId":"100000000000000004"}',statement_timestamp()+interval '24 hours')`,[record,G,L,R]);
    await admin.query(`INSERT INTO fi_stage.reports(id,record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
    SELECT $1,$2,$3,1,'FICTIONAL_ADAPTER_BODY',encode(sha256(convert_to('FICTIONAL_ADAPTER_BODY','UTF8')),'hex'),'100000000000000004','100000000000000005',floor(extract(epoch FROM at)*1000)::bigint,at,at+interval '24 hours'
    FROM(SELECT date_trunc('milliseconds',statement_timestamp())-interval '1 minute' AS at) fixture`,[report,record,randomUUID()]);
    await admin.query('COMMIT');
    const pool={async connect(){const c=await workers.connect();return {async query(sql,values){try{return await c.query(sql,values);}catch(e){if(sql.startsWith('SELECT fi_stage.reviewer_read'))codes.push(e.code);throw e;}},release:discard=>c.release(discard)};}};
    reader=create({enabled:true,guildId:G,recordId:record,learnerId:L,reviewerId:R,courseKey:'demo-course',exerciseKey:'demo-exercise',database:'fi_stage_test',productionDatabase:'excluded_production_database',expectedRole:'fi_stage_worker'},{getResources:()=>({pool}),isReady:()=>true,now:Date.now});
    const f={record,report,codes,ctx:{actorId:R,guildId:G},reader,start(){const p=reader.readReport(this.ctx,report);void p.catch(()=>{});pending.push(p);return p;}};
    await work(f);
   }finally{
    await admin.query('ROLLBACK');await Promise.allSettled(pending);reader?.dispose();
    await admin.query('DELETE FROM fi_stage.reports WHERE record_id=$1',[record]);await admin.query('DELETE FROM fi_stage.records WHERE id=$1',[record]);
   }
  }
  const deny=p=>assert.rejects(p,e=>e.message==='Staging reviewer read unavailable');
  async function until(check){for(let n=0;n<150;n++){if(await check())return;await new Promise(r=>setTimeout(r,20));}throw Error('Required server-side condition not observed');}
  // Observe through a separate admin connection while the holder owns the lock.
  const observer=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await observer.connect();
  try{
   async function observeWait(deadline){await until(async()=>{const row=(await observer.query("SELECT wait_event_type,query_start<$2::timestamptz AS before_start,clock_timestamp()<$2::timestamptz AS before_now FROM pg_stat_activity WHERE application_name=$1 AND query LIKE 'SELECT fi_stage.reviewer_read%'",[app,deadline])).rows[0];if(row?.wait_event_type!=='Lock')return false;assert.equal(row.before_start,true);assert.equal(row.before_now,true);return true;});}
   await t.test('authorized read through actual worker login',()=>fixture(async f=>{const r=await f.start();assert.equal(r.body,'FICTIONAL_ADAPTER_BODY');assert.equal(r.reportId,f.report);assert.equal(r.expiresAtMs-r.submittedAtMs,86400000);}));
   await t.test('learner identity rejected locally',()=>fixture(async f=>{f.ctx.actorId='100000000000000002';await deny(f.start());assert.equal(f.codes.length,0);}));
   for(const [label,sql]of [
    ['revoked grant','UPDATE fi_stage.records SET active=false WHERE id=$1'],
    ['expired grant',"UPDATE fi_stage.records SET valid_until=statement_timestamp()-interval '1 second' WHERE id=$1"],
    ['expired report',"UPDATE fi_stage.reports SET submitted_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour' WHERE record_id=$1"],
    ['redacted report','UPDATE fi_stage.reports SET body=NULL,digest=NULL WHERE record_id=$1'],
    ['changed reviewer',"UPDATE fi_stage.records SET reviewer_id='100000000000000099' WHERE id=$1"]
   ])await t.test(label,()=>fixture(async f=>{await admin.query(sql,[f.record]);await deny(f.start());assert.equal(f.codes.at(-1),'42501');}));
   await t.test('concurrent revocation observed after record lock',()=>fixture(async f=>{
    await admin.query('BEGIN');await admin.query('UPDATE fi_stage.records SET active=false WHERE id=$1',[f.record]);
    const deadline=(await admin.query("SELECT clock_timestamp()+interval '1 hour' AS at")).rows[0].at;
    const work=f.start();await observeWait(deadline);await admin.query('COMMIT');await deny(work);assert.equal(f.codes.at(-1),'42501');
   }));
   for(const kind of ['grant','report'])await t.test(`${kind} expiry after a proven lock wait`,()=>fixture(async f=>{
    await admin.query('BEGIN');
    const sql=kind==='grant'?"UPDATE fi_stage.records SET valid_until=date_trunc('milliseconds',statement_timestamp()+interval '1 second') WHERE id=$1 RETURNING valid_until AS at":"UPDATE fi_stage.reports SET submitted_at=date_trunc('milliseconds',statement_timestamp()+interval '1 second')-interval '24 hours',expires_at=date_trunc('milliseconds',statement_timestamp()+interval '1 second') WHERE record_id=$1 RETURNING expires_at AS at";
    const deadline=(await admin.query(sql,[f.record])).rows[0].at;
    const work=f.start();await observeWait(deadline);
    await until(async()=>(await observer.query('SELECT clock_timestamp()>=$1::timestamptz AS expired',[deadline])).rows[0].expired===true);
    await admin.query('COMMIT');await deny(work);assert.equal(f.codes.at(-1),'42501');
   }));
  }finally{await observer.end();}
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
 }finally{try{if(workers)await workers.end();}finally{await admin.end();}}
});
