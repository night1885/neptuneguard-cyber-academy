import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// No ambient DATABASE_URL fallback. Validate before importing pg or opening a socket.
function ciURL(env) {
  const deny=()=>{throw new Error('Explicit disposable synthetic CI configuration required');};
  if(env.SYNTHETIC_REVIEW_CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.DATABASE_URL||
    !['16','18'].includes(env.SYNTHETIC_PG_MAJOR)) deny();
  let u; try {u=new URL(env.SYNTHETIC_REVIEW_DATABASE_URL);} catch {deny();}
  if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/synthetic_review_test'||u.username!=='synthetic_review_admin'||
    u.password!=='ci-disposable-only'||u.search||u.hash) deny();
  return u.href;
}
const GOOD={SYNTHETIC_REVIEW_CI:'true',GITHUB_ACTIONS:'true',SYNTHETIC_PG_MAJOR:'16',
  SYNTHETIC_REVIEW_DATABASE_URL:'postgresql://synthetic_review_admin:ci-disposable-only@127.0.0.1:5432/synthetic_review_test'};
test('offline guard accepts only the explicit disposable profile',()=>assert.equal(ciURL(GOOD),GOOD.SYNTHETIC_REVIEW_DATABASE_URL));
test('offline guard rejects missing opt-ins, ambient live URLs and unsupported versions',()=>{
  for(const patch of [{SYNTHETIC_REVIEW_CI:''},{GITHUB_ACTIONS:''},{SYNTHETIC_PG_MAJOR:'17'},
    {DATABASE_URL:'postgresql://example.invalid/live'},{SYNTHETIC_REVIEW_DATABASE_URL:undefined}])
    assert.throws(()=>ciURL({...GOOD,...patch}),/Explicit disposable/);
});
test('offline guard rejects alternate hosts, ports, credentials, databases and URL options',()=>{
  for(const [key,value] of [['hostname','example.invalid'],['port','5433'],['username','postgres'],
    ['password','other'],['pathname','/academy'],['search','?options=-csearch_path=public'],['hash','#other']]) {
    const u=new URL(GOOD.SYNTHETIC_REVIEW_DATABASE_URL);u[key]=value;
    assert.throws(()=>ciURL({...GOOD,SYNTHETIC_REVIEW_DATABASE_URL:u.href}),/Explicit disposable/);
  }
  assert.throws(()=>ciURL({...GOOD,SYNTHETIC_REVIEW_DATABASE_URL:GOOD.SYNTHETIC_REVIEW_DATABASE_URL.replace('postgresql:','https:')}),/Explicit disposable/);
});

