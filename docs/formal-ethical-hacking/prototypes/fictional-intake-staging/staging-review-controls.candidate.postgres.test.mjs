import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createReviewAuthorityReader,createReviewControls} from './staging-review-controls.candidate.mjs';
const enabled=process.env.FICTIONAL_STAGE_REVIEW_CONTROLS_SQL_TESTS==='true';
test('private metadata controls with actual authority and review SQL',{skip:!enabled,timeout:60000},async t=>{
 assert.equal(process.env.PGDATABASE,'fi_stage_test');assert.equal(process.env.PGUSER,'postgres');assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
 const {Client,Pool}=await import('pg');const {createStagingReviewStore}=await import('./staging-review-store.candidate.mjs');
 const admin=new Client({connectionTimeoutMillis:3000,statement_timeout:5000});await admin.connect();let workers;
 const G='100000000000000001',L='100000000000000002',R='100000000000000003',B='100000000000000004',RC='100000000000000005',LC='100000000000000006',RE='100000000000000007',LE='100000000000000008',PM='100000000000000009';
 try{
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
  workers=new Pool({host:'127.0.0.1',port:5432,database:'fi_stage_test',user:'fi_stage_worker',password:'fixture-only-worker-password',max:2,connectionTimeoutMillis:3000,statement_timeout:5000});
  async function fixture(work){
   const record=randomUUID(),report=randomUUID(),resources=[],pending=[];
   try{
    await admin.query('BEGIN');
    await admin.query(`INSERT INTO fi_stage.records(id,guild_id,learner_id,reviewer_id,course_key,exercise_key,valid_until,revision,journal,journal_expires)
    VALUES($1,$2,$3,$4,'demo-course','demo-exercise',statement_timestamp()+interval '1 hour',1,'{"state":"available","channelId":"100000000000000004"}',statement_timestamp()+interval '24 hours')`,[record,G,L,R]);
    await admin.query(`INSERT INTO fi_stage.reports(id,record_id,request_id,revision,body,digest,source_channel,source_message,source_created_ms,submitted_at,expires_at)
    SELECT $1,$2,$3,1,'FICTIONAL_CONTROL_BODY',encode(sha256(convert_to('FICTIONAL_CONTROL_BODY','UTF8')),'hex'),'100000000000000004','100000000000000005',floor(extract(epoch FROM at)*1000)::bigint,at,at+interval '24 hours'
    FROM(SELECT date_trunc('milliseconds',statement_timestamp())-interval '1 minute' AS at) fixture`,[report,record,randomUUID()]);await admin.query('COMMIT');
    const config={enabled:true,guildId:G,recordId:record,learnerId:L,reviewerId:R,courseKey:'demo-course',exerciseKey:'demo-exercise',database:'fi_stage_test',productionDatabase:'excluded_production_database',expectedRole:'fi_stage_worker',botId:B,reviewChannelId:RC,learnerChannelId:LC,reviewEntryMessageId:RE,learnerEntryMessageId:LE};
    const ctx={actorId:R,guildId:G},learner={actorId:L,guildId:G},draft={reportId:report,decision:'changes-requested',feedback:'FICTIONAL_CONTROL_FEEDBACK'};
    function makeStore(pool=workers){const s=createStagingReviewStore(config,{getResources:()=>({pool}),isReady:()=>true,now:Date.now});resources.push(s);return s;}
    const store=makeStore(),authority=createReviewAuthorityReader(config,{getResources:()=>({pool:workers}),isReady:()=>true,now:Date.now});resources.push(authority);
    function makeControls(s=store){const c=createReviewControls(config,{authority,store:s,isReady:()=>true,now:Date.now,selectDraft:async()=>draft,selectReport:async()=>report});resources.push(c);return c;}
    const controls=makeControls(),payloads=[],replies=[],privateMessage={id:PM,author:{id:B},flags:{has:n=>n===64}};
    const interaction=(customId='nrv:prepare',patch={})=>({customId,guildId:G,channelId:RC,user:{id:R},message:{id:RE,author:{id:B}},isButton:()=>true,deferred:false,replied:false,async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){replies.push(p);this.replied=true;},async editReply(p){payloads.push(p);return privateMessage;},...patch});
    const track=p=>{void p.catch(()=>{});pending.push(p);return p;};
    const f={record,report,ctx,learner,draft,store,authority,controls,makeStore,makeControls,payloads,interaction,privateMessage,track,async count(){return (await admin.query('SELECT count(*)::int AS n FROM fi_stage.review_requests WHERE report_id=$1',[report])).rows[0].n;}};
    await work(f);
   }finally{await admin.query('ROLLBACK');await Promise.allSettled(pending);for(const r of resources.reverse())r.dispose();await admin.query('DELETE FROM fi_stage.reports WHERE record_id=$1',[record]);await admin.query('DELETE FROM fi_stage.records WHERE id=$1',[record]);}
  }
  const scenario=(name,work)=>t.test(name,()=>fixture(work));
  await scenario('authority reader returns scope/deadline/hash metadata, not payloads',async f=>{const a=await f.authority.get(f.ctx,f.report,'review');assert.equal(a.ok,true);assert.equal(a.actorId,R);assert.equal(a.body,undefined);assert.equal(a.feedback,undefined);assert.equal(a.digest,createHash('sha256').update('FICTIONAL_CONTROL_BODY').digest('hex'));const p=await f.controls.prepare(f.ctx,f.draft);assert.ok(p.until<=a.validUntilMs&&p.until<=a.expiresAtMs);assert.equal(await f.count(),0);});
  await scenario('SQL rejects actor/purpose crossover',async f=>{await assert.rejects(()=>workers.query("SELECT fi_stage.review_authority($1,$2,$3::uuid,'demo-course','demo-exercise',$4::uuid,'review')",[L,G,f.record,f.report]),e=>e.code==='42501');assert.equal(await f.authority.get(f.learner,f.report,'review'),null);});
  await scenario('prepare and confirm record one review',async f=>{const p=await f.controls.prepare(f.ctx,f.draft),r=await f.controls.confirm(f.ctx,p.token);assert.equal(r.ok,true);assert.equal(r.requestId,p.token);assert.equal(await f.count(),1);assert.equal((await f.controls.getStatus(f.learner,f.report)).status,'changes-requested');});
  await scenario('repeated confirmation is receipt-only',async f=>{const p=await f.controls.prepare(f.ctx,f.draft),r=await f.controls.confirm(f.ctx,p.token);assert.deepEqual(await f.controls.confirm(f.ctx,p.token),r);assert.equal(await f.count(),1);});
  await scenario('concurrent confirmations cannot produce two writes',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);const results=await Promise.all([f.track(f.controls.confirm(f.ctx,p.token)),f.track(f.controls.confirm(f.ctx,p.token))]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(await f.count(),1);});
  await scenario('revocation between preparation and confirmation blocks mutation',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);await admin.query('UPDATE fi_stage.records SET active=false WHERE id=$1',[f.record]);assert.equal((await f.controls.confirm(f.ctx,p.token)).ok,false);assert.equal(await f.count(),0);});
  await scenario('expired grant blocks a prepared command',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);await admin.query("UPDATE fi_stage.records SET valid_until=statement_timestamp()-interval '1 second' WHERE id=$1",[f.record]);assert.equal((await f.controls.confirm(f.ctx,p.token)).ok,false);assert.equal(await f.count(),0);});
  await scenario('competing decision requires a new selection',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);assert.equal((await f.store.recordReview(f.ctx,{reportId:f.report,requestId:randomUUID(),expectedReviewRevision:0,decision:'review-recorded',feedback:'OTHER_FICTIONAL_FEEDBACK'})).ok,true);assert.equal((await f.controls.confirm(f.ctx,p.token)).reason,'conflict');assert.equal(await f.count(),1);});
  await scenario('changed report snapshot invalidates preparation',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);await admin.query("UPDATE fi_stage.reports SET body='CHANGED_FICTIONAL_BODY',digest=encode(sha256(convert_to('CHANGED_FICTIONAL_BODY','UTF8')),'hex') WHERE id=$1",[f.report]);assert.equal((await f.controls.confirm(f.ctx,p.token)).reason,'refresh-required');assert.equal(await f.count(),0);});
  await scenario('lost COMMIT acknowledgement requires explicit identical recovery',async f=>{
   let lose=true;const commands=[];
   const pool={async connect(){const c=await workers.connect();return {async query(sql,values){if(sql.startsWith('SELECT fi_stage.record_review'))commands.push([...values]);const r=await c.query(sql,values);if(sql==='COMMIT'&&lose){lose=false;throw Error('INJECTED_LOST_ACK');}return r;},release:d=>c.release(d)};}};
   const c=f.makeControls(f.makeStore(pool)),p=await c.prepare(f.ctx,f.draft);assert.equal((await c.confirm(f.ctx,p.token)).reason,'recovery-required');assert.equal(commands.length,1);assert.equal((await c.prepare(f.ctx,f.draft)).reason,'recovery-required');assert.equal((await c.recover(f.ctx,p.token)).ok,true);assert.equal(commands.length,2);assert.deepEqual(commands[0],commands[1]);assert.equal(await f.count(),1);
  });
  await scenario('scripted private controls compose with real database adapters',async f=>{await f.controls.handle(f.interaction());const confirm=f.payloads.at(-1).components[0].components[0].custom_id;await f.controls.handle(f.interaction(confirm,{message:f.privateMessage}));assert.equal(await f.count(),1);await f.controls.handle(f.interaction('nrv:status',{user:{id:L},channelId:LC,message:{id:LE,author:{id:B}}}));assert.match(f.payloads.at(-1).content,/Current status: changes-requested/);const text=JSON.stringify(f.payloads);assert.ok(!text.includes('FICTIONAL_CONTROL_BODY'));assert.ok(!text.includes('FICTIONAL_CONTROL_FEEDBACK'));});
  await scenario('report redaction also invalidates outstanding controls',async f=>{const p=await f.controls.prepare(f.ctx,f.draft);await admin.query('UPDATE fi_stage.reports SET body=NULL,digest=NULL WHERE id=$1',[f.report]);assert.equal((await f.controls.confirm(f.ctx,p.token)).ok,false);assert.equal((await f.controls.getStatus(f.learner,f.report)).ok,false);assert.equal(await f.count(),0);});
  assert.equal((await admin.query('SELECT count(*)::int AS n FROM fi_stage.records')).rows[0].n,0);
 }finally{try{if(workers)await workers.end();}finally{await admin.end();}}
});
