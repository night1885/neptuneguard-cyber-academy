import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const enabled=process.env.FICTIONAL_STAGE_REVIEW_DECISION_SQL_TESTS==='true';
test('review decisions, learner status, concurrency and retention',{skip:!enabled,timeout:60000},async t=>{
 assert.equal(process.env.PGDATABASE,'fi_stage_test');assert.equal(process.env.PGUSER,'postgres');assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
 const {Client,Pool}=await import('pg');const admin=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await admin.connect();let worker,observer;
 const G='100000000000000001',L='100000000000000002',R='100000000000000003';
 try{
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
  const app='review-decision-'+randomUUID();
  worker=new Pool({application_name:app,host:'127.0.0.1',port:5432,database:'fi_stage_test',user:'fi_stage_worker',password:'fixture-only-worker-password',max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  assert.equal((await worker.query('SELECT current_user AS actor')).rows[0].actor,'fi_stage_worker');
  observer=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await observer.connect();
  async function until(check){for(let n=0;n<150;n++){if(await check())return;await new Promise(r=>setTimeout(r,20));}throw Error('Expected server lock/deadline not observed');}
  async function blocked(deadline){await until(async()=>{const r=(await observer.query("SELECT query_start<$2::timestamptz AS before_start,clock_timestamp()<$2::timestamptz AS before_now FROM pg_stat_activity WHERE application_name=$1 AND state='active' AND wait_event_type='Lock' AND query LIKE 'SELECT fi_stage.record_review%'",[app,deadline])).rows[0];if(!r)return false;assert.equal(r.before_start,true);assert.equal(r.before_now,true);return true;});}
  const deny=(p,code='42501')=>assert.rejects(p,e=>e.code===code);
  async function fixture(work){
   const record=randomUUID(),report=randomUUID(),pending=[];
   const track=p=>{void p.catch(()=>{});pending.push(p);return p;};
   try{
    await admin.query('BEGIN');
    await admin.query(`INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until,revision,journal,journal_expires)
    VALUES($1,$2,$3,$4,'demo-course','demo-exercise',statement_timestamp()+interval '1 hour',1,'{"state":"available","channelId":"100000000000000004"}',statement_timestamp()+interval '24 hours')`,[record,G,L,R]);
    await admin.query(`INSERT INTO fi_stage.reports(id,record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
    SELECT $1,$2,$3,1,'FICTIONAL_DECISION_BODY',encode(sha256(convert_to('FICTIONAL_DECISION_BODY','UTF8')),'hex'),'100000000000000004','100000000000000005',floor(extract(epoch FROM at)*1000)::bigint,at,at+interval '24 hours'
    FROM(SELECT date_trunc('milliseconds',statement_timestamp())-interval '1 minute' AS at) fixture`,[report,record,randomUUID()]);
    await admin.query('COMMIT');
    const f={record,report,
     write(o={}){return track(worker.query('SELECT fi_stage.record_review($1,$2,$3::uuid,$4,$5,$6::uuid,$7::uuid,$8::integer,$9,$10) AS r',[o.actor??R,o.guild??G,o.record??record,'demo-course','demo-exercise',o.report??report,o.request??randomUUID(),o.expected??0,o.decision??'changes-requested',o.feedback??'FICTIONAL_FEEDBACK']).then(x=>x.rows[0].r));},
     status(o={}){return track(worker.query('SELECT fi_stage.learner_status($1,$2,$3::uuid,$4,$5,$6::uuid) AS r',[o.actor??L,o.guild??G,o.record??record,'demo-course','demo-exercise',o.report??report]).then(x=>x.rows[0].r));},
     async counts(){return (await admin.query('SELECT (SELECT count(*)::int FROM fi_stage.review_state WHERE report_id=$1) AS state,(SELECT count(*)::int FROM fi_stage.review_requests WHERE report_id=$1) AS requests',[report])).rows[0];}
    };await work(f);
   }finally{
    await admin.query('ROLLBACK');await Promise.allSettled(pending);
    await admin.query('DELETE FROM fi_stage.reports WHERE record_id=$1',[record]);await admin.query('DELETE FROM fi_stage.records WHERE id=$1',[record]);
   }
  }
  const scenario=(name,work)=>t.test(name,()=>fixture(work));
  await scenario('worker has no direct review-table access',async()=>{await deny(worker.query('SELECT * FROM fi_stage.review_state'));await deny(worker.query('SELECT * FROM fi_stage.review_requests'));});
  await scenario('initial learner status contains metadata only',async f=>{const r=await f.status();assert.equal(r.status,'submitted');assert.equal(r.reviewRevision,0);assert.equal(r.body,undefined);assert.equal(r.feedback,undefined);});
  await scenario('decision persists with separate revision and original expiry',async f=>{const before=await f.status(),r=await f.write(),after=await f.status();assert.equal(r.reviewRevision,1);assert.equal(after.submissionRevision,1);assert.equal(after.status,'changes-requested');assert.equal(r.expiresAtMs,before.expiresAtMs);assert.equal(after.expiresAtMs,before.expiresAtMs);assert.equal((await admin.query('SELECT revision FROM fi_stage.records WHERE id=$1',[f.record])).rows[0].revision,1);assert.deepEqual(await f.counts(),{state:1,requests:1});});
  await scenario('identical replay returns original acknowledgement after a later decision',async f=>{const request=randomUUID();const first=await f.write({request});await f.write({expected:1,decision:'review-recorded'});assert.deepEqual(await f.write({request}),first);assert.equal((await f.status()).reviewRevision,2);});
  await scenario('changed feedback replay conflicts',async f=>{const request=randomUUID();await f.write({request});await deny(f.write({request,feedback:'DIFFERENT_FICTIONAL_FEEDBACK'}),'40001');});
  await scenario('stale revision conflicts without mutation',async f=>{await f.write();await deny(f.write(),'40001');assert.deepEqual(await f.counts(),{state:1,requests:1});});
  for(const [name,options]of [['learner cannot review',{actor:L}],['outsider cannot review',{actor:'100000000000000099'}],['wrong guild',{guild:'100000000000000099'}],['wrong report',{report:randomUUID()}],['unsupported decision',{decision:'approved'}],['blank feedback',{feedback:'   '}],['whitespace-only feedback',{feedback:'\t\n'}],['oversize feedback',{feedback:'x'.repeat(2001)}]])await scenario(name,async f=>{await deny(f.write(options));assert.deepEqual(await f.counts(),{state:0,requests:0});});
  for(const [name,sql]of [['revoked authority','UPDATE fi_stage.records SET active=false WHERE id=$1'],['expired authority',"UPDATE fi_stage.records SET valid_until=statement_timestamp()-interval '1 second' WHERE id=$1"],['expired report',"UPDATE fi_stage.reports SET submitted_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour' WHERE record_id=$1"]])await scenario(name,async f=>{await admin.query(sql,[f.record]);await deny(f.write());await deny(f.status());});
  await scenario('reviewer cannot use learner-only status',async f=>{await deny(f.status({actor:R}));});
  await scenario('learner status does not copy feedback',async f=>{await f.write();const r=await f.status();assert.equal(r.feedback,undefined);assert.ok(!JSON.stringify(r).includes('FICTIONAL_FEEDBACK'));assert.ok(!JSON.stringify(r).includes('FICTIONAL_DECISION_BODY'));});
  await scenario('concurrent writers yield one result and one revision conflict',async f=>{const results=await Promise.allSettled([f.write(),f.write()]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const errors=results.filter(x=>x.status==='rejected');assert.equal(errors.length,1);assert.equal(errors[0].reason.code,'40001');assert.equal((await f.status()).reviewRevision,1);assert.deepEqual(await f.counts(),{state:1,requests:1});});
  await scenario('concurrent revocation blocks a pending review write',async f=>{
   await admin.query('BEGIN');await admin.query('UPDATE fi_stage.records SET active=false WHERE id=$1',[f.record]);
   const deadline=(await admin.query("SELECT clock_timestamp()+interval '1 hour' AS at")).rows[0].at;
   const work=f.write();await blocked(deadline);await admin.query('COMMIT');await deny(work);assert.deepEqual(await f.counts(),{state:0,requests:0});
  });
  for(const kind of ['grant','report'])await scenario(`${kind} expiry during a proven review-write lock wait`,async f=>{
   await admin.query('BEGIN');
   const sql=kind==='grant'?"UPDATE fi_stage.records SET valid_until=date_trunc('milliseconds',statement_timestamp()+interval '1 second') WHERE id=$1 RETURNING valid_until AS at":"UPDATE fi_stage.reports SET submitted_at=date_trunc('milliseconds',statement_timestamp()+interval '1 second')-interval '24 hours',expires_at=date_trunc('milliseconds',statement_timestamp()+interval '1 second') WHERE record_id=$1 RETURNING expires_at AS at";
   const deadline=(await admin.query(sql,[f.record])).rows[0].at;
   const work=f.write();await blocked(deadline);
   await until(async()=>(await observer.query('SELECT clock_timestamp()>=$1::timestamptz AS expired',[deadline])).rows[0].expired===true);
   await admin.query('COMMIT');await deny(work);assert.deepEqual(await f.counts(),{state:0,requests:0});
  });
  await scenario('report redaction removes review payloads before external deletion',async f=>{await f.write();await admin.query("UPDATE fi_stage.reports SET submitted_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour' WHERE record_id=$1",[f.record]);await deny(f.status());const due=(await worker.query("SELECT fi_stage.dispatch($1,$2,$3::uuid,'demo-course','demo-exercise','due','{}'::jsonb) AS r",[R,G,f.record])).rows[0].r;assert.equal(due.items.length,1);assert.deepEqual(await f.counts(),{state:0,requests:0});const parent=(await admin.query('SELECT body,digest FROM fi_stage.reports WHERE id=$1',[f.report])).rows[0];assert.ok(parent);assert.equal(parent.body,null);assert.equal(parent.digest,null);});
  await scenario('parent report deletion cascades review and replay rows',async f=>{await f.write();await admin.query('DELETE FROM fi_stage.reports WHERE id=$1',[f.report]);assert.deepEqual(await f.counts(),{state:0,requests:0});});
  await scenario('changed report snapshot cannot reuse old review',async f=>{await f.write();await admin.query("UPDATE fi_stage.reports SET body='CHANGED_FICTIONAL_BODY',digest=encode(sha256(convert_to('CHANGED_FICTIONAL_BODY','UTF8')),'hex') WHERE id=$1",[f.report]);await deny(f.status());await deny(f.write({expected:1}));});
  await scenario('bounded replay history preserves original replay',async f=>{const request=randomUUID(),first=await f.write({request});for(let n=1;n<50;n++)await f.write({expected:n});await deny(f.write({expected:50}));assert.deepEqual(await f.write({request}),first);assert.deepEqual(await f.counts(),{state:1,requests:50});});
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
 }finally{try{if(observer)await observer.end();}finally{try{if(worker)await worker.end();}finally{await admin.end();}}}
});
