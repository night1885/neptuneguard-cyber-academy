import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requireDisposableRecoveryProfile} from './receipt-recovery-profile.mjs';
import {createDisposableIntakeAdapter} from './intake-storage-adapter.mjs';
import {createNoModalIntakeCoordinator} from '../synthetic-workspace/no-modal-intake.mjs';
import {createDetachedIntakeJourney} from '../synthetic-workspace/detached-intake-journey.mjs';
import {exerciseLifecycleComposition} from './detached-intake-lifecycle-composition.mjs';
const G='100000000000000001',PROD='100000000000000002',L='100000000000000003',O='100000000000000004',ENTRY='100000000000000005',DAY=86400000;
const scope=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
test('actual detached journey, coordinator and disposable adapter composition',{timeout:120000},async t=>{
 const u=requireDisposableRecoveryProfile(process.env),{default:pg}=await import('pg');
 const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
 const admin=new pg.Client({connectionString:u.href,options,connectionTimeoutMillis:5000});
 let worker,installed=false,serial=0;const journeys=[],engines=[],stores=[];
 const advance=at=>admin.query('UPDATE synthetic_review_ci.report_clock SET at_time=to_timestamp($1::double precision/1000)',[at]);
 const dbNow=async()=>Number((await admin.query('SELECT (extract(epoch FROM synthetic_review_ci.fixture_now())*1000)::bigint AS n')).rows[0].n);
 try{
  await admin.connect();
  const actual=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int/10000 AS major")).rows[0];
  assert.equal(actual.db,'synthetic_review_test');assert.equal(actual.actor,'synthetic_review_admin');assert.equal(actual.major,Number(process.env.SYNTHETIC_PG_MAJOR));
  assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  assert.equal((await admin.query("SELECT to_regnamespace('synthetic_review_ci') IS NULL AS clean")).rows[0].clean,true);
  assert.equal((await admin.query("SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS clean")).rows[0].clean,true);
  installed=true;
  for(const file of ['fixture.sql','retention-fixture.sql','source-provenance-fixture.sql','intake-rehearsal-fixture.sql','intake-adapter-fixture.sql'])await admin.query(await readFile(new URL(file,import.meta.url),'utf8'));
  await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true)',['demo-learner',...scope]);
  const url=new URL(u.href);url.username='synthetic_review_worker';url.password='ci-worker-only';
  worker=new pg.Pool({connectionString:url.href,max:4,options,connectionTimeoutMillis:5000});
  async function fresh(){
   const r=(await worker.query('SELECT synthetic_review_ci.adapter_create_record($1,$2,$3,$4,$5) AS r',['demo-learner',...scope,G])).rows[0].r;assert.equal(r.ok,true);
   const n=++serial,f={record:r.id,channel:String(100000000000001000n+BigInt(n)),message:String(100000000000002000n+BigInt(n)),control:String(100000000000003000n+BigInt(n)),now:await dbNow(),parentReady:true,creates:0,reads:0,submits:0,source:true,edits:[],denials:[]};
   f.created=f.now;f.body='Fictional assembly composition report '+n;f.ctx={actorId:L,guildId:G};
   f.rebuild=async()=>{
    f.journey?.dispose();f.engine?.dispose();f.api?.dispose();
    f.api=createDisposableIntakeAdapter({enabled:true,pool:worker,env:process.env,recordId:f.record,guildId:G,productionGuildId:PROD,learnerId:L,ownerId:O});stores.push(f.api);await f.api.initialize();
    const message=()=>{f.reads++;if(!f.source)throw Error('Source transport must not be consulted during recovery');return {id:f.message,guildId:G,channelId:f.channel,authorId:L,bot:false,webhook:false,contentAvailable:true,createdAtMs:f.created,content:f.body,attachmentCount:0,forwarded:false};};
    const api=f.api;
    f.engine=createNoModalIntakeCoordinator({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,ownerId:O,courseKey:scope[1],policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},
     {...api,now:()=>f.now,createRestricted:async(b,p)=>{assert.equal(p.learnerAccess,false);f.creates++;return {id:f.channel,guildId:G};},verifyPrivate:async(b,ch)=>ch===f.channel,admitLearner:async()=>{},latest:async()=>message(),exact:async()=>message(),submit:async(...args)=>{f.submits++;return api.submit(...args);},publishTrackedReview:async()=>{throw Error('Unexpected reviewer provider');},deleteDraft:async()=>{throw Error('Unexpected deletion provider');}});engines.push(f.engine);
    f.journey=createDetachedIntakeJourney({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,entryChannelId:ENTRY,courseKey:scope[1],exerciseKey:scope[2],timeoutMs:1000},
     {coordinator:f.engine,storage:api,isReady:()=>f.parentReady,now:()=>f.now});journeys.push(f.journey);
   };
   f.interaction=(customId,actor=L,control=f.control)=>({customId,guildId:G,channelId:ENTRY,user:{id:actor},message:{id:control,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,
    async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){this.replied=true;f.denials.push(p);},async editReply(p){f.edits.push(p);return {id:f.control,flags:{has:n=>n===64}};}});
   f.handle=(id,actor=L,control=f.control)=>f.journey.handle(f.interaction(id,actor,control));
   f.submit=async()=>{
    assert.equal(await f.handle('nmi:prepare'),true);assert.match(f.edits.at(-1).content,/Intake channel:/);
    assert.equal(await f.handle('nmi:preview'),true);
    const button=f.edits.at(-1).components[0].components[0].custom_id;assert.match(button,/^nmi:submit:/);f.requestId=button.slice(11);
    assert.equal(await f.handle(button),true);assert.match(f.edits.at(-1).content,/Submission acknowledged/);
    f.ack=await f.engine.recoverSubmission(f.ctx,f.requestId);assert.equal(f.ack.ok,true);assert.equal(f.ack.expiresAtMs,f.now+DAY);
   };
   f.open=async()=>{const before=f.edits.length;assert.equal(await f.handle('nmr:list'),true);return f.edits.length>before?f.edits.at(-1).components[0]?.components[0]?.custom_id:undefined;};
   f.count=async()=>Number((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[f.record])).rows[0].n);
   await f.rebuild();return f;
  }
  await t.test('interaction-driven intake then recovery preserves one submission and emits metadata only',async()=>{
   const f=await fresh();await f.submit();const reads=f.reads,start=f.edits.length;f.source=false;
   const token=await f.open();assert.match(token,/^nmr:recover:/);await f.handle(token);assert.match(f.edits.at(-1).content,/Submission receipt verified/);
   assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(f.creates,1);assert.equal(await f.count(),1);
   assert.deepEqual(await f.engine.recoverSubmission(f.ctx,f.requestId),f.ack);
   const recovery=f.edits.slice(start),delivered=JSON.stringify(recovery);
   for(const value of [f.body,f.requestId,f.record,f.ack.reportId])assert.equal(delivered.includes(value),false);
   for(const payload of f.edits){assert.deepEqual(payload.allowedMentions,{parse:[]});assert.deepEqual(payload.embeds,[]);}
  });
  await t.test('reconstructed actual providers require fresh assembly controls',async()=>{
   const f=await fresh();await f.submit();const old=await f.open(),reads=f.reads;f.source=false;await f.rebuild();
   const denied=f.denials.length;await f.handle(old);assert.equal(f.denials.length,denied+1);
   const token=await f.open();assert.match(token,/^nmr:recover:/);assert.notEqual(token,old);await f.handle(token);assert.match(f.edits.at(-1).content,/verified/);
   assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(f.creates,1);assert.equal(await f.count(),1);
  });
  await t.test('foreign actor, private message and other record cannot reuse controls',async()=>{
   const a=await fresh(),b=await fresh();await a.submit();await b.submit();const token=await a.open(),before=a.edits.length,other=b.edits.length;
   await a.handle(token,O);await a.handle(token,L,ENTRY);await b.handle(token);
   assert.equal(a.denials.length,2);assert.equal(b.denials.length,1);assert.equal(a.edits.length,before);assert.equal(b.edits.length,other);
   assert.equal(await a.count(),1);assert.equal(await b.count(),1);
  });
  await t.test('revoked database assignment blocks captured assembly recovery',async()=>{
   const f=await fresh();await f.submit();const token=await f.open();
   await admin.query("UPDATE synthetic_review_ci.assignments SET active=false WHERE actor='demo-learner'");
   try{await f.handle(token);assert.match(f.edits.at(-1).content,/unavailable/);assert.equal(f.submits,1);}finally{await admin.query("UPDATE synthetic_review_ci.assignments SET active=true WHERE actor='demo-learner'");}
  });
  await t.test('missing durable request mapping never falls back to source or submission',async()=>{
   const f=await fresh();await f.submit();const token=await f.open(),reads=f.reads;f.source=false;
   await admin.query('DELETE FROM synthetic_review_ci.adapter_requests WHERE record_id=$1',[f.record]);
   await f.handle(token);assert.match(f.edits.at(-1).content,/unavailable/);assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(await f.count(),1);
  });
  await t.test('shared parent readiness denies both routes and disposal preserves borrowed providers',async()=>{
   const f=await fresh();await f.submit();const reads=f.reads,edits=f.edits.length;f.parentReady=false;
   assert.equal(f.journey.ready,false);await f.handle('nmi:prepare');await f.handle('nmr:list');assert.equal(f.denials.length,2);assert.equal(f.edits.length,edits);assert.equal(f.reads,reads);assert.equal(f.submits,1);
   f.parentReady=true;assert.equal(f.journey.ready,true);f.journey.dispose();f.journey.dispose();assert.equal(f.journey.ready,false);
   assert.equal(await f.handle('nmi:prepare'),false);assert.equal(await f.handle('nmr:list'),false);
   assert.equal(f.api.ready,true);assert.deepEqual(await f.engine.recoverSubmission(f.ctx,f.requestId),f.ack);assert.equal(await f.count(),1);
  });
  await t.test('empty discovery creates no intake channel or report',async()=>{
   const f=await fresh();assert.equal(await f.open(),undefined);assert.match(f.edits.at(-1).content,/No current submission/);
   assert.equal(f.creates,0);assert.equal(f.reads,0);assert.equal(f.submits,0);assert.equal(await f.count(),0);
  });
  await exerciseLifecycleComposition({t,fresh,journeys,config:{enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,entryChannelId:ENTRY,courseKey:scope[1],exerciseKey:scope[2],timeoutMs:1000}});
  await t.test('original expiry is enforced before, at and after deadline without account cleanup',async()=>{
   const f=await fresh();await f.submit();const reads=f.reads;f.source=false;
   await advance(f.ack.expiresAtMs-60000);f.now=f.ack.expiresAtMs-60000;const token=await f.open();assert.ok(token);
   await advance(f.ack.expiresAtMs-1);f.now=f.ack.expiresAtMs-1;await f.handle(token);assert.match(f.edits.at(-1).content,/verified/);
   const atToken=await f.open();assert.ok(atToken);await advance(f.ack.expiresAtMs);f.now=f.ack.expiresAtMs;
   const denied=f.denials.length;await f.handle(atToken);assert.equal(f.denials.length,denied+1);assert.match(f.denials.at(-1).content,/unavailable/);
   assert.equal((await f.engine.recoverSubmission(f.ctx,f.requestId)).ok,false);assert.equal(await f.open(),undefined);
   await advance(f.now+1);f.now++;assert.equal((await f.engine.recoverSubmission(f.ctx,f.requestId)).ok,false);assert.equal(await f.open(),undefined);
   assert.equal((await admin.query("SELECT count(*)::int AS n FROM synthetic_review_ci.assignments WHERE actor='demo-learner' AND active")).rows[0].n,1);
   assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(f.creates,1);
  });
 }finally{
  for(const j of journeys)j.dispose();for(const e of engines)e.dispose();for(const a of stores)a.dispose();
  try{if(worker)await worker.end();}finally{try{await admin.query('ROLLBACK');if(installed){await admin.query('DROP SCHEMA IF EXISTS synthetic_review_ci CASCADE');if((await admin.query("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS present")).rows[0].present){await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}}finally{await admin.end();}}
 }
});
