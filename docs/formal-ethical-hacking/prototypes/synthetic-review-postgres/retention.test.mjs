import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
function profile(env) {
  const deny=()=>{throw new Error('Explicit disposable retention CI required');};
  if(env.GITHUB_ACTIONS!=='true'||env.SYNTHETIC_REVIEW_CI!=='true'||env.DATABASE_URL||!['16','18'].includes(env.SYNTHETIC_PG_MAJOR))deny();
  let u;try{u=new URL(env.SYNTHETIC_REVIEW_DATABASE_URL);}catch{deny();}
  if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/synthetic_review_test'||
    u.username!=='synthetic_review_admin'||u.password!=='ci-disposable-only'||u.search||u.hash)deny();
  return u.href;
}
const good={GITHUB_ACTIONS:'true',SYNTHETIC_REVIEW_CI:'true',SYNTHETIC_PG_MAJOR:'16',
  SYNTHETIC_REVIEW_DATABASE_URL:'postgresql://synthetic_review_admin:ci-disposable-only@127.0.0.1:5432/synthetic_review_test'};
test('offline retention guard accepts the owned disposable profile',()=>assert.equal(profile(good),good.SYNTHETIC_REVIEW_DATABASE_URL));
test('offline retention guard rejects missing opt-ins, ambient URLs and unexpected versions',()=>{
  for(const patch of [{GITHUB_ACTIONS:''},{SYNTHETIC_REVIEW_CI:''},{SYNTHETIC_PG_MAJOR:'17'},{DATABASE_URL:'postgresql://example.invalid/live'},
    {SYNTHETIC_REVIEW_DATABASE_URL:undefined}])assert.throws(()=>profile({...good,...patch}),/Explicit disposable/);
});
test('offline retention guard rejects alternate endpoints, identities and options',()=>{
  for(const [key,value] of [['hostname','example.invalid'],['port','5433'],['pathname','/academy'],['username','postgres'],
    ['password','other'],['search','?options=-csearch_path=public'],['hash','#other']]) {
    const u=new URL(good.SYNTHETIC_REVIEW_DATABASE_URL);u[key]=value;
    assert.throws(()=>profile({...good,SYNTHETIC_REVIEW_DATABASE_URL:u.href}),/Explicit disposable/);
  }
  assert.throws(()=>profile({...good,SYNTHETIC_REVIEW_DATABASE_URL:'https://example.invalid'}),/Explicit disposable/);
});

