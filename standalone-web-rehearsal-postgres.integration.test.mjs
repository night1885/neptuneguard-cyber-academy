import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createWebReviewPostgresStore} from './standalone-web-rehearsal-postgres.mjs';
const runChild=promisify(execFile);
const fixtureURL='postgresql://web_review_ci_owner:ci-disposable-only@127.0.0.1:5432/ng_web_review_ci';
const workerURL='postgresql://web_review_ci_worker:ci-synthetic-worker-only@127.0.0.1:5432/ng_web_review_ci';
const profile={enabled:true,reviewOnly:true,syntheticOnly:true,disposableReview:true,guildId:'11111111111111111',contentRevision:'a'.repeat(64),databaseName:'ng_web_review_ci'};
const subject=n=>({actorId:String(22222222222222220n+BigInt(n)),courseKey:'standalone-web-review'});

// Only the exact synthetic loopback CI fixture is accepted; no general DB URL route.
test('disposable PostgreSQL persistence acceptance', {skip:process.env.WEB_REVIEW_DISPOSABLE_CI!=='true',timeout:90000}, async t=>{
  assert.ok(process.env.CI==='true' && process.env.WEB_REVIEW_TEST_DATABASE_URL===fixtureURL,'Exact disposable CI configuration required');
  assert.ok(['16','18'].includes(process.env.WEB_REVIEW_PG_MAJOR),'Explicit PostgreSQL matrix version required');
  const {default:pg}=await import('pg');
  const settings={max:2,connectionTimeoutMillis:5000,idleTimeoutMillis:1000,statement_timeout:5000,query_timeout:7000};
  const owner=new pg.Pool({...settings,connectionString:fixtureURL});
  let worker,peer;
  try {
    const checked=await owner.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num') AS version");
    assert.equal(checked.rows[0].db,'ng_web_review_ci');assert.equal(checked.rows[0].actor,'web_review_ci_owner');
    assert.equal(Math.floor(Number(checked.rows[0].version)/10000),Number(process.env.WEB_REVIEW_PG_MAJOR));
    const schema=await readFile(new URL('./docs/formal-ethical-hacking/authoring/standalone-web-rehearsal-schema.sql',import.meta.url),'utf8');
    await owner.query(schema);
    await owner.query("CREATE ROLE web_review_ci_worker LOGIN PASSWORD 'ci-synthetic-worker-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
    await owner.query('GRANT CONNECT ON DATABASE ng_web_review_ci TO web_review_ci_worker');
    await owner.query('GRANT USAGE ON SCHEMA web_review_progress TO web_review_ci_worker');
    await owner.query('GRANT SELECT, INSERT, UPDATE ON web_review_progress.bookmarks TO web_review_ci_worker');
    worker=new pg.Pool({...settings,connectionString:workerURL});peer=new pg.Pool({...settings,connectionString:workerURL});
    const store=createWebReviewPostgresStore(profile,worker),other=createWebReviewPostgresStore(profile,peer);
    await t.test('worker identity and limited grants',async()=>{
      const r=await worker.query("SELECT current_user AS actor,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,has_schema_privilege(current_user,'web_review_progress','CREATE') AS schema_create,has_table_privilege(current_user,'web_review_progress.bookmarks','DELETE') AS can_delete FROM pg_roles WHERE rolname=current_user");
      assert.equal(r.rows[0].actor,'web_review_ci_worker');
      for(const field of ['rolsuper','rolcreatedb','rolcreaterole','rolbypassrls','schema_create','can_delete']) assert.equal(r.rows[0][field],false);
    });
    await t.test('initial save, duplicate insert and stale update',async()=>{
      const s=subject(1);assert.equal(await store.read(s),null);
      assert.deepEqual(await store.compareAndSet(s,0,'entry'),{outcome:'saved',revision:1});
      assert.deepEqual(await other.compareAndSet(s,0,'http'),{outcome:'conflict'});
      assert.deepEqual(await store.compareAndSet(s,1,'http'),{outcome:'saved',revision:2});
      assert.deepEqual(await other.compareAndSet(s,1,'entry'),{outcome:'conflict'});
      assert.deepEqual(await store.read(s),{pageKey:'http',revision:2});
    });
    await t.test('actor guild course and snapshot boundaries',async()=>{
      const s=subject(2);await store.compareAndSet(s,0,'http');
      assert.equal(await store.read(subject(3)),null);
      assert.equal(await createWebReviewPostgresStore({...profile,guildId:'33333333333333333'},worker).read(s),null);
      assert.equal(await createWebReviewPostgresStore({...profile,contentRevision:'b'.repeat(64)},worker).read(s),null);
      await assert.rejects(store.read({...s,courseKey:'ethical-hacking'}));
    });
    await t.test('concurrent initial saves have one winner',async()=>{
      const s=subject(4),r=await Promise.all([store.compareAndSet(s,0,'entry'),other.compareAndSet(s,0,'http')]);
      assert.deepEqual(r.map(x=>x.outcome).sort(),['conflict','saved']);assert.equal((await store.read(s)).revision,1);
    });
    await t.test('concurrent updates have one winner',async()=>{
      const s=subject(5);await store.compareAndSet(s,0,'entry');
      const r=await Promise.all([store.compareAndSet(s,1,'entry'),other.compareAndSet(s,1,'http')]);
      assert.deepEqual(r.map(x=>x.outcome).sort(),['conflict','saved']);assert.equal((await store.read(s)).revision,2);
    });
    await t.test('a new Node process resumes committed bookmark',async()=>{
      const s=subject(6);await store.compareAndSet(s,0,'http');
      const script=`import pg from 'pg';
import {createWebReviewPostgresStore} from './standalone-web-rehearsal-postgres.mjs';
if(process.env.WEB_REVIEW_WORKER_URL!==${JSON.stringify(workerURL)})throw Error('Synthetic worker required');
const pool=new pg.Pool({connectionString:process.env.WEB_REVIEW_WORKER_URL,connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:7000});
try{const store=createWebReviewPostgresStore(${JSON.stringify(profile)},pool);console.log(JSON.stringify(await store.read(${JSON.stringify(s)})));}finally{await pool.end();}`;
      const child=await runChild(process.execPath,['--input-type=module','-e',script],{cwd:new URL('./',import.meta.url),env:{WEB_REVIEW_WORKER_URL:workerURL},timeout:15000,maxBuffer:4096});
      assert.deepEqual(JSON.parse(child.stdout),{pageKey:'http',revision:1});
    });
    await t.test('rolled-back direct update leaves accepted state unchanged',async()=>{
      const s=subject(7);await store.compareAndSet(s,0,'entry');const client=await worker.connect();
      try{await client.query('BEGIN');await client.query('UPDATE web_review_progress.bookmarks SET page_key=$1,revision=revision+1 WHERE actor_id=$2',['http',s.actorId]);await client.query('ROLLBACK');}finally{client.release();}
      assert.deepEqual(await store.read(s),{pageKey:'entry',revision:1});
    });
    await t.test('error after autocommit is an unknown response, not rollback',async()=>{
      const s=subject(8);let writes=0;
      const port={query:async(text,values)=>{const result=await worker.query(text,values);if(text.startsWith('INSERT ')){writes++;throw Error('Synthetic response loss after commit');}return result;}};
      await assert.rejects(createWebReviewPostgresStore(profile,port).compareAndSet(s,0,'http'));
      assert.deepEqual(await store.read(s),{pageKey:'http',revision:1});assert.equal(writes,1);
    });
    await t.test('read-only transaction rejects a write without creating bookmark',async()=>{
      const s=subject(9),client=await worker.connect();
      try{await client.query('BEGIN READ ONLY');await assert.rejects(createWebReviewPostgresStore(profile,client).compareAndSet(s,0,'entry'));await client.query('ROLLBACK');}finally{client.release();}
      assert.equal(await store.read(s),null);
    });
  } finally {await Promise.allSettled([worker?.end(),peer?.end(),owner.end()]);}
});
