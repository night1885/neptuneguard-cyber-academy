import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {requireDisposableRecoveryProfile} from './receipt-recovery-profile.mjs';
import {createDisposableIntakeAdapter} from './intake-storage-adapter.mjs';
import {createNoModalIntakeCoordinator} from '../synthetic-workspace/no-modal-intake.mjs';
import {createReceiptRecoveryBoundary} from '../synthetic-workspace/receipt-recovery-boundary.mjs';
const G='100000000000000001',PROD='100000000000000002',L='100000000000000003',O='100000000000000004',ENTRY='100000000000000005',DAY=86400000;
const scope=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
test('actual boundary, coordinator and disposable adapter recovery composition',{timeout:120000},async t=>{
 const u=requireDisposableRecoveryProfile(process.env),{default:pg}=await import('pg');
 const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
 const admin=new pg.Client({connectionString:u.href,options,connectionTimeoutMillis:5000});
 let worker,installed=false,serial=0;const boundaries=[],engines=[],stores=[];
 const advance=at=>admin.query('UPDATE synthetic_review_ci.report_clock SET at_time=to_timestamp($1::double precision/1000)',[at]);
 const dbNow=async()=>Number((await admin.query('SELECT (extract(epoch FROM synthetic_review_ci.fixture_now())*1000)::bigint AS n')).rows[0].n);
 try{
  await admin.connect();const actual=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int/10000 AS major")).rows[0];
  assert.equal(actual.db,'synthetic_review_test');assert.equal(actual.actor,'synthetic_review_admin');assert.equal(actual.major,Number(process.env.SYNTHETIC_PG_MAJOR));
  assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  assert.equal((await admin.query("SELECT to_regnamespace('synthetic_review_ci') IS NULL AS clean,NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS no_worker")).rows[0].clean,true);
  assert.equal((await admin.query("SELECT NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS clean")).rows[0].clean,true);
  installed=true;
  for(const file of ['fixture.sql','retention-fixture.sql','source-provenance-fixture.sql','intake-rehearsal-fixture.sql','intake-adapter-fixture.sql'])await admin.query(await readFile(new URL(file,import.meta.url),'utf8'));
  await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true)',['demo-learner',...scope]);
  const url=new URL(u.href);url.username='synthetic_review_worker';url.password='ci-worker-only';
  worker=new pg.Pool({connectionString:url.href,max:4,options,connectionTimeoutMillis:5000});
  async function fresh(submit=true){
   const r=(await worker.query('SELECT synthetic_review_ci.adapter_create_record($1,$2,$3,$4,$5) AS r',['demo-learner',...scope,G])).rows[0].r;assert.equal(r.ok,true);
   const n=++serial,f={record:r.id,channel:String(100000000000001000n+BigInt(n)),message:String(100000000000002000n+BigInt(n)),control:String(100000000000003000n+BigInt(n)),now:await dbNow(),creates:0,reads:0,submits:0,source:true,edits:[],denials:[]};f.created=f.now;f.body='Fictional composition report '+n;
   f.rebuild=async()=>{
    f.boundary?.dispose();f.engine?.dispose();f.api?.dispose();
    f.api=createDisposableIntakeAdapter({enabled:true,pool:worker,env:process.env,recordId:f.record,guildId:G,productionGuildId:PROD,learnerId:L,ownerId:O});stores.push(f.api);await f.api.initialize();
    const message=()=>{f.reads++;if(!f.source)throw Error('Source transport must not be consulted during recovery');return {id:f.message,guildId:G,channelId:f.channel,authorId:L,bot:false,webhook:false,contentAvailable:true,createdAtMs:f.created,content:f.body,attachmentCount:0,forwarded:false};};
    const api=f.api;
    f.engine=createNoModalIntakeCoordinator({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,ownerId:O,courseKey:scope[1],policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},
     {...api,now:()=>f.now,createRestricted:async(b,p)=>{assert.equal(p.learnerAccess,false);f.creates++;return {id:f.channel,guildId:G};},verifyPrivate:async(b,ch)=>ch===f.channel,admitLearner:async()=>{},latest:async()=>message(),exact:async()=>message(),submit:async(...args)=>{f.submits++;return api.submit(...args);},publishTrackedReview:async()=>{throw Error('Unexpected reviewer provider');},deleteDraft:async()=>{throw Error('Unexpected deletion provider');}});engines.push(f.engine);
    f.boundary=createReceiptRecoveryBoundary({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,entryChannelId:ENTRY,courseKey:scope[1],exerciseKey:scope[2],timeoutMs:1000},
     {resolve:api.resolve,authorize:api.authorize,discoverReceipts:api.discoverReceipts,recoverSubmission:f.engine.recoverSubmission,isReady:()=>api.ready,now:()=>f.now});boundaries.push(f.boundary);
   };
   f.ctx={actorId:L,guildId:G};await f.rebuild();assert.equal((await f.engine.prepare(f.ctx)).ok,true);
   if(submit){const p=await f.engine.preview(f.ctx);assert.equal(p.ok,true);f.requestId=p.token;f.ack=await f.engine.submit(f.ctx,p.token,p.token);assert.equal(f.ack.ok,true);assert.equal(f.ack.expiresAtMs,f.now+DAY);}
   f.interaction=(customId='nmr:list',actor=L,control=f.control)=>({customId,guildId:G,channelId:ENTRY,user:{id:actor},message:{id:control,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,
    async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){this.replied=true;f.denials.push(p);},async editReply(p){f.edits.push(p);return {id:f.control,flags:{has:n=>n===64}};}});
   f.open=async()=>{const before=f.edits.length;await f.boundary.handle(f.interaction());return f.edits.length>before?f.edits.at(-1).components[0]?.components[0]?.custom_id:undefined;};
   f.select=token=>f.boundary.handle(f.interaction(token));
   f.count=async()=>Number((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[f.record])).rows[0].n);
   return f;
  }
  await t.test('actual discovery to actual recovery publishes metadata only and no duplicate write',async()=>{
   const f=await fresh(),reads=f.reads;f.source=false;const token=await f.open();assert.match(token,/^nmr:recover:/);await f.select(token);
   assert.match(f.edits.at(-1).content,/Submission receipt verified/);assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(f.creates,1);assert.equal(await f.count(),1);
   const delivered=JSON.stringify(f.edits);for(const value of [f.body,f.requestId,f.record,f.ack.reportId])assert.equal(delivered.includes(value),false);
   for(const payload of f.edits){assert.deepEqual(payload.allowedMentions,{parse:[]});assert.deepEqual(payload.embeds,[]);}
  });
  await t.test('fresh actual adapter and coordinator recover through fresh controls, never stale controls',async()=>{
   const f=await fresh(),old=await f.open(),reads=f.reads;f.source=false;await f.rebuild();await f.select(old);assert.equal(f.denials.length,1);
   const token=await f.open();assert.notEqual(token,old);await f.select(token);assert.match(f.edits.at(-1).content,/verified/);assert.equal(f.reads,reads);assert.equal(f.submits,1);assert.equal(f.creates,1);assert.equal(await f.count(),1);
  });
  await t.test('foreign actor and foreign control message cannot recover another bound receipt',async()=>{
   const f=await fresh(),token=await f.open(),before=f.edits.length;await f.boundary.handle(f.interaction(token,O));await f.boundary.handle(f.interaction(token,L,ENTRY));assert.equal(f.denials.length,2);assert.equal(f.edits.length,before);assert.equal(f.submits,1);
  });
  await t.test('actual assignment revocation blocks captured recovery controls',async()=>{
   const f=await fresh(),token=await f.open();await admin.query("UPDATE synthetic_review_ci.assignments SET active=false WHERE actor='demo-learner'");
   try{await f.select(token);assert.match(f.edits.at(-1).content,/unavailable/);assert.equal(f.submits,1);}finally{await admin.query("UPDATE synthetic_review_ci.assignments SET active=true WHERE actor='demo-learner'");}
  });
  await t.test('missing durable request mapping cannot become resubmission',async()=>{
   const f=await fresh(),token=await f.open(),reads=f.reads;await admin.query('DELETE FROM synthetic_review_ci.adapter_requests WHERE record_id=$1',[f.record]);f.source=false;
   await f.select(token);assert.match(f.edits.at(-1).content,/unavailable/);assert.equal(f.submits,1);assert.equal(f.reads,reads);assert.equal(await f.count(),1);
  });
  await t.test('controls from another record cannot be replayed into this boundary',async()=>{
   const a=await fresh(),b=await fresh(),token=await a.open();await b.select(token);assert.equal(b.denials.length,1);assert.equal(b.edits.length,0);assert.equal(await a.count(),1);assert.equal(await b.count(),1);
  });
  await t.test('exact original expiry denies boundary recovery and actual discovery without altering enrollment',async()=>{
   const f=await fresh();await advance(f.ack.expiresAtMs-60000);f.now=f.ack.expiresAtMs-60000;const token=await f.open();assert.ok(token);
   await advance(f.ack.expiresAtMs-1);f.now=f.ack.expiresAtMs-1;assert.deepEqual(await f.engine.recoverSubmission(f.ctx,f.requestId),f.ack);
   await advance(f.ack.expiresAtMs);f.now=f.ack.expiresAtMs;await f.select(token);assert.match(f.denials.at(-1).content,/unavailable/);
   assert.equal((await f.engine.recoverSubmission(f.ctx,f.requestId)).ok,false);const binding={...await f.api.resolve({...f.ctx,action:'submit'}),...f.ctx,action:'submit'};
   assert.deepEqual(await f.api.discoverReceipts(binding,5),[]);await advance(f.now+1);f.now++;assert.equal((await f.engine.recoverSubmission(f.ctx,f.requestId)).ok,false);
   assert.equal((await admin.query("SELECT count(*)::int AS n FROM synthetic_review_ci.assignments WHERE actor='demo-learner' AND active")).rows[0].n,1);assert.equal(f.submits,1);
  });
  await t.test('empty actual discovery offers no recovery controls or extra provisioning',async()=>{
   const f=await fresh(false);assert.equal(await f.open(),undefined);assert.match(f.edits.at(-1).content,/No current submission/);assert.equal(f.creates,1);assert.equal(f.submits,0);assert.equal(await f.count(),0);
  });
 }finally{
  for(const b of boundaries)b.dispose();for(const e of engines)e.dispose();for(const a of stores)a.dispose();
  try{if(worker)await worker.end();}finally{try{await admin.query('ROLLBACK');if(installed){await admin.query('DROP SCHEMA IF EXISTS synthetic_review_ci CASCADE');if((await admin.query("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS present")).rows[0].present){await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}}finally{await admin.end();}}
 }
});
