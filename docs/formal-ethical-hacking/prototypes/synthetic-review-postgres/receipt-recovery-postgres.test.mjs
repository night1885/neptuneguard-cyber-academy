import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createNoModalIntakeCoordinator as create} from '../synthetic-workspace/no-modal-intake.mjs';
import {requireDisposableRecoveryProfile as profile} from './receipt-recovery-profile.mjs';
const G='100000000000000001',PROD='100000000000000002',L='100000000000000003',O='100000000000000004',C='100000000000000005',M='100000000000000006',OTHER='100000000000000009',DAY=86400000;
test('restricted PostgreSQL receipt recovery after coordinator and connection reconstruction',{timeout:120000},async t=>{
 const u=profile(process.env),{default:pg}=await import('pg');
 const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
 const admin=new pg.Pool({connectionString:u.href,max:2,options,connectionTimeoutMillis:5000});
 let worker,installed=false,engine;
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version")).rows[0];
  assert.equal(identity.db,'synthetic_review_test');assert.equal(identity.actor,'synthetic_review_admin');assert.equal(Math.floor(identity.version/10000),Number(process.env.SYNTHETIC_PG_MAJOR));assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  const existing=(await admin.query("SELECT to_regnamespace('synthetic_review_ci') IS NOT NULL AS schema_present,EXISTS(SELECT 1 FROM pg_roles WHERE rolname='synthetic_review_worker') AS worker_present")).rows[0];
  assert.deepEqual(existing,{schema_present:false,worker_present:false},'Serial isolated fixture required; refusing existing schema or worker');
  await admin.query(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));installed=true;
  for(const name of ['retention-fixture.sql','source-provenance-fixture.sql','intake-rehearsal-fixture.sql'])await admin.query(await readFile(new URL(name,import.meta.url),'utf8'));
  const scope=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
  await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true)',['demo-learner',...scope]);
  u.username='synthetic_review_worker';u.password='ci-worker-only';
  const connect=()=>new pg.Pool({connectionString:u.href,max:2,options,connectionTimeoutMillis:5000});worker=connect();
  assert.equal((await worker.query('SELECT current_user AS actor')).rows[0].actor,'synthetic_review_worker');
  const names=new Set(['create_record','rehearsal_binding','source_receipt','submit_source_report']);
  const call=async(name,args)=>{assert.equal(names.has(name),true);return(await worker.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;};
  const created=await call('create_record',['demo-learner',...scope]);assert.equal(created.ok,true);const recordId=created.id;
  const createdAtMs=946684800000;
  await admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=to_timestamp($1::double precision/1000)",[createdAtMs]);
  const requestId='demo-recovery-request';
  const stored=await call('submit_source_report',['demo-learner',...scope,recordId,0,requestId,'Fictional recovery report',G,C,M,createdAtMs]);
  assert.equal(stored.ok,true);assert.equal(stored.sourceGuildId,G);assert.equal(stored.expiresAtMs-stored.submittedAtMs,DAY);
  const f={now:stored.submittedAtMs,channel:C,submitCalls:0,receiptCalls:0};
  const ctx={actorId:L,guildId:G};
  const resolve=async c=>{assert.equal(c.actorId,L);assert.equal(c.guildId,G);assert.equal(c.action,'submit');const b=await call('rehearsal_binding',['demo-learner',recordId,'submit']);if(b.ok!==true||b.recordId!==recordId||b.learnerId!=='demo-learner'||b.courseKey!==scope[1]||b.exerciseKey!==scope[2])throw new Error('Binding unavailable');return{recordId,learnerId:L,courseKey:b.courseKey,exerciseKey:b.exerciseKey,revision:b.revision};};
  const ports={now:()=>f.now,resolve,authorize:async b=>{const current=await resolve(b);return ['recordId','learnerId','courseKey','exerciseKey'].every(k=>b[k]===current[k]);},journalRead:async()=>({state:'available',channelId:f.channel}),verifyPrivate:async()=>true,
   receipt:async(b,k)=>{f.receiptCalls++;const r=await call('source_receipt',['demo-learner',...scope,recordId,k]);if(r?.ok!==true)return r;if(r.recordId!==recordId||r.learnerId!=='demo-learner'||r.sourceGuildId!==G)throw new Error('Receipt envelope mismatch');return{...r,learnerId:L};},
   submit:async()=>{f.submitCalls++;throw new Error('Recovery must not submit');}};
  for(const name of ['journalWrite','createRestricted','admitLearner','latest','exact','readReport','publishTrackedReview','review','claimDraft','deleteDraft','finishDraft'])ports[name]=async()=>{throw new Error('Unexpected recovery provider');};
  const make=()=>create({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,ownerId:O,courseKey:scope[1],policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},ports);
  const snapshot=async()=>({snapshots:(await admin.query('SELECT id,submitted_at,expires_at FROM synthetic_review_ci.report_snapshots WHERE record_id=$1 ORDER BY id',[recordId])).rows,receipts:(await admin.query('SELECT request_id,report_id FROM synthetic_review_ci.report_receipts WHERE record_id=$1 ORDER BY request_id',[recordId])).rows});
  const baseline=await snapshot();engine=make();assert.equal(typeof engine.recoverSubmission,'function','Apply the coordinator recovery patch first');engine.dispose();await worker.end();worker=connect();assert.equal((await worker.query('SELECT current_user AS actor')).rows[0].actor,'synthetic_review_worker');engine=make();
  await t.test('fresh coordinator and fresh worker pool recover persisted receipt',async()=>{const r=await engine.recoverSubmission(ctx,requestId);assert.deepEqual(r,{ok:true,reportId:stored.reportId,revision:stored.revision,expiresAtMs:stored.expiresAtMs});assert.deepEqual(await snapshot(),baseline);assert.equal(f.submitCalls,0);});
  await t.test('missing request never creates a new report',async()=>{assert.equal((await engine.recoverSubmission(ctx,'demo-missing')).ok,false);assert.deepEqual(await snapshot(),baseline);assert.equal(f.submitCalls,0);});
  await t.test('foreign actor denied before receipt lookup',async()=>{const before=f.receiptCalls;assert.equal((await engine.recoverSubmission({actorId:OTHER,guildId:G},requestId)).ok,false);assert.equal(f.receiptCalls,before);assert.deepEqual(await snapshot(),baseline);});
  await t.test('assignment revocation blocks SQL receipt and coordinator recovery',async()=>{await admin.query('UPDATE synthetic_review_ci.assignments SET active=false WHERE actor=$1',['demo-learner']);try{assert.equal((await call('source_receipt',['demo-learner',...scope,recordId,requestId])).ok,false);assert.equal((await engine.recoverSubmission(ctx,requestId)).ok,false);}finally{await admin.query('UPDATE synthetic_review_ci.assignments SET active=true WHERE actor=$1',['demo-learner']);}assert.deepEqual(await snapshot(),baseline);});
  await t.test('changed current channel blocks a stored receipt',async()=>{f.channel=OTHER;try{assert.equal((await engine.recoverSubmission(ctx,requestId)).ok,false);}finally{f.channel=C;}assert.deepEqual(await snapshot(),baseline);});
  const advance=async at=>{await admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=to_timestamp($1::double precision/1000)",[at]);f.now=at;};
  await t.test('before deadline recovers original deadline; at deadline denies',async()=>{await advance(stored.expiresAtMs-1);assert.equal((await engine.recoverSubmission(ctx,requestId)).expiresAtMs,stored.expiresAtMs);await advance(stored.expiresAtMs);assert.equal((await engine.recoverSubmission(ctx,requestId)).ok,false);assert.equal((await call('source_receipt',['demo-learner',...scope,recordId,requestId])).ok,false);assert.deepEqual(await snapshot(),baseline);assert.equal(f.submitCalls,0);});
 }finally{
  engine?.dispose();try{if(worker)await worker.end();}finally{try{if(installed){await admin.query('DROP SCHEMA synthetic_review_ci CASCADE');await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}finally{await admin.end();}}
 }
});