test('disposable synthetic PostgreSQL integration',{timeout:120000},async t=>{
  const connectionString=ciURL(process.env);
  const {default:pg}=await import('pg');
  const options='-c statement_timeout=10000 -c lock_timeout=5000 -c search_path=pg_catalog';
  const admin=new pg.Pool({connectionString,max:4,connectionTimeoutMillis:5000,options});
  let worker,installed=false;
  const ctx=['demo-workspace','demo-ethical-hacking','demo-first-practical'];
  const denied={ok:false,reason:'unavailable'}, conflict={ok:false,reason:'conflict'};
  const call=async(name,args)=>(await worker.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args)).rows[0].result;
  const create=(actor='demo-learner',scope=ctx)=>call('create_record',[actor,...scope]);
  const read=(id,actor='demo-learner',scope=ctx)=>call('read_record',[actor,...scope,id]);
  const mutate=(id,v,k='demo-submit',actor='demo-learner',op='submit',body='Fictional lab observation.',decision=null,scope=ctx)=>
    call('mutate',[actor,...scope,id,v,k,op,body,decision]);
  const grant=id=>admin.query('INSERT INTO synthetic_review_ci.reviewers VALUES($1,$2,true)',[id,'demo-reviewer']);
  const counts=async id=>(await admin.query(`SELECT
    (SELECT count(*)::int FROM synthetic_review_ci.audit WHERE record_id=$1) AS audit,
    (SELECT count(*)::int FROM synthetic_review_ci.receipts WHERE record_id=$1) AS receipts`,[id])).rows[0];
  try {
    const identity=(await admin.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int AS version")).rows[0];
    assert.equal(identity.db,'synthetic_review_test');assert.equal(identity.actor,'synthetic_review_admin');
    assert.equal((await admin.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
    assert.equal(Math.floor(identity.version/10000),Number(process.env.SYNTHETIC_PG_MAJOR));
    await admin.query(await readFile(new URL('./fixture.sql',import.meta.url),'utf8'));installed=true;
    await admin.query('INSERT INTO synthetic_review_ci.assignments VALUES($1,$2,$3,$4,true),($5,$2,$3,$4,true)',
      ['demo-learner',...ctx,'demo-other']);
    const u=new URL(connectionString);u.username='synthetic_review_worker';u.password='ci-worker-only';
    worker=new pg.Pool({connectionString:u.href,max:4,connectionTimeoutMillis:5000,options,application_name:'synthetic-review-worker'});
    await t.test('restricted worker has no direct tables, DDL, helper function or elevated role access',async()=>{
      const row=(await worker.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
      assert.ok(Object.values(row).every(value=>value===false));
      for(const sql of ['SELECT * FROM synthetic_review_ci.records','SELECT * FROM synthetic_review_ci.audit','SELECT * FROM synthetic_review_ci.receipts','CREATE TEMP TABLE blocked_temp(id int)',
        'UPDATE synthetic_review_ci.assignments SET active=false','CREATE TABLE public.blocked(id int)',
        "SELECT synthetic_review_ci.lock_authorized('demo-learner','x','x','x',gen_random_uuid(),'read')"])
        await assert.rejects(worker.query(sql),error=>error.code==='42501');
    });
    await t.test('current assignment required; actual formal namespace and other scope denied',async()=>{
      assert.deepEqual(await create('demo-unknown'),denied);
      for(const scope of [['other-workspace',ctx[1],ctx[2]],[ctx[0],'formal-ethical-hacking',ctx[2]],[ctx[0],ctx[1],'other-exercise']])
        assert.deepEqual(await create('demo-learner',scope),denied);
    });
    await t.test('revision 0 through 4 lifecycle and durable read from another connection',async()=>{
      const r=await create();assert.equal(r.revision,0);await grant(r.id);
      assert.equal((await mutate(r.id,0)).status,'submitted');
      assert.equal((await mutate(r.id,1,'demo-review','demo-reviewer','review','Fictional correction.','changes-requested')).revision,2);
      assert.equal((await mutate(r.id,2,'demo-resubmit')).revision,3);
      assert.equal((await mutate(r.id,3,'demo-final','demo-reviewer','review','Fictional review.','review-recorded')).revision,4);
      const separate=new pg.Client({connectionString:u.href,options});await separate.connect();
      try {const result=(await separate.query('SELECT synthetic_review_ci.read_record($1,$2,$3,$4,$5) AS result',['demo-learner',...ctx,r.id])).rows[0].result;
        assert.equal(result.record.revision,4);assert.equal(result.record.status,'review-recorded');}
      finally {await separate.end();}
      assert.deepEqual(await counts(r.id),{audit:5,receipts:4});
    });
    await t.test('cross-learner, cross-workspace and unassigned reviewer access denied',async()=>{
      const r=await create();assert.deepEqual(await read(r.id,'demo-other'),denied);
      assert.deepEqual(await read(r.id,'demo-reviewer'),denied);
      assert.deepEqual(await read(r.id,'demo-learner',['other-workspace',...ctx.slice(1)]),denied);
      assert.deepEqual(await mutate(r.id,0,'demo-other','demo-other'),denied);
      await grant(r.id);assert.equal((await read(r.id,'demo-reviewer')).ok,true);
      const other=await create('demo-other');assert.deepEqual(await read(other.id,'demo-reviewer'),denied);
    });
    await t.test('self-review and invalid transitions denied',async()=>{
      const r=await create();await grant(r.id);
      assert.deepEqual(await mutate(r.id,0,'demo-early','demo-reviewer','review','Fictional feedback.','review-recorded'),denied);
      await mutate(r.id,0);
      assert.deepEqual(await mutate(r.id,1,'demo-self','demo-learner','review','Fictional feedback.','review-recorded'),denied);
      assert.deepEqual(await mutate(r.id,1,'demo-double'),denied);
    });
    await t.test('identical retries return original receipt; changed payload conflicts',async()=>{
      const r=await create();const reply=await mutate(r.id,0);
      assert.deepEqual(await mutate(r.id,0),reply);
      assert.deepEqual(await mutate(r.id,0,'demo-submit','demo-learner','submit','Changed fictional report.'),conflict);
      assert.deepEqual(await counts(r.id),{audit:2,receipts:1});
    });
    await t.test('concurrent same-revision submissions serialize without overwrite',async()=>{
      const r=await create();const results=await Promise.all([mutate(r.id,0,'demo-race-a'),mutate(r.id,0,'demo-race-b')]);
      assert.equal(results.filter(x=>x.ok).length,1);assert.deepEqual(results.find(x=>!x.ok),conflict);
      assert.deepEqual(await counts(r.id),{audit:2,receipts:1});
    });
    await t.test('concurrent identical retries produce one transition and one receipt',async()=>{
      const r=await create();const results=await Promise.all([mutate(r.id,0),mutate(r.id,0)]);
      assert.equal(results[0].ok,true);assert.deepEqual(results[0],results[1]);
      assert.deepEqual(await counts(r.id),{audit:2,receipts:1});
    });
    await t.test('concurrent reviews cannot overwrite one another',async()=>{
      const r=await create();await grant(r.id);await mutate(r.id,0);
      const results=await Promise.all([
        mutate(r.id,1,'demo-review-a','demo-reviewer','review','Fictional A.','changes-requested'),
        mutate(r.id,1,'demo-review-b','demo-reviewer','review','Fictional B.','review-recorded')]);
      assert.equal(results.filter(x=>x.ok).length,1);assert.deepEqual(results.find(x=>!x.ok),conflict);
      assert.equal((await read(r.id)).record.revision,2);assert.deepEqual(await counts(r.id),{audit:3,receipts:2});
    });
    await t.test('historical receipt replay is not a current-state read',async()=>{
      const r=await create();await grant(r.id);const original=await mutate(r.id,0);
      await mutate(r.id,1,'demo-request-change','demo-reviewer','review','Fictional correction.','changes-requested');
      assert.deepEqual(await mutate(r.id,0),original);
      assert.equal((await read(r.id)).record.revision,2);
    });
    await t.test('stale review conflicts; revoked reviewer cannot replay cached success',async()=>{
      const r=await create();await grant(r.id);await mutate(r.id,0);
      assert.deepEqual(await mutate(r.id,0,'demo-stale','demo-reviewer','review','Fictional review.','review-recorded'),conflict);
      const args=[r.id,1,'demo-done','demo-reviewer','review','Fictional review.','review-recorded'];
      assert.equal((await mutate(...args)).ok,true);
      await admin.query('UPDATE synthetic_review_ci.reviewers SET active=false WHERE record_id=$1',[r.id]);
      assert.deepEqual(await mutate(...args),denied);assert.deepEqual(await read(r.id,'demo-reviewer'),denied);
    });
    await t.test('revocation committed while authorization waits is observed',async()=>{
      const r=await create();await grant(r.id);await mutate(r.id,0);
      const blocker=await admin.connect();let pending;
      try {
        await blocker.query('BEGIN');await blocker.query('UPDATE synthetic_review_ci.reviewers SET active=false WHERE record_id=$1',[r.id]);
        pending=read(r.id,'demo-reviewer');
        const deadline=Date.now()+3000;let blocked=false;
        while(Date.now()<deadline) {
          blocked=(await admin.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='synthetic-review-worker' AND wait_event_type='Lock') AS blocked")).rows[0].blocked;
          if(blocked)break;await delay(10);
        }
        assert.equal(blocked,true,'Expected authorization to wait on locked authority row');
        await blocker.query('COMMIT');assert.deepEqual(await pending,denied);
      } finally {await blocker.query('ROLLBACK');blocker.release();if(pending)await pending;}
    });
    await t.test('assignment revocation denies learner and reviewer, including cached retries',async()=>{
      const r=await create();await grant(r.id);await mutate(r.id,0);
      try {
        await admin.query('UPDATE synthetic_review_ci.assignments SET active=false WHERE actor=$1',['demo-learner']);
        assert.deepEqual(await read(r.id),denied);assert.deepEqual(await read(r.id,'demo-reviewer'),denied);
        assert.deepEqual(await mutate(r.id,0),denied);
      } finally {await admin.query('UPDATE synthetic_review_ci.assignments SET active=true WHERE actor=$1',['demo-learner']);}
    });
    await t.test('text limits apply independently to characters and UTF-8 bytes',async()=>{
      for(const text of ['', '   ', 'x'.repeat(4097), '😀'.repeat(2049)]) {
        const r=await create();assert.deepEqual(await mutate(r.id,0,'demo-limit','demo-learner','submit',text),denied);
        assert.deepEqual(await counts(r.id),{audit:1,receipts:0});
      }
      for(const text of ['x'.repeat(4096),'😀'.repeat(2048)]) {
        const r=await create();assert.equal((await mutate(r.id,0,'demo-limit','demo-learner','submit',text)).ok,true);
      }
    });
    await t.test('audit or receipt insertion failure rolls back state and all companion writes',async()=>{
      await admin.query("CREATE FUNCTION synthetic_review_ci.inject_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional injected failure'; END $$");
      for(const table of ['audit','receipts']) {
        const r=await create();await admin.query(`CREATE TRIGGER injected_failure BEFORE INSERT ON synthetic_review_ci.${table} FOR EACH ROW EXECUTE FUNCTION synthetic_review_ci.inject_failure()`);
        try {assert.deepEqual(await mutate(r.id,0),denied);assert.equal((await read(r.id)).record.revision,0);
          assert.deepEqual(await counts(r.id),{audit:1,receipts:0});}
        finally {await admin.query(`DROP TRIGGER injected_failure ON synthetic_review_ci.${table}`);}
      }
    });
    await t.test('receipt/audit metadata omit report bodies; fixture deletion cascades',async()=>{
      const r=await create();await grant(r.id);await mutate(r.id,0);
      const metadata=(await admin.query('SELECT to_jsonb(a) AS data FROM synthetic_review_ci.audit a WHERE record_id=$1 UNION ALL SELECT to_jsonb(b) FROM synthetic_review_ci.receipts b WHERE record_id=$1',[r.id])).rows;
      assert.equal(JSON.stringify(metadata).includes('Fictional lab observation.'),false);
      await admin.query('DELETE FROM synthetic_review_ci.records WHERE id=$1',[r.id]);
      assert.deepEqual(await counts(r.id),{audit:0,receipts:0});assert.deepEqual(await read(r.id),denied);
      assert.equal((await admin.query('SELECT count(*)::int AS n FROM synthetic_review_ci.reviewers WHERE record_id=$1',[r.id])).rows[0].n,0);
    });
  } finally {
    try {if(worker)await worker.end();}
    finally {
      try {if(installed){await admin.query('DROP SCHEMA synthetic_review_ci CASCADE');await admin.query('DROP OWNED BY synthetic_review_worker');await admin.query('DROP ROLE synthetic_review_worker');}}
      finally {await admin.end();}
    }
  }
});