test('integrated submission retention in disposable PostgreSQL',{timeout:120000},async t=>{
  const url=profile(process.env);const {default:pg}=await import('pg');
  const options='-c search_path=pg_catalog -c statement_timeout=10000 -c lock_timeout=5000';
  const admin=new pg.Pool({connectionString:url,max:4,options,connectionTimeoutMillis:5000});
  let worker,installed=false;
  const ctx=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
  const denied={ok:false,reason:'unavailable'},conflict={ok:false,reason:'conflict'};
  const call=async(name,args,pool=worker)=>(await pool.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
  const create=(actor='demo-learner',scope=ctx)=>call('create_record',[actor,...scope]);
  const grant=id=>admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[id,'demo-reviewer']);
  const submit=(id,v=0,key='demo-submit',body='Fictional original report.',actor='demo-learner',scope=ctx)=>
    call('apply_report',[actor,...scope,id,v,key,'submit',body,null,null]);
  const review=(id,s,v=1,key='demo-review',decision='changes-requested',body='Fictional feedback.',actor='demo-reviewer')=>
    call('apply_report',[actor,...ctx,id,v,key,'review',body,decision,s]);
  const read=(id,s,actor='demo-learner',scope=ctx)=>call('read_report',[actor,...scope,id,s]);
  const advance=ms=>admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=at_time+($1::double precision*interval '1 millisecond')",[ms]);
  const newRecord=async()=>{await advance(172800000);const r=await create();assert.equal(r.ok,true);return r.id;};
  const purge=s=>call('purge_report',[s],admin);
  const confirm=s=>admin.query("UPDATE synthetic_review_ci.report_copy SET state='confirmed' WHERE report_id=$1",[s]);
  const count=async(table,s)=>(await admin.query(`SELECT count(*)::int AS n FROM synthetic_review_ci.${table} WHERE ${table==='report_snapshots'?'id':'report_id'}=$1`,[s])).rows[0].n;
  const state=async id=>(await admin.query('SELECT * FROM synthetic_review_ci.report_state WHERE record_id=$1',[id])).rows[0];
  try {
    const identity=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version")).rows[0];
    assert.equal(identity.db,'synthetic_review_test');assert.equal(identity.actor,'synthetic_review_admin');
    assert.equal(Math.floor(identity.version/10000),Number(process.env.SYNTHETIC_PG_MAJOR));
    assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
    await admin.query(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));installed=true;
    await admin.query(await readFile(new URL('./retention-fixture.sql',import.meta.url),'utf8'));
    await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true),($5,$2,$3,$4,true)',['demo-learner',...ctx,'demo-other']);
    const u=new URL(url);u.username='synthetic_review_worker';u.password='ci-worker-only';
    worker=new pg.Pool({connectionString:u.href,max:4,options,connectionTimeoutMillis:5000});
    await t.test('worker cannot reach raw tables, clock, purge or old bypass routes',async()=>{
      for(const sql of ['SELECT * FROM synthetic_review_ci.report_snapshots','UPDATE synthetic_review_ci.report_clock SET at_time=NOW()',
        'SELECT synthetic_review_ci.fixture_now()', 'SELECT synthetic_review_ci.purge_report(gen_random_uuid())',
        "SELECT synthetic_review_ci.read_record('demo-learner','x','x','x',gen_random_uuid())",
        "SELECT synthetic_review_ci.mutate('demo-learner','x','x','x',gen_random_uuid(),0,'demo-x','submit','x',NULL)",
        'CREATE TEMP TABLE blocked(id int)'])await assert.rejects(worker.query(sql),e=>e.code==='42501');
    });
    await t.test('database clock supplies submission time and exact 24-hour deadline',async()=>{
      const id=await newRecord();const at=(await admin.query('SELECT at_time FROM synthetic_review_ci.report_clock')).rows[0].at_time;
      const s=await submit(id);assert.equal(s.ok,true);assert.equal(Date.parse(s.submittedAt),at.getTime());
      assert.equal(Date.parse(s.expiresAt)-Date.parse(s.submittedAt),86400000);
      assert.equal((await read(id,s.reportId)).report.body,'Fictional original report.');
      assert.equal((await admin.query('SELECT evidence,feedback FROM synthetic_review_ci.records WHERE id=$1',[id])).rows[0].evidence,null);
    });
    await t.test('snapshots and feedback cannot be updated, even by the ordinary fixture owner path',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);await review(id,s.reportId);
      await assert.rejects(admin.query("UPDATE synthetic_review_ci.report_snapshots SET body='changed' WHERE id=$1",[s.reportId]),e=>e.code==='P0001');
      await assert.rejects(admin.query("UPDATE synthetic_review_ci.report_feedback SET body='changed' WHERE report_id=$1",[s.reportId]),e=>e.code==='P0001');
      assert.equal((await read(id,s.reportId)).report.body,'Fictional original report.');
    });
    await t.test('reads, review and receipt replay reject expiry exactly at the deadline',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);
      await advance(86399999);assert.equal((await read(id,s.reportId)).ok,true);assert.deepEqual(await submit(id),s);
      await advance(1);assert.deepEqual(await read(id,s.reportId),denied);assert.deepEqual(await read(id,s.reportId,'demo-reviewer'),denied);
      assert.deepEqual(await submit(id),denied);assert.deepEqual(await review(id,s.reportId),denied);
      assert.equal((await state(id)).revision,1);await advance(1);assert.deepEqual(await read(id,s.reportId),denied);
    });
    await t.test('feedback does not restart expiry; later submissions retain independent windows',async()=>{
      const id=await newRecord();await grant(id);const first=await submit(id);await advance(43200000);
      const feedback=await review(id,first.reportId);assert.equal(feedback.expiresAt,first.expiresAt);
      const second=await submit(id,2,'demo-second','Fictional revised report.');assert.equal(second.revision,3);
      assert.equal(Date.parse(second.expiresAt)-Date.parse(first.expiresAt),43200000);
      assert.equal((await read(id,first.reportId)).report.body,'Fictional original report.');
      await advance(43200000);assert.deepEqual(await read(id,first.reportId),denied);
      assert.equal((await read(id,second.reportId)).report.body,'Fictional revised report.');
    });
    await t.test('retries preserve the stored timestamp; changed commands conflict',async()=>{
      const id=await newRecord();const s=await submit(id);await advance(1000);
      assert.deepEqual(await submit(id),s);assert.deepEqual(await submit(id,0,'demo-submit','Different fictional report.'),conflict);
      assert.equal(await count('report_snapshots',s.reportId),1);assert.equal(await count('report_receipts',s.reportId),1);
      assert.equal((await state(id)).revision,1);
    });
    await t.test('concurrent identical retries create only one report; competing revisions conflict',async()=>{
      const id=await newRecord();const same=await Promise.all([submit(id),submit(id)]);assert.equal(same[0].ok,true);assert.deepEqual(same[0],same[1]);
      const other=await newRecord();const results=await Promise.all([submit(other,0,'demo-a'),submit(other,0,'demo-b')]);
      assert.equal(results.filter(x=>x.ok).length,1);assert.deepEqual(results.find(x=>!x.ok),conflict);
      assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[other])).rows[0].n,1);
    });
    await t.test('scoped authority denies other learners, records, courses and self-review',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);
      assert.deepEqual(await read(id,s.reportId,'demo-other'),denied);
      assert.deepEqual(await submit(id,1,'demo-other','Fictional report.','demo-other'),denied);
      assert.deepEqual(await read(id,s.reportId,'demo-learner',[ctx[0],'formal-ethical-hacking',ctx[2]]),denied);
      const other=await create('demo-other');const otherReport=await submit(other.id,0,'demo-other','Fictional other report.','demo-other');
      assert.equal(otherReport.ok,true);assert.deepEqual(await read(id,otherReport.reportId),denied);
      assert.deepEqual(await read(other.id,otherReport.reportId,'demo-reviewer'),denied);
      assert.deepEqual(await review(id,s.reportId,1,'demo-self','review-recorded','Fictional review.','demo-learner'),denied);
    });
    await t.test('revoked assignment/reviewer cannot read or replay prior success',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);await review(id,s.reportId);
      await admin.query('UPDATE synthetic_review_ci.reviewers SET active=false WHERE record_id=$1',[id]);
      assert.deepEqual(await read(id,s.reportId,'demo-reviewer'),denied);assert.deepEqual(await review(id,s.reportId),denied);
      try{await admin.query('UPDATE synthetic_review_ci.assignments SET active=false WHERE actor=$1',['demo-learner']);
        assert.deepEqual(await read(id,s.reportId),denied);assert.deepEqual(await submit(id),denied);
      }finally{await admin.query('UPDATE synthetic_review_ci.assignments SET active=true WHERE actor=$1',['demo-learner']);}
    });
    await t.test('stale and concurrent reviews cannot overwrite another revision',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);
      assert.deepEqual(await review(id,s.reportId,0),conflict);
      const replies=await Promise.all([review(id,s.reportId,1,'demo-a'),review(id,s.reportId,1,'demo-b','review-recorded')]);
      assert.equal(replies.filter(x=>x.ok).length,1);assert.deepEqual(replies.find(x=>!x.ok),conflict);
      assert.equal(await count('report_feedback',s.reportId),1);
    });
    await t.test('limits reject empty, oversized and excessive UTF-8 reports without a snapshot',async()=>{
      for(const body of ['', '   ', 'x'.repeat(4097),'😀'.repeat(2049)]) {
        const id=await newRecord();assert.deepEqual(await submit(id,0,'demo-limit',body),denied);
        assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[id])).rows[0].n,0);
      }
      const id=await newRecord();assert.equal((await submit(id,0,'demo-limit','😀'.repeat(2048))).ok,true);
    });
    await t.test('receipt and audit failures atomically roll back reports, state and copies',async()=>{
      await admin.query("CREATE FUNCTION synthetic_review_ci.retention_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional failure'; END $$");
      for(const table of ['report_audit','report_receipts']) {
        const id=await newRecord();await admin.query(`CREATE TRIGGER injected_failure BEFORE INSERT ON synthetic_review_ci.${table} FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.retention_failure()`);
        try{assert.deepEqual(await submit(id),denied);
          assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.report_snapshots WHERE record_id=$1',[id])).rows[0].n,0);
          assert.equal(await state(id),undefined);
        }finally{await admin.query(`DROP TRIGGER injected_failure ON synthetic_review_ci.${table}`);}
      }
    });
    await t.test('expiry denial survives a new client connection using stored deadlines',async()=>{
      const id=await newRecord();const s=await submit(id);await advance(86400000);
      const fresh=new pg.Client({connectionString:u.href,options});await fresh.connect();
      try{assert.deepEqual(await call('read_report',['demo-learner',...ctx,id,s.reportId],fresh),denied);}
      finally{await fresh.end();}
    });
    await t.test('not-due and pending/failed copy outcomes never claim deletion',async()=>{
      const id=await newRecord();const s=await submit(id);
      assert.deepEqual(await purge(s.reportId),{ok:false,reason:'not-due'});await advance(86400000);
      assert.deepEqual(await purge(s.reportId),{ok:false,reason:'deletion-pending'});
      await admin.query("UPDATE synthetic_review_ci.report_copy SET state='failed' WHERE report_id=$1",[s.reportId]);
      assert.deepEqual(await purge(s.reportId),{ok:false,reason:'deletion-pending'});
      assert.equal(await count('report_snapshots',s.reportId),1);assert.deepEqual(await read(id,s.reportId),denied);
    });
    await t.test('purging an expired report removes only its dependent data, not a newer report or assignment',async()=>{
      const id=await newRecord();await grant(id);const first=await submit(id);await review(id,first.reportId);
      await advance(43200000);const second=await submit(id,2,'demo-second','Fictional newer report.');await advance(43200000);
      await confirm(first.reportId);assert.deepEqual(await purge(first.reportId),{ok:true,outcome:'deleted'});
      for(const table of ['report_snapshots','report_feedback','report_audit','report_receipts','report_copy'])assert.equal(await count(table,first.reportId),0);
      assert.equal((await read(id,second.reportId)).ok,true);assert.equal((await state(id)).current_report,second.reportId);
      assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.records WHERE id=$1',[id])).rows[0].n,1);
      assert.equal((await admin.query('SELECT active FROM synthetic_review_ci.assignments WHERE actor=$1',['demo-learner'])).rows[0].active,true);
      assert.deepEqual(await purge(first.reportId),{ok:true,outcome:'absent'});assert.equal((await submit(id)).ok,false);
    });
    await t.test('database deletion failure rolls back cascades and preserves a retryable failure',async()=>{
      const id=await newRecord();await grant(id);const s=await submit(id);await review(id,s.reportId);await advance(86400000);await confirm(s.reportId);
      await admin.query('CREATE TRIGGER injected_delete_failure BEFORE DELETE ON synthetic_review_ci.report_feedback FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.retention_failure()');
      try{assert.deepEqual(await purge(s.reportId),denied);
        for(const table of ['report_snapshots','report_feedback','report_copy'])assert.equal(await count(table,s.reportId),1);
        assert.equal(await count('report_receipts',s.reportId),2);assert.equal((await state(id)).current_report,s.reportId);
      }finally{await admin.query('DROP TRIGGER injected_delete_failure ON synthetic_review_ci.report_feedback');}
      assert.deepEqual(await purge(s.reportId),{ok:true,outcome:'deleted'});assert.equal((await state(id)).current_report,null);
      assert.equal((await state(id)).revision,2);
    });
    await t.test('missing or backwards fixture clock fails closed without changing report data',async()=>{
      const id=await newRecord();const s=await submit(id);
      await assert.rejects(admin.query("UPDATE synthetic_review_ci.report_clock SET at_time=at_time-interval '1 second'"),e=>e.code==='P0001');
      const clock=(await admin.query('SELECT at_time FROM synthetic_review_ci.report_clock')).rows[0].at_time;
      try{await admin.query('DELETE FROM synthetic_review_ci.report_clock');assert.deepEqual(await read(id,s.reportId),denied);assert.deepEqual(await submit(id),denied);}
      finally{await admin.query('INSERT INTO synthetic_review_ci.report_clock VALUES(true,$1)',[clock]);}
      assert.equal((await read(id,s.reportId)).ok,true);
    });
  }finally{
    try{if(worker)await worker.end();}finally{
      try{if(installed){await admin.query('DROP SCHEMA synthetic_review_ci CASCADE');await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}
      finally{await admin.end();}
    }
  }
});
