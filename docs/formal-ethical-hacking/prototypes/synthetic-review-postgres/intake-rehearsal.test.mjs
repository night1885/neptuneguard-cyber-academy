import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createNoModalIntakeCoordinator} from '../synthetic-workspace/no-modal-intake.mjs';
import {createNoModalIntakeBoundary} from '../synthetic-workspace/no-modal-intake-boundary.mjs';
const G='100000000000000001',PROD='100000000000000002',L='100000000000000003',O='100000000000000004',C='100000000000000005',M='100000000000000006',ENTRY='100000000000000007',CONTROL='100000000000000008',DAY=86400000;
function profile(env){
 if(env.GITHUB_ACTIONS!=='true'||env.SYNTHETIC_REVIEW_CI!=='true'||env.DATABASE_URL||!['16','18'].includes(env.SYNTHETIC_PG_MAJOR))throw new Error('Explicit disposable rehearsal CI required');
 const u=new URL(env.SYNTHETIC_REVIEW_DATABASE_URL);
 if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/synthetic_review_test'||u.username!=='synthetic_review_admin'||u.password!=='ci-disposable-only'||u.search||u.hash)throw new Error('Explicit disposable rehearsal CI required');
 return u;
}
const requestKey=value=>'demo-'+createHash('sha256').update(value).digest('hex').slice(0,40);
function interaction(customId,actor=L){return{customId,guildId:G,channelId:ENTRY,user:{id:actor},message:{id:CONTROL,flags:{has:n=>n===64}},deferred:false,replied:false,edits:[],
 isButton:()=>true,async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},
 async reply(p){assert.equal(p.flags,64);this.replied=true;},async editReply(p){this.edits.push(p);return{id:CONTROL,flags:{has:n=>n===64}};}};}
