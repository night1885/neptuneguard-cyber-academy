import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';

const ownerURL='postgresql://web_review_ci_owner:ci-disposable-only@127.0.0.1:5432/ng_web_review_ci';
const workerURL='postgresql://web_receipt_ci_worker:ci-receipt-fixture-only@127.0.0.1:5432/ng_web_review_ci';
const reviewedSQL='f4d867645144c37e6fd1d8507aeda55fc8f4c9808bda6b4fd7eed5daba28fc49';
const enabled=process.env.WEB_REVIEW_RECEIPT_SQL_CI==='true';

// Local/CI candidate only. No general URL, SQL path, production-role or runtime route.
test('receipt SQL candidate - isolated PostgreSQL acceptance',{skip:!enabled,timeout:120000},async t=>{
  assert.ok(process.env.CI==='true'&&process.env.WEB_REVIEW_TEST_DATABASE_URL===ownerURL,'Exact receipt CI admission required');
  assert.ok(['16','18'].includes(process.env.WEB_REVIEW_PG_MAJOR),'Explicit receipt PostgreSQL major required');
  const sql=await readFile(new URL('./standalone-web-save-receipts.candidate.sql',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(sql).digest('hex'),reviewedSQL,'Reviewed receipt SQL hash required');
  const {default:pg}=await import('pg');
  const appName='receipt-ci-'+randomUUID();
  const settings={max:2,connectionTimeoutMillis:3000,idleTimeoutMillis:1000,statement_timeout:5000,query_timeout:7000,options:'-c lock_timeout=3000 -c idle_in_transaction_session_timeout=5000'};
  const owner=new pg.Pool({...settings,connectionString:ownerURL});let worker,peer,observer;
  const where='guild_id=$1 AND actor_id=$2 AND course_key=$3 AND content_revision=$4';
  const values=s=>[s.guildId,s.actorId,s.courseKey,s.contentRevision];
  const command=(expected=0,page='http')=>({operationId:randomUUID(),expected,page});
  const rpc='SELECT web_review_receipt_candidate.record_save($1,$2,$3,$4,$5::bigint,$6::uuid,$7::bigint,$8) AS result';
  const send=async(s,c,pool=worker)=>(await pool.query(rpc,[...values(s),s.generation,c.operationId,c.expected,c.page])).rows[0].result;
  const lookup=async(s,id,pool=worker)=>(await pool.query('SELECT web_review_receipt_candidate.read_receipt($1,$2,$3,$4,$5::bigint,$6::uuid) AS result',[...values(s),s.generation,id])).rows[0].result;
  const deny=(work,code='42501')=>assert.rejects(work,error=>error.code===code);
  let serial=0;
  const fixture=async(maxReceipts=4)=>{
    const s={guildId:'11111111111111111',actorId:String(22222222222222000n+BigInt(++serial)),courseKey:'standalone-web-review',contentRevision:'c'.repeat(64),generation:1};
    await owner.query('INSERT INTO web_review_receipt_candidate.scopes(guild_id,actor_id,course_key,content_revision,generation,active,valid_until,max_receipts) VALUES($1,$2,$3,$4,1,true,clock_timestamp()+interval \'1 hour\',$5)',[...values(s),maxReceipts]);
    return s;
  };
  const audit=async s=>(await owner.query(`SELECT
    (SELECT count(*)::int FROM web_review_receipt_candidate.receipts WHERE ${where}) AS receipts,
    (SELECT count(*)::int FROM web_review_receipt_candidate.bookmarks WHERE ${where} AND generation=$5) AS bookmarks,
    (SELECT revision::text FROM web_review_receipt_candidate.bookmarks WHERE ${where} AND generation=$5) AS revision,
    (SELECT active FROM web_review_receipt_candidate.scopes WHERE ${where}) AS active,
    (SELECT generation::text FROM web_review_receipt_candidate.scopes WHERE ${where}) AS generation`,[...values(s),s.generation])).rows[0];
  const prune=async s=>(await owner.query('SELECT web_review_receipt_candidate.prune_retired($1,$2,$3,$4) AS result',values(s))).rows[0].result;
  const until=async predicate=>{for(let n=0;n<200;n++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Expected receipt server condition not observed');};
  try{
    const identity=(await owner.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num') AS version,to_regnamespace('web_review_receipt_candidate') IS NULL AS unused_schema")).rows[0];
    assert.equal(identity.db,'ng_web_review_ci');assert.equal(identity.actor,'web_review_ci_owner');assert.equal(identity.unused_schema,true);
    assert.equal(Math.floor(Number(identity.version)/10000),Number(process.env.WEB_REVIEW_PG_MAJOR));
    assert.equal((await owner.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname='web_receipt_ci_worker'")).rows[0].n,0);
    await owner.query("CREATE ROLE web_receipt_ci_worker LOGIN PASSWORD 'ci-receipt-fixture-only' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
    await owner.query('GRANT CONNECT ON DATABASE ng_web_review_ci TO web_receipt_ci_worker');
    await owner.query(sql);
    worker=new pg.Pool({...settings,connectionString:workerURL,application_name:appName});
    peer=new pg.Pool({...settings,connectionString:workerURL,application_name:appName+'-peer'});
    observer=new pg.Pool({...settings,max:1,connectionString:ownerURL});

    await t.test('actual worker login has only selected protocol privileges',async()=>{
      const row=(await worker.query("SELECT current_user AS actor,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,has_database_privilege(current_user,current_database(),'CREATE') AS database_create,has_schema_privilege(current_user,'web_review_receipt_candidate','CREATE') AS schema_create,(SELECT count(*)::int FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS memberships FROM pg_roles WHERE rolname=current_user")).rows[0];
      assert.equal(row.actor,'web_receipt_ci_worker');assert.equal(row.memberships,0);
      for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls','database_create','schema_create'])assert.equal(row[key],false);
      for(const table of ['scopes','receipts','bookmarks'])assert.equal((await worker.query('SELECT has_table_privilege(current_user,$1,\'SELECT,INSERT,UPDATE,DELETE,TRUNCATE\') AS allowed',['web_review_receipt_candidate.'+table])).rows[0].allowed,false);
      for(const signature of ['prune_retired(text,text,text,text)','scope_guard()','guard_delete()','refuse_change()','receipt_json(web_review_receipt_candidate.receipts)'])assert.equal((await worker.query('SELECT has_function_privilege(current_user,$1,\'EXECUTE\') AS allowed',['web_review_receipt_candidate.'+signature])).rows[0].allowed,false);
      assert.equal((await worker.query('SELECT web_review_receipt_candidate.contract() AS version')).rows[0].version,1);
    });
    await t.test('a restricted worker cannot apply the owner-only installer',async()=>{
      const client=await worker.connect();try{await deny(client.query(sql),'P0001');}finally{await client.query('ROLLBACK');client.release();}
      assert.equal((await worker.query('SELECT current_user AS actor')).rows[0].actor,'web_receipt_ci_worker');
    });
    await t.test('new save and immutable receipt commit together',async()=>{
      const s=await fixture(),c=command(),r=await send(s,c);
      assert.equal(r.outcome,'saved');assert.equal(r.resultRevision,1);assert.equal(r.operationId,c.operationId);assert.equal(r.contentRevision,s.contentRevision);assert.equal(r.actorId,s.actorId);
      assert.deepEqual(await lookup(s,c.operationId),r);
      assert.deepEqual(await audit(s),{receipts:1,bookmarks:1,revision:'1',active:true,generation:'1'});
    });
    await t.test('historical replay stays original and changed payload cannot reuse its ID',async()=>{
      const s=await fixture(),first=command(),r=await send(s,first);await send(s,command(1,'entry'));
      assert.deepEqual(await send(s,first),r);assert.equal((await audit(s)).revision,'2');
      await deny(send(s,{...first,page:'entry'}),'40001');await deny(send(s,{...first,expected:1}),'40001');
      assert.equal((await audit(s)).receipts,2);assert.deepEqual(await lookup(s,first.operationId),r);
    });
    await t.test('same-ID concurrent calls through separate pools mutate once',async()=>{
      const s=await fixture(),c=command(),results=await Promise.all([send(s,c,worker),send(s,c,peer)]);
      assert.deepEqual(results[0],results[1]);assert.equal(results[0].outcome,'saved');assert.equal((await audit(s)).receipts,1);assert.equal((await audit(s)).revision,'1');
    });
    await t.test('distinct concurrent IDs preserve one winner and a stable conflict receipt',async()=>{
      const s=await fixture(),commands=[command(0,'http'),command(0,'entry')],results=await Promise.all(commands.map((c,n)=>send(s,c,n?peer:worker)));
      assert.deepEqual(results.map(r=>r.outcome).sort(),['conflict','saved']);const loser=results.findIndex(r=>r.outcome==='conflict');
      await send(s,command(1,'entry'));assert.deepEqual(await send(s,commands[loser]),results[loser]);assert.equal(results[loser].resultRevision,null);
      assert.equal((await audit(s)).revision,'2');assert.equal((await audit(s)).receipts,3);
    });
    await t.test('lost response after completed autocommit can be recovered by exact replay',async()=>{
      const s=await fixture(),c=command();let sends=0;
      await assert.rejects((async()=>{sends++;await send(s,c);throw Error('Synthetic post-commit response loss');})(),/Synthetic post-commit/);
      assert.equal(sends,1);const r=await send(s,c);assert.equal(r.outcome,'saved');assert.equal(r.resultRevision,1);
      assert.equal((await audit(s)).receipts,1);assert.equal((await audit(s)).revision,'1');
    });
    await t.test('a receipt-insert failure rolls back the preceding bookmark effect',async()=>{
      const s=await fixture(),c=command(),client=await owner.connect();
      try{
        await client.query('BEGIN');
        await client.query("CREATE FUNCTION web_review_receipt_candidate.fixture_fail_receipt() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt failure'; END; $$");
        await client.query('REVOKE ALL ON FUNCTION web_review_receipt_candidate.fixture_fail_receipt() FROM PUBLIC');
        await client.query('CREATE TRIGGER fixture_fail_receipt BEFORE INSERT ON web_review_receipt_candidate.receipts FOR EACH ROW EXECUTE FUNCTION web_review_receipt_candidate.fixture_fail_receipt()');
        await client.query('COMMIT');
      }finally{await client.query('ROLLBACK');client.release();}
      try{await deny(send(s,c),'P0001');const row=await audit(s);assert.equal(row.receipts,0);assert.equal(row.bookmarks,0);}
      finally{await owner.query('DROP TRIGGER IF EXISTS fixture_fail_receipt ON web_review_receipt_candidate.receipts; DROP FUNCTION IF EXISTS web_review_receipt_candidate.fixture_fail_receipt()');}
    });
    await t.test('revocation suppresses new saves and historical receipt delivery without erasing history',async()=>{
      const s=await fixture(),c=command();await send(s,c);await owner.query(`UPDATE web_review_receipt_candidate.scopes SET active=false WHERE ${where}`,values(s));
      await deny(send(s,c));await deny(lookup(s,c.operationId));await deny(send(s,command(1,'entry')));const row=await audit(s);assert.equal(row.receipts,1);assert.equal(row.revision,'1');assert.equal(row.active,false);
    });
    await t.test('expiry sampled after an observed lock wait cannot preserve earlier authority',{timeout:15000},async()=>{
      const s=await fixture(),holder=await owner.connect();let work,denied;
      try{
        await holder.query('BEGIN');const deadline=(await holder.query(`UPDATE web_review_receipt_candidate.scopes SET valid_until=date_trunc('milliseconds',clock_timestamp()+interval '2 seconds') WHERE ${where} RETURNING valid_until AS at`,values(s))).rows[0].at;
        work=send(s,command());void work.catch(()=>{});denied=deny(work);void denied.catch(()=>{});
        await until(async()=>{const row=(await observer.query("SELECT query_start<$2::timestamptz AS before_start,clock_timestamp()<$2::timestamptz AS before_now FROM pg_stat_activity WHERE application_name=$1 AND state='active' AND wait_event_type='Lock' AND query LIKE 'SELECT web_review_receipt_candidate.record_save%'",[appName,deadline])).rows[0];if(!row)return false;assert.equal(row.before_start,true);assert.equal(row.before_now,true);return true;});
        await until(async()=>(await observer.query('SELECT clock_timestamp()>=$1::timestamptz AS expired',[deadline])).rows[0].expired===true);
        await holder.query('COMMIT');await denied;assert.equal((await audit(s)).receipts,0);
      }finally{await holder.query('ROLLBACK');if(work)await work.catch(()=>{});if(denied)await denied.catch(()=>{});holder.release();}
    });
    await t.test('expiry pruning records an inactive fence and renewal needs a new generation',async()=>{
      const s=await fixture(),c=command();await send(s,c);await owner.query(`UPDATE web_review_receipt_candidate.scopes SET valid_until=clock_timestamp()-interval '1 second' WHERE ${where}`,values(s));
      await deny(send(s,c));await deny(owner.query(`DELETE FROM web_review_receipt_candidate.receipts WHERE ${where}`,values(s)));
      assert.deepEqual(await prune(s),{receiptsRemoved:1,bookmarksRemoved:1,scopeFenceRetained:true});let row=await audit(s);assert.equal(row.active,false);assert.equal(row.generation,'1');assert.equal(row.receipts,0);
      await deny(send(s,c));await deny(owner.query(`UPDATE web_review_receipt_candidate.scopes SET active=true,valid_until=clock_timestamp()+interval '1 hour' WHERE ${where}`,values(s)));
      await owner.query(`UPDATE web_review_receipt_candidate.scopes SET generation=2,active=true,valid_until=clock_timestamp()+interval '1 hour' WHERE ${where}`,values(s));
      await deny(send(s,c));assert.equal((await send({...s,generation:2},command())).outcome,'saved');
    });
    await t.test('capacity preserves replay and old generations need explicit safe pruning',async()=>{
      const s=await fixture(2),first=command(),r=await send(s,first);await send(s,command(1,'entry'));await deny(send(s,command(2,'http')));assert.deepEqual(await send(s,first),r);
      await owner.query(`UPDATE web_review_receipt_candidate.scopes SET generation=2,valid_until=clock_timestamp()+interval '1 hour' WHERE ${where}`,values(s));
      const next={...s,generation:2};await deny(send(next,command()));assert.deepEqual(await prune(s),{receiptsRemoved:2,bookmarksRemoved:1,scopeFenceRetained:true});
      await deny(send(s,first));assert.equal((await send(next,command())).outcome,'saved');assert.equal((await audit(next)).receipts,1);
    });
    await t.test('ordinary owner mutation cannot forget a live fence or change a receipt',async()=>{
      const s=await fixture(),c=command();await send(s,c);
      await deny(owner.query(`UPDATE web_review_receipt_candidate.receipts SET page_key='entry' WHERE ${where}`,values(s)));
      for(const table of ['scopes','bookmarks','receipts'])await deny(owner.query(`DELETE FROM web_review_receipt_candidate.${table} WHERE ${where}`,values(s)));
      await deny(owner.query('TRUNCATE web_review_receipt_candidate.scopes CASCADE'));
      await deny(owner.query(`UPDATE web_review_receipt_candidate.scopes SET generation=0 WHERE ${where}`,values(s)));
      assert.equal((await audit(s)).receipts,1);assert.equal((await audit(s)).revision,'1');
    });
    await t.test('namespace and generation bindings deny cross-scope calls; absent receipt stays NULL',async()=>{
      const s=await fixture(),c=command();
      for(const patch of [{guildId:'99999999999999999'},{actorId:'99999999999999999'},{courseKey:'ethical-hacking'},{contentRevision:'d'.repeat(64)},{generation:2}])await deny(send({...s,...patch},c));
      assert.equal(await lookup(s,randomUUID()),null);assert.equal((await audit(s)).receipts,0);
      const r=await send(s,c);assert.equal(r.outcome,'saved');assert.deepEqual(await lookup(s,c.operationId),r);
    });
    await t.test('same-generation deadline extension, capacity change and reactivation reject',async()=>{
      const s=await fixture();await deny(owner.query(`UPDATE web_review_receipt_candidate.scopes SET valid_until=clock_timestamp()+interval '2 hours' WHERE ${where}`,values(s)));
      await deny(owner.query(`UPDATE web_review_receipt_candidate.scopes SET max_receipts=5 WHERE ${where}`,values(s)));
      await owner.query(`UPDATE web_review_receipt_candidate.scopes SET active=false WHERE ${where}`,values(s));
      await deny(owner.query(`UPDATE web_review_receipt_candidate.scopes SET active=true WHERE ${where}`,values(s)));assert.equal((await audit(s)).active,false);
    });
  }finally{
    // All rows and this synthetic role belong only to the disposable service container.
    await Promise.allSettled([worker?.end(),peer?.end(),observer?.end(),owner.end()]);
  }
});
