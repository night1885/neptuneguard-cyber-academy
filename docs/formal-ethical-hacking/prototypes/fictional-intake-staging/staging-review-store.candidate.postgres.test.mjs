import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createStagingReviewStore as create} from './staging-review-store.candidate.mjs';
const enabled=process.env.FICTIONAL_STAGE_REVIEW_STORE_SQL_TESTS==='true';
test('actual review application store, replay and commit acknowledgements',{skip:!enabled,timeout:60000},async t=>{
 assert.equal(process.env.PGDATABASE,'fi_stage_test');assert.equal(process.env.PGUSER,'postgres');assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
 const {Client,Pool}=await import('pg');const admin=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await admin.connect();let workers;
 const G='100000000000000001',L='100000000000000002',R='100000000000000003';
 try{
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
  workers=new Pool({host:'127.0.0.1',port:5432,database:'fi_stage_test',user:'fi_stage_worker',password:'fixture-only-worker-password',max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  async function fixture(work){
   const record=randomUUID(),report=randomUUID(),pending=[],stores=[];
   try{
    await admin.query('BEGIN');
    await admin.query(`INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until,revision,journal,journal_expires)
    VALUES($1,$2,$3,$4,'demo-course','demo-exercise',statement_timestamp()+interval '1 hour',1,'{"state":"available","channelId":"100000000000000004"}',statement_timestamp()+interval '24 hours')`,[record,G,L,R]);
    await admin.query(`INSERT INTO fi_stage.reports(id,record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
    SELECT $1,$2,$3,1,'FICTIONAL_STORE_BODY',encode(sha256(convert_to('FICTIONAL_STORE_BODY','UTF8')),'hex'),'100000000000000004','100000000000000005',floor(extract(epoch FROM at)*1000)::bigint,at,at+interval '24 hours'
    FROM(SELECT date_trunc('milliseconds',statement_timestamp())-interval '1 minute' AS at) fixture`,[report,record,randomUUID()]);await admin.query('COMMIT');
    const config={enabled:true,guildId:G,recordId:record,learnerId:L,reviewerId:R,courseKey:'demo-course',exerciseKey:'demo-exercise',database:'fi_stage_test',productionDatabase:'excluded_production_database',expectedRole:'fi_stage_worker'};
    function make(pool=workers,patch={}){const s=create({...config,...patch},{getResources:()=>({pool}),isReady:()=>true,now:Date.now});stores.push(s);return s;}
    const store=make(),cmd={reportId:report,requestId:randomUUID(),expectedReviewRevision:0,decision:'changes-requested',feedback:'FICTIONAL_STORE_FEEDBACK'};
    const track=p=>{void p.catch(()=>{});pending.push(p);return p;};
    const f={record,report,store,cmd,make,reviewer:{actorId:R,guildId:G},learner:{actorId:L,guildId:G},
     write(c=cmd,s=store,ctx=this.reviewer){return track(s.recordReview(ctx,c));},
     status(s=store,ctx=this.learner){return track(s.getStatus(ctx,report));},
     async count(){return (await admin.query('SELECT count(*)::int AS n FROM fi_stage.review_requests WHERE report_id=$1',[report])).rows[0].n;}
    };await work(f);
   }finally{await admin.query('ROLLBACK');await Promise.allSettled(pending);for(const s of stores)s.dispose();await admin.query('DELETE FROM fi_stage.reports WHERE record_id=$1',[record]);await admin.query('DELETE FROM fi_stage.records WHERE id=$1',[record]);}
  }
  const scenario=(name,work)=>t.test(name,()=>fixture(work));
  const rejected=(r,why)=>{assert.equal(r.ok,false);assert.equal(r.reason,why);};
  await scenario('initial metadata status through actual worker',async f=>{const r=await f.status();assert.equal(r.ok,true);assert.equal(r.status,'submitted');assert.equal(r.reviewRevision,0);assert.equal(r.body,undefined);});
  await scenario('application decision and learner status agree',async f=>{const before=await f.status(),r=await f.write(),after=await f.status();assert.equal(r.ok,true);assert.equal(r.requestId,f.cmd.requestId);assert.equal(after.status,'changes-requested');assert.equal(after.reviewRevision,1);assert.equal(after.expiresAtMs,before.expiresAtMs);assert.equal(after.feedback,undefined);});
  await scenario('review-recorded is a decision, not approval',async f=>{const r=await f.write({...f.cmd,decision:'review-recorded'});assert.equal(r.ok,true);assert.equal((await f.status()).status,'review-recorded');});
  await scenario('replay after later decision returns original metadata',async f=>{const first=await f.write();assert.equal(first.ok,true);assert.equal((await f.write({...f.cmd,requestId:randomUUID(),expectedReviewRevision:1,decision:'review-recorded'})).ok,true);assert.deepEqual(await f.write(),first);assert.equal(await f.count(),2);});
  await scenario('stale decision becomes typed conflict',async f=>{assert.equal((await f.write()).ok,true);rejected(await f.write({...f.cmd,requestId:randomUUID()}),'conflict');assert.equal(await f.count(),1);});
  await scenario('changed-payload replay becomes typed conflict',async f=>{assert.equal((await f.write()).ok,true);rejected(await f.write({...f.cmd,feedback:'OTHER_FICTIONAL_FEEDBACK'}),'conflict');assert.equal(await f.count(),1);});
  await scenario('actor crossover rejected by application',async f=>{rejected(await f.write(f.cmd,f.store,f.learner),'unavailable');rejected(await f.status(f.store,f.reviewer),'unavailable');assert.equal(await f.count(),0);});
  for(const [name,sql]of [['expired authority',"UPDATE fi_stage.records SET valid_until=statement_timestamp()-interval '1 second' WHERE id=$1"],['expired report',"UPDATE fi_stage.reports SET submitted_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour' WHERE record_id=$1"],['redacted report','UPDATE fi_stage.reports SET body=NULL,digest=NULL WHERE record_id=$1']])await scenario(name,async f=>{await admin.query(sql,[f.record]);rejected(await f.write(),'unavailable');rejected(await f.status(),'unavailable');});
  await scenario('wrong configured worker role is rejected',async f=>{const bad=f.make(workers,{expectedRole:'postgres'});rejected(await f.write(f.cmd,bad),'unavailable');assert.equal(await f.count(),0);});
  await scenario('lost acknowledgement after actual COMMIT is unknown; exact replay recovers once',async f=>{
   let calls=0;
   const pool={async connect(){const c=await workers.connect();return {async query(sql,values){if(sql.startsWith('SELECT fi_stage.record_review'))calls++;const r=await c.query(sql,values);if(sql==='COMMIT')throw Error('INJECTED_LOST_COMMIT_ACK');return r;},release:x=>c.release(x)};}};
   const faulty=f.make(pool),r=await f.write(f.cmd,faulty);rejected(r,'outcome-unknown');assert.equal(r.requestId,f.cmd.requestId);assert.equal(calls,1);assert.equal(await f.count(),1);
   const recovered=await f.write();assert.equal(recovered.ok,true);assert.equal(recovered.reviewRevision,1);assert.equal(await f.count(),1);
  });
  await scenario('disposal after actual COMMIT suppresses acknowledgement without a second write',async f=>{
   let faulty;
   const pool={async connect(){const c=await workers.connect();return {async query(sql,values){const r=await c.query(sql,values);if(sql==='COMMIT')faulty.dispose();return r;},release:x=>c.release(x)};}};
   faulty=f.make(pool);rejected(await f.write(f.cmd,faulty),'acknowledgement-unavailable');assert.equal(await f.count(),1);assert.equal((await f.status()).reviewRevision,1);
  });
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
 }finally{try{if(workers)await workers.end();}finally{await admin.end();}}
});