test('offline rehearsal profile rejects missing opt-ins',()=>assert.throws(()=>profile({})));
test('offline UUID request translation is stable and matches existing fixture limits',()=>{
 const k=requestKey('00000000-0000-4000-8000-000000000001');assert.match(k,/^demo-[a-z0-9-]{1,40}$/);assert.equal(k,requestKey('00000000-0000-4000-8000-000000000001'));assert.notEqual(k,requestKey('00000000-0000-4000-8000-000000000002'));
});
test('connected fictional button-to-storage review expiry and deletion recovery journey',{timeout:120000},async t=>{
 const u=profile(process.env),{default:pg}=await import('pg');
 const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
 const admin=new pg.Pool({connectionString:u.href,max:4,options,connectionTimeoutMillis:5000});let worker,installed=false,engine,boundary;
 const scope=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version")).rows[0];
  assert.equal(identity.db,'synthetic_review_test');assert.equal(identity.actor,'synthetic_review_admin');assert.equal(Math.floor(identity.version/10000),Number(process.env.SYNTHETIC_PG_MAJOR));assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  await admin.query(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));installed=true;
  for(const name of ['retention-fixture.sql','source-provenance-fixture.sql','intake-rehearsal-fixture.sql'])await admin.query(await readFile(new URL(name,import.meta.url),'utf8'));
  await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true)',['demo-learner',...scope]);
  u.username='synthetic_review_worker';u.password='ci-worker-only';worker=new pg.Pool({connectionString:u.href,max:4,options,connectionTimeoutMillis:5000});
  const names=new Set(['create_record','rehearsal_binding','source_receipt','submit_source_report','read_source_report','review_source_report']);
  const call=async(name,args)=>{assert.equal(names.has(name),true);return(await worker.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;};
  const created=await call('create_record',['demo-learner',...scope]);assert.equal(created.ok,true);const recordId=created.id;
  await admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[recordId,'demo-reviewer']);
  const f={now:946684800000,journal:null,sourcePresent:true,views:new Map(),submitCalls:0,reviewCalls:0};
  const message={id:M,guildId:G,channelId:C,authorId:L,bot:false,webhook:false,contentAvailable:true,createdAtMs:f.now,content:'Fictional connected report @everyone',attachmentCount:0,forwarded:false};
  const actor=id=>{if(id===L)return'demo-learner';if(id===O)return'demo-reviewer';throw new Error('Unknown rehearsal actor');};
  const operation=action=>{if(action==='review')return'review';if(['prepare','preview','submit'].includes(action))return'submit';throw new Error('Draft actions not connected');};
  const resolve=async ctx=>{
   assert.equal(ctx.guildId,G);const b=await call('rehearsal_binding',[actor(ctx.actorId),recordId,operation(ctx.action)]);
   if(b.ok!==true||b.recordId!==recordId||b.learnerId!=='demo-learner'||b.courseKey!==scope[1]||b.exerciseKey!==scope[2])throw new Error('Fixture binding unavailable');
   return{recordId:b.recordId,learnerId:L,courseKey:b.courseKey,exerciseKey:b.exerciseKey,revision:b.revision};
  };
  const envelope=r=>{if(r?.ok!==true)return r;if(r.recordId!==recordId||r.learnerId!=='demo-learner'||r.sourceGuildId!==G)throw new Error('Fixture envelope mismatch');return{...r,learnerId:L};};
  const ports={now:()=>f.now,resolve,authorize:async b=>{const current=await resolve(b);return ['recordId','learnerId','courseKey','exerciseKey'].every(k=>current[k]===b[k]);},
   journalRead:async()=>f.journal,journalWrite:async(b,j)=>{f.journal={...j};},createRestricted:async(b,p)=>{assert.equal(p.learnerAccess,false);return{id:C,guildId:G};},verifyPrivate:async()=>true,admitLearner:async()=>{},
   latest:async()=>f.sourcePresent?{...message}:null,exact:async(b,ch,id)=>f.sourcePresent&&ch===C&&id===M?{...message}:null,
   receipt:async(b,key)=>envelope(await call('source_receipt',[actor(b.actorId),...scope,recordId,requestKey(key)])),
   submit:async(b,p)=>{f.submitCalls++;assert.equal(p.digest,createHash('sha256').update(p.body).digest('hex'));return envelope(await call('submit_source_report',[actor(b.actorId),...scope,recordId,p.expectedRevision,requestKey(p.requestId),p.body,G,p.channelId,p.messageId,p.createdAtMs]));},
   readReport:async(b,id)=>envelope(await call('read_source_report',[actor(b.actorId),...scope,recordId,id])),
   publishTrackedReview:async(b,r)=>{f.views.set(r.reportId,{body:r.body,expiresAtMs:r.expiresAtMs});return{tracked:true,expiresAtMs:r.expiresAtMs};},
   review:async(b,p)=>{f.reviewCalls++;return envelope(await call('review_source_report',[actor(b.actorId),...scope,recordId,p.expectedRevision,requestKey(JSON.stringify([p.reportId,p.expectedRevision,p.decision,p.feedback])),p.feedback,p.decision,p.reportId]));},
   claimDraft:async()=>{throw new Error('Draft deletion not connected');},deleteDraft:async()=>{throw new Error('Draft deletion not connected');},finishDraft:async()=>{throw new Error('Draft deletion not connected');}
  };
  engine=createNoModalIntakeCoordinator({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:PROD,ownerId:O,courseKey:scope[1],policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},ports);
  boundary=createNoModalIntakeBoundary({enabled:true,guildId:G,entryChannelId:ENTRY,isReady:()=>true,coordinator:engine,readNow:()=>f.now});
  let submitId,stored,reviewed;
  await t.test('actual button boundary provisions simulated channel and previews exact fictional source',async()=>{
   const open=interaction('nmi:prepare');await boundary.handle(open);assert.match(open.edits[0].content,/Intake channel:/);
   const preview=interaction('nmi:preview');await boundary.handle(preview);submitId=preview.edits[0].components[0].components[0].custom_id;assert.match(submitId,/^nmi:submit:/);
   assert.equal(JSON.stringify(preview.edits).includes(message.content),false);assert.deepEqual(preview.edits[0].allowedMentions,{parse:[]});
  });
  await t.test('button submission persists through restricted worker; duplicate click replays one receipt',async()=>{
   for(let n=0;n<2;n++){const i=interaction(submitId);await boundary.handle(i);assert.match(i.edits[0].content,/Submission acknowledged/);}
   assert.equal(f.submitCalls,1);const token=submitId.slice(11);stored=await ports.receipt({actorId:L},token);assert.equal(stored.ok,true);assert.equal(stored.learnerId,L);assert.equal(stored.expiresAtMs-stored.submittedAtMs,DAY);
   assert.equal((await ports.readReport({actorId:L},stored.reportId)).body,message.content);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[recordId])).rows[0].n,1);
  });
  await t.test('coordinator review uses same stored report and scripted tracked copy without resetting retention',async()=>{
   reviewed=await engine.review({actorId:O,guildId:G},stored.reportId,1,'review-recorded','Fictional connected feedback.');assert.equal(reviewed.ok,true);assert.equal(reviewed.revision,2);assert.equal(reviewed.expiresAtMs,stored.expiresAtMs);assert.equal(f.reviewCalls,1);assert.equal(f.views.get(stored.reportId).body,message.content);
  });
  const advance=async at=>{await admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=to_timestamp($1::double precision/1000)",[at]);f.now=at;};
  await t.test('same controlled deadline denies stored reads, receipts, reviews and cached view delivery',async()=>{
   await advance(stored.expiresAtMs-1);assert.equal((await ports.readReport({actorId:L},stored.reportId)).ok,true);
   await advance(stored.expiresAtMs);assert.equal((await ports.readReport({actorId:L},stored.reportId)).ok,false);assert.equal((await ports.receipt({actorId:L},submitId.slice(11))).ok,false);
   assert.equal((await engine.review({actorId:O,guildId:G},stored.reportId,2,'review-recorded','Fictional late feedback.')).ok,false);assert.equal(f.reviewCalls,1);
   const deliverView=id=>{const v=f.views.get(id);return v&&f.now<v.expiresAtMs?v.body:null;};assert.equal(deliverView(stored.reportId),null);
  });
  const purge=async()=>(await admin.query('SELECT synthetic_review_ci.purge_report($1) AS r',[stored.reportId])).rows[0].r;
  await t.test('scripted external deletion failure remains pending with inaccessible stored report',async()=>{
   await admin.query("UPDATE synthetic_review_ci.report_copy SET state='failed' WHERE report_id=$1",[stored.reportId]);assert.deepEqual(await purge(),{ok:false,reason:'deletion-pending'});assert.equal(f.sourcePresent,true);assert.equal(f.views.has(stored.reportId),true);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE id=$1',[stored.reportId])).rows[0].n,1);
  });
  await t.test('scripted copy retry plus database purge cleans this report without deleting assignment',async()=>{
   f.sourcePresent=false;f.views.delete(stored.reportId);await admin.query("UPDATE synthetic_review_ci.report_copy SET state='confirmed' WHERE report_id=$1",[stored.reportId]);assert.deepEqual(await purge(),{ok:true,outcome:'deleted'});
   for(const table of ['report_snapshots','report_sources','report_feedback','report_audit','report_receipts','report_copy'])assert.equal((await admin.query(`SELECT count(*)::int AS n FROM synthetic_review_ci.${table} WHERE ${table==='report_snapshots'?'id':'report_id'}=$1`,[stored.reportId])).rows[0].n,0);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.records WHERE id=$1',[recordId])).rows[0].n,1);assert.equal((await admin.query('SELECT active FROM synthetic_review_ci.assignments WHERE actor=$1',['demo-learner'])).rows[0].active,true);
   assert.equal(f.sourcePresent,false);assert.equal(f.views.size,0);
  });
 }finally{
  boundary?.dispose();engine?.dispose();try{if(worker)await worker.end();}finally{try{if(installed){await admin.query('DROP SCHEMA synthetic_review_ci CASCADE');await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}finally{await admin.end();}}
 }
});
