import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const databaseUrl=process.env.CERTIFICATION_TEST_DATABASE_URL;
test('disposable active-invitation provenance migration foundation',{skip:!databaseUrl,timeout:120000},async t=>{
  assert.ok(process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL==='true','Explicit role-DDL opt-in required');
  let url;try{url=new URL(databaseUrl);}catch{throw new Error('Explicit disposable loopback URL required');}
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.ok(url.pathname==='/certification_test','Only the disposable certification_test database is allowed');
  assert.ok(url.search===''&&url.hash==='','Disposable URL must not contain query or fragment');
  const {default:pg}=await import('pg');
  const suffix=randomUUID().replaceAll('-',''),schema='provenance_test_'+suffix,role='provenance_role_'+suffix,password=randomUUID();
  const admin=new pg.Pool({connectionString:databaseUrl,ssl:false,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000`});
  const owner='1'.repeat(18),other='5'.repeat(18),legacy='2'.repeat(18);
  let serial=600000000000000000n,schemaCreated=false,roleCreated=false,worker;
  const next=()=>String(++serial);
  const state=async id=>(await admin.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1',[id])).rows[0];
  const snapshot=async()=>(await admin.query('SELECT discord_user_id,to_jsonb(e)::text AS state FROM certification_enrollments e ORDER BY discord_user_id')).rows;
  const insert=async(id=next())=>{await worker.query("INSERT INTO certification_enrollments(discord_user_id,status,registration_owner_id) VALUES($1,'awaiting_acknowledgment',$2)",[id,owner]);return id;};
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`);schemaCreated=true;
    for(const name of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql'])await admin.query(await readFile(new URL('./migrations/'+name,import.meta.url),'utf8'));
    await admin.query("INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment')",[legacy]);
    await admin.query("INSERT INTO certification_audit_events(actor_discord_user_id,subject_discord_user_id,action) VALUES($1,$2,'student_registered_by_owner')",[owner,legacy]);
    const agreementHash=createHash('sha256').update('Disposable provenance agreement.').digest('hex');
    await admin.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',['provenance-fixture-v1','Disposable provenance agreement.',agreementHash]);
    const oldLegacy=(await admin.query("SELECT (to_jsonb(e)-'registration_owner_id')::text AS state FROM certification_enrollments e WHERE discord_user_id=$1",[legacy])).rows[0].state;
    const migration=await readFile(new URL('./migrations/009-active-registration-provenance.sql',import.meta.url),'utf8');
    await admin.query(migration);await admin.query(migration);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT(discord_user_id,status,registration_owner_id),UPDATE(status) ON certification_enrollments TO "${role}"`);
    const login=new URL(databaseUrl);login.username=role;login.password=password;
    worker=new pg.Pool({connectionString:login.href,ssl:false,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000`});
    await t.test('legacy row is not backfilled, even with matching historical audit',async()=>{
      assert.equal((await state(legacy)).registration_owner_id,null);
      const unmarked=next();await worker.query("INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment')",[unmarked]);assert.equal((await state(unmarked)).registration_owner_id,null);
      assert.equal((await admin.query("SELECT (to_jsonb(e)-'registration_owner_id')::text AS state FROM certification_enrollments e WHERE discord_user_id=$1",[legacy])).rows[0].state,oldLegacy);
      await assert.rejects(admin.query('UPDATE certification_enrollments SET registration_owner_id=$2 WHERE discord_user_id=$1',[legacy,owner]),e=>e.code==='P0001');
    });
    await t.test('real restricted login cannot directly update provenance',async()=>{
      assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0],{current:role,session:role});
      const flags=(await worker.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user')).rows[0];assert.ok(Object.values(flags).every(v=>v===false));
      assert.equal((await worker.query("SELECT has_column_privilege(current_user,'certification_enrollments','registration_owner_id','UPDATE') AS allowed")).rows[0].allowed,false);
      assert.equal((await admin.query("SELECT p.prosecdef,p.proconfig FROM pg_proc p WHERE p.oid='certification_guard_registration_provenance()'::regprocedure")).rows[0].prosecdef,false);
    });
    await t.test('active provenance survives fixture audit deletion and no-op update',async()=>{
      const id=await insert();await admin.query("INSERT INTO certification_audit_events(actor_discord_user_id,subject_discord_user_id,action) VALUES($1,$2,'student_registered_by_owner')",[owner,id]);
      await admin.query('DELETE FROM certification_audit_events WHERE subject_discord_user_id=$1',[id]);
      await worker.query('UPDATE certification_enrollments SET status=status WHERE discord_user_id=$1',[id]);assert.equal((await state(id)).registration_owner_id,owner);
      assert.equal((await admin.query('SELECT COUNT(*)::int AS n FROM certification_audit_events WHERE subject_discord_user_id=$1',[id])).rows[0].n,0);
    });
    await t.test('replacement, early clearing and retargeting fail even for fixture administrator',async()=>{
      const id=await insert(),before=await snapshot();
      for(const value of [other,null])await assert.rejects(admin.query('UPDATE certification_enrollments SET registration_owner_id=$2 WHERE discord_user_id=$1',[id,value]),e=>e.code==='P0001');
      await assert.rejects(admin.query('UPDATE certification_enrollments SET discord_user_id=$2 WHERE discord_user_id=$1',[id,next()]),e=>e.code==='P0001');
      await assert.rejects(admin.query("UPDATE certification_enrollments SET status='pending',registration_owner_id=$2 WHERE discord_user_id=$1",[id,other]),e=>e.code==='P0001');
      assert.deepEqual(await snapshot(),before);
    });
    await t.test('valid non-awaiting transitions automatically clear only the new live field',async()=>{
      for(const status of ['pending','denied','suspended','revoked']){const id=await insert();await worker.query('UPDATE certification_enrollments SET status=$2 WHERE discord_user_id=$1',[id,status]);assert.equal((await state(id)).registration_owner_id,null);}
      const id=await insert();await admin.query("UPDATE certification_enrollments SET status='denied',application_closed_at=date_trunc('milliseconds',NOW()),application_closed_by=$2,application_closed_as='withdrawn' WHERE discord_user_id=$1",[id,owner]);const row=await state(id);assert.equal(row.registration_owner_id,null);assert.equal(row.application_closed_by,owner);
      const approved=await insert();await admin.query("UPDATE certification_enrollments SET status='approved',student_id=$2,acknowledged_at=NOW(),signature_method='discord_account',agreement_version='provenance-fixture-v1',agreement_content_sha256=$4,learner_confirmed_read_at=NOW(),comprehension_passed_at=NOW(),comprehension_check_version='fixture-check',age_eligible=TRUE,age_declared_at=NOW(),age_declaration_version='adult-18-v1',approved_by=$3,approved_at=NOW() WHERE discord_user_id=$1",[approved,'NG-fixture-'+approved,owner,agreementHash]);assert.equal((await state(approved)).registration_owner_id,null);assert.equal((await state(approved)).approved_by,owner);
    });
    await t.test('clearing is transactional and invalid approval cannot erase provenance',async()=>{
      const id=await insert(),db=await worker.connect();let discard=false;
      try{await db.query('BEGIN');assert.equal((await db.query("UPDATE certification_enrollments SET status='pending' WHERE discord_user_id=$1 RETURNING registration_owner_id",[id])).rows[0].registration_owner_id,null);}
      finally{try{await db.query('ROLLBACK');}catch{discard=true;}db.release(discard);}
      assert.equal((await state(id)).registration_owner_id,owner);
      await assert.rejects(worker.query("UPDATE certification_enrollments SET status='approved' WHERE discord_user_id=$1",[id]),e=>e.code==='23514');assert.equal((await state(id)).registration_owner_id,owner);
    });
    await t.test('consumed provenance cannot be restored by status cycling or direct assignment',async()=>{
      const id=await insert();await worker.query("UPDATE certification_enrollments SET status='pending' WHERE discord_user_id=$1",[id]);await worker.query("UPDATE certification_enrollments SET status='awaiting_acknowledgment' WHERE discord_user_id=$1",[id]);
      await assert.rejects(admin.query('UPDATE certification_enrollments SET registration_owner_id=$2 WHERE discord_user_id=$1',[id,owner]),e=>e.code==='P0001');assert.equal((await state(id)).registration_owner_id,null);
    });
    await t.test('invalid insertion shape and worker privilege escalation fail closed',async()=>{
      for(const value of ['',other.slice(0,16),other+'000','invalid'])await assert.rejects(worker.query("INSERT INTO certification_enrollments(discord_user_id,status,registration_owner_id) VALUES($1,'awaiting_acknowledgment',$2)",[next(),value]),e=>e.code==='23514');
      await assert.rejects(worker.query("INSERT INTO certification_enrollments(discord_user_id,status,registration_owner_id) VALUES($1,'pending',$2)",[next(),owner]),e=>e.code==='23514');
      const id=await insert();for(const sql of ['UPDATE certification_enrollments SET registration_owner_id=NULL','UPDATE certification_enrollments SET approved_by=discord_user_id','DELETE FROM certification_enrollments','TRUNCATE certification_enrollments','ALTER TABLE certification_enrollments DISABLE TRIGGER certification_registration_provenance_guard'])await assert.rejects(worker.query(sql),e=>e.code==='42501');assert.equal((await state(id)).registration_owner_id,owner);
    });
    await t.test('replay preserves rows and rejects an unexpected provenance default',async()=>{
      const before=await snapshot();await admin.query(migration);assert.deepEqual(await snapshot(),before);
      await admin.query(`ALTER TABLE certification_enrollments ALTER COLUMN registration_owner_id SET DEFAULT '${owner}'`);
      try{await assert.rejects(admin.query(migration),e=>e.code==='P0001');}
      finally{await admin.query('ROLLBACK');await admin.query('ALTER TABLE certification_enrollments ALTER COLUMN registration_owner_id DROP DEFAULT');}
      await admin.query(migration);assert.deepEqual(await snapshot(),before);
    });
  }finally{
    try{if(worker)await worker.end();}finally{try{if(schemaCreated)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
  }
});
