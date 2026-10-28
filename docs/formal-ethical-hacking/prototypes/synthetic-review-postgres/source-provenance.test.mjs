import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const DAY=86400000,G='100000000000000001',C='100000000000000005',M='100000000000000006';
function profile(env){
 if(env.GITHUB_ACTIONS!=='true'||env.SYNTHETIC_REVIEW_CI!=='true'||env.DATABASE_URL||!['16','18'].includes(env.SYNTHETIC_PG_MAJOR))throw new Error('Disposable CI required');
 const u=new URL(env.SYNTHETIC_REVIEW_DATABASE_URL);
 if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/synthetic_review_test'||u.username!=='synthetic_review_admin'||u.password!=='ci-disposable-only'||u.search||u.hash)throw new Error('Disposable CI required');
 return u;
}
test('provenance runner rejects an unconfigured environment',()=>assert.throws(()=>profile({})));
test('source provenance disposable PostgreSQL acceptance',{timeout:120000},async t=>{
 const u=profile(process.env);const {default:pg}=await import('pg');
 const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
 const admin=new pg.Pool({connectionString:u.href,max:4,options,connectionTimeoutMillis:5000});let worker,installed=false;
 const ctx=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
 const denied={ok:false,reason:'unavailable'},conflict={ok:false,reason:'conflict'};
 const call=async(name,args,pool=worker)=>(await pool.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
 const create=async(actor='demo-learner')=>{const r=await call('create_record',[actor,...ctx]);assert.equal(r.ok,true);return r.id;};
 const submit=(id,{actor='demo-learner',v=0,k='demo-submit',body='Fictional source report.',m=M,ch=C,g=G,created=946684800000}={})=>call('submit_source_report',[actor,...ctx,id,v,k,body,g,ch,m,created]);
 const receipt=(id,k='demo-submit',actor='demo-learner')=>call('source_receipt',[actor,...ctx,id,k]);
 const read=(id,s)=>call('read_source_report',['demo-learner',...ctx,id,s]);
 const advance=ms=>admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=at_time+($1::double precision*interval '1 millisecond')",[ms]);
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version")).rows[0];
  assert.equal(identity.db,'synthetic_review_test');assert.equal(identity.actor,'synthetic_review_admin');assert.equal(Math.floor(identity.version/10000),Number(process.env.SYNTHETIC_PG_MAJOR));
  assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  await admin.query(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));installed=true;
  for(const name of ['retention-fixture.sql','source-provenance-fixture.sql'])await admin.query(await readFile(new URL(name,import.meta.url),'utf8'));
  await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true),($5,$2,$3,$4,true)',['demo-learner',...ctx,'demo-other']);
  u.username='synthetic_review_worker';u.password='ci-worker-only';worker=new pg.Pool({connectionString:u.href,max:4,options,connectionTimeoutMillis:5000});
  let id,s;
  await t.test('submission returns stored provenance, database body digest and exact deadline',async()=>{
   id=await create();s=await submit(id);assert.equal(s.ok,true);assert.equal(s.recordId,id);assert.equal(s.learnerId,'demo-learner');
   assert.equal(s.sourceGuildId,G);assert.equal(s.sourceChannelId,C);assert.equal(s.sourceMessageId,M);assert.equal(s.sourceCreatedAtMs,946684800000);assert.equal(s.expiresAtMs-s.submittedAtMs,DAY);
   const {createHash}=await import('node:crypto');assert.equal(s.digest,createHash('sha256').update('Fictional source report.').digest('hex'));assert.equal((await read(id,s.reportId)).body,'Fictional source report.');
  });
  await t.test('receipt and identical retry preserve original acknowledgment',async()=>{await advance(1000);assert.deepEqual(await receipt(id),s);assert.deepEqual(await submit(id),s);});
  await t.test('changed provenance or payload conflicts on the same request',async()=>{
   for(const patch of [{m:'100000000000000010'},{ch:'100000000000000011'},{created:946684800001},{body:'Changed fictional report.'}])assert.deepEqual(await submit(id,patch),conflict);
  });
  await t.test('same source under another request or record cannot reset retention',async()=>{assert.deepEqual(await submit(id,{k:'demo-new'}),conflict);const other=await create();assert.deepEqual(await submit(other),conflict);});
  await t.test('source constraint failure rolls back underlying snapshot, audit, receipt and state',async()=>{
   const other=await create();await admin.query("CREATE FUNCTION synthetic_review_ci.provenance_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional provenance failure'; END $$");
   const totals=async()=>{const counts={};for(const table of ['report_audit','report_copy','report_sources'])counts[table]=(await admin.query(`SELECT count(*)::int AS n FROM synthetic_review_ci.${table}`)).rows[0].n;return counts;};
   const before=await totals();
   await admin.query('CREATE TRIGGER injected_failure BEFORE INSERT ON synthetic_review_ci.report_sources FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.provenance_failure()');
   try{assert.deepEqual(await submit(other,{m:'100000000000000012'}),denied);
    for(const table of ['report_snapshots','report_receipts','report_state'])assert.equal((await admin.query(`SELECT count(*)::int AS n FROM synthetic_review_ci.${table} WHERE record_id=$1`,[other])).rows[0].n,0);
    assert.deepEqual(await totals(),before);
   }finally{await admin.query('DROP TRIGGER injected_failure ON synthetic_review_ci.report_sources');}
  });
  await t.test('competing records submitting one source commit at most one report',async()=>{
   const ids=await Promise.all([create(),create()]);const replies=await Promise.all(ids.map(i=>submit(i,{m:'100000000000000013'})));
   assert.equal(replies.filter(r=>r.ok).length,1);assert.deepEqual(replies.find(r=>!r.ok),conflict);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=ANY($1::uuid[])',[ids])).rows[0].n,1);
  });
  await t.test('revoked assignment denies prior receipt and current reads',async()=>{
   await admin.query('UPDATE synthetic_review_ci.assignments SET active=false WHERE actor=$1',['demo-learner']);
   try{assert.deepEqual(await receipt(id),denied);assert.deepEqual(await read(id,s.reportId),denied);}finally{await admin.query('UPDATE synthetic_review_ci.assignments SET active=true WHERE actor=$1',['demo-learner']);}
  });
  await t.test('worker cannot access raw provenance, internal envelope or old mutation function',async()=>{
   for(const sql of ['SELECT * FROM synthetic_review_ci.report_sources',`SELECT synthetic_review_ci.source_envelope('${id}','${s.reportId}',1)`,`SELECT synthetic_review_ci.apply_report('demo-learner','demo-workspace','demo-ethical-hacking','demo-first-practical','${id}',0,'demo-bypass','submit','Fictional',NULL,NULL)`])await assert.rejects(worker.query(sql),e=>e.code==='42501');
  });
  await t.test('deadline denies read, receipt, submission replay and review',async()=>{
   await admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[id,'demo-reviewer']);
   const at=(await admin.query('SELECT (extract(epoch FROM at_time)*1000)::bigint AS ms FROM synthetic_review_ci.report_clock')).rows[0].ms;
   await advance(s.expiresAtMs-Number(at)-1);assert.equal((await read(id,s.reportId)).ok,true);await advance(1);
   assert.deepEqual(await read(id,s.reportId),denied);assert.deepEqual(await receipt(id),denied);assert.deepEqual(await submit(id),denied);
   assert.deepEqual(await call('review_source_report',['demo-reviewer',...ctx,id,1,'demo-review','Fictional feedback.','review-recorded',s.reportId]),denied);
   await advance(1);assert.deepEqual(await receipt(id),denied);
  });
  await t.test('review wrapper preserves provenance and deadline across success, retry, conflict and revocation',async()=>{
   const record=await create();const submitted=await submit(record,{m:'100000000000000014'});assert.equal(submitted.ok,true);
   const review=(actor='demo-reviewer',body='Fictional wrapper feedback.')=>call('review_source_report',[actor,...ctx,record,1,'demo-review-wrapper',body,'changes-requested',submitted.reportId]);
   await admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[record,'demo-reviewer']);
   assert.deepEqual(await review('demo-learner'),denied);assert.deepEqual(await review('demo-other'),denied);
   const result=await review();assert.equal(result.ok,true);assert.equal(result.revision,2);
   for(const field of ['reportId','recordId','learnerId','digest','submittedAtMs','expiresAtMs','sourceGuildId','sourceChannelId','sourceMessageId','sourceCreatedAtMs'])assert.equal(result[field],submitted[field]);
   await advance(1000);assert.deepEqual(await review(),result);assert.deepEqual(await review('demo-reviewer','Changed fictional feedback.'),conflict);
   assert.deepEqual(await receipt(record),submitted);assert.equal((await read(record,submitted.reportId)).body,'Fictional source report.');
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_feedback WHERE report_id=$1',[submitted.reportId])).rows[0].n,1);
   await admin.query('UPDATE synthetic_review_ci.reviewers SET active=false WHERE record_id=$1',[record]);assert.deepEqual(await review(),denied);
  });
  await t.test('provenance purge failure rolls back cascades; retry removes only the expired report',async()=>{
   const record=await create();const first=await submit(record,{m:'100000000000000016'});assert.equal(first.ok,true);
   await admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[record,'demo-reviewer']);
   assert.equal((await call('review_source_report',['demo-reviewer',...ctx,record,1,'demo-purge-review','Fictional revision request.','changes-requested',first.reportId])).ok,true);
   await advance(1000);const second=await submit(record,{v:2,k:'demo-newer',m:'100000000000000017',body:'Fictional newer source report.'});assert.equal(second.ok,true);
   const now=Number((await admin.query('SELECT (extract(epoch FROM at_time)*1000)::bigint AS ms FROM synthetic_review_ci.report_clock')).rows[0].ms);await advance(first.expiresAtMs-now);
   const purge=()=>call('purge_report',[first.reportId],admin);assert.deepEqual(await purge(),{ok:false,reason:'deletion-pending'});
   await admin.query("UPDATE synthetic_review_ci.report_copy SET state='confirmed' WHERE report_id=$1",[first.reportId]);
   const counts=async()=>{const result={};for(const table of ['report_snapshots','report_sources','report_feedback','report_audit','report_receipts','report_copy'])result[table]=(await admin.query(`SELECT count(*)::int AS n FROM synthetic_review_ci.${table} WHERE ${table==='report_snapshots'?'id':'report_id'}=$1`,[first.reportId])).rows[0].n;return result;};
   const before=await counts();assert.equal(before.report_sources,1);assert.equal(before.report_receipts,2);
   await admin.query('CREATE TRIGGER injected_delete_failure BEFORE DELETE ON synthetic_review_ci.report_sources FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.provenance_failure()');
   try{assert.deepEqual(await purge(),denied);assert.deepEqual(await counts(),before);assert.deepEqual(await read(record,first.reportId),denied);assert.equal((await read(record,second.reportId)).ok,true);}
   finally{await admin.query('DROP TRIGGER injected_delete_failure ON synthetic_review_ci.report_sources');}
   assert.deepEqual(await purge(),{ok:true,outcome:'deleted'});for(const n of Object.values(await counts()))assert.equal(n,0);
   assert.equal(await receipt(record),null);assert.deepEqual(await receipt(record,'demo-newer'),second);assert.equal((await read(record,second.reportId)).body,'Fictional newer source report.');
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_sources WHERE report_id=$1',[second.reportId])).rows[0].n,1);
   assert.equal((await admin.query('SELECT current_report FROM synthetic_review_ci.report_state WHERE record_id=$1',[record])).rows[0].current_report,second.reportId);
   assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.records WHERE id=$1',[record])).rows[0].n,1);
   assert.equal((await admin.query('SELECT active FROM synthetic_review_ci.assignments WHERE actor=$1',['demo-learner'])).rows[0].active,true);
  });
 }finally{
  try{if(worker)await worker.end();}finally{try{if(installed){await admin.query('DROP SCHEMA synthetic_review_ci CASCADE');await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}finally{await admin.end();}}
 }
});
