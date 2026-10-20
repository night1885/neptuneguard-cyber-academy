import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createLabActionHandler } from './certification-lab-actions.js';
const databaseUrl=process.env.CERTIFICATION_TEST_DATABASE_URL;
const enabled=process.env.CERTIFICATION_TEST_ALLOW_LAB_DDL==='true' && process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL==='true';
const owner='1223123544301633567',student='1223123544301633568',guild='1330353166830665859';
async function isolated(operation) {
  const schema=`lab_drift_${randomUUID().replaceAll('-','')}`;
  const db=new pg.Client({connectionString:databaseUrl,connectionTimeoutMillis:5000,
    options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=2000`});
  let connected=false,created=false,worker,role;
  try {
    await db.connect();connected=true;
    assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await db.query(`CREATE SCHEMA "${schema}"`);created=true;
    assert.equal((await db.query('SHOW search_path')).rows[0].search_path,schema);
    await db.query(await readFile(new URL('./migrations/001-certification.sql',import.meta.url),'utf8'));
    await db.query('ALTER TABLE certification_lab_requests DROP COLUMN status_reason');
    await db.query("INSERT INTO certification_enrollments (discord_user_id,status) VALUES ($1,'awaiting_acknowledgment')",[student]);
    const request=randomUUID();
    await db.query(`INSERT INTO certification_lab_requests (request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at)
      VALUES ($1,$2,'disposable-lab','fixture-rules',NOW())`,[request,student]);
    const source=await readFile(new URL('./migrations/008-lab-status-reason.sql',import.meta.url),'utf8');
    // Schema substitution confines all migration effects to this disposable fixture.
    const sql=source.replaceAll('public',schema);
    async function apply(){try{await db.query(sql);}catch(error){await db.query('ROLLBACK');throw error;}}
    async function snapshot(){
      const result={};
      for(const [table,order] of [['certification_enrollments','discord_user_id'],['certification_lab_requests','request_id'],['certification_audit_events','event_id']]) {
        result[table]=(await db.query(`SELECT to_jsonb(t) AS record FROM ${table} t ORDER BY ${order}`)).rows;
      }
      return result;
    }
    async function login(){
      assert.equal(role,undefined);
      const name=`lab_drift_role_${randomUUID().replaceAll('-','')}`,password=randomUUID();
      await db.query(`CREATE ROLE "${name}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);role=name;
      await db.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
      await db.query(`GRANT SELECT,UPDATE ON certification_lab_requests TO "${role}"`);
      await db.query(`GRANT INSERT ON certification_audit_events TO "${role}"`);
      await db.query(`GRANT USAGE ON SEQUENCE certification_audit_events_event_id_seq TO "${role}"`);
      const url=new URL(databaseUrl);url.username=role;url.password=password;
      worker=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:5000,
        options:`-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000`});
      assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0],{current:role,session:role});
      assert.equal((await worker.query('SHOW search_path')).rows[0].search_path,schema);
      return worker;
    }
    await operation({db,request,apply,snapshot,login});
  } finally {
    if(connected){try{if(worker)await worker.end();}finally{
      try{await db.query('ROLLBACK');try{if(created)await db.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{if(role)await db.query(`DROP ROLE "${role}"`);}}
      finally{await db.end();}
    }}
  }
}
function sender(pool){
  const route=createLabActionHandler(pool,{enabled:true,ownerId:owner},guild);
  return async function send(customId,modal=false){
    const messages=[];
    await route({customId,user:{id:owner},guildId:guild,isButton:()=>!modal,isModalSubmit:()=>modal,
      fields:{getTextInputValue:()=> 'Disposable fixture reason'},async deferReply(p){assert.equal(p.flags,64);},
      async reply(p){assert.equal(p.flags,64);messages.push(p);},async editReply(p){messages.push(p);}});
    return messages.at(-1);
  };
}
const token=p=>p.components[0].components[0].custom_id;
test('existing-table migration and restricted lab mutation acceptance',{skip:!databaseUrl||!enabled,timeout:120000},async t=>{
  const url=new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname,'/certification_test');assert.equal(url.search,'');assert.equal(url.hash,'');
  await t.test('additive repair, exact nullable text definition and compatible rerun preserve prior fields',async()=>isolated(async f=>{
    const before=await f.snapshot();await f.apply();await f.apply();const after=await f.snapshot();
    for(const row of after.certification_lab_requests){assert.equal(row.record.status_reason,null);delete row.record.status_reason;}
    assert.deepEqual(after,before);
    assert.deepEqual((await f.db.query(`SELECT format_type(atttypid,atttypmod) AS type,attnotnull,atthasdef,attgenerated,attidentity
      FROM pg_attribute WHERE attrelid=to_regclass('certification_lab_requests') AND attname='status_reason' AND NOT attisdropped`)).rows[0],
      {type:'text',attnotnull:false,atthasdef:false,attgenerated:'',attidentity:''});
  }));
  for(const definition of ['integer',"text DEFAULT 'fixture'","text NOT NULL DEFAULT 'fixture'"]){
    await t.test(`incompatible existing column stops migration: ${definition}`,async()=>isolated(async f=>{
      await f.db.query(`ALTER TABLE certification_lab_requests ADD COLUMN status_reason ${definition}`);
      const before=await f.snapshot();await assert.rejects(f.apply(),/incompatible/);assert.deepEqual(await f.snapshot(),before);
    }));
  }
  await t.test('actual restricted handler blocks drift, consumes failed token, then accepts a fresh confirmation after repair',async()=>isolated(async f=>{
    const worker=await f.login(),send=sender(worker),id=`cert:labact:deny:${f.request}`;
    const before=await f.snapshot(),old=token(await send(id,true));
    assert.match((await send(old)).content,/unavailable/);assert.deepEqual(await f.snapshot(),before);
    assert.match((await send(old)).content,/expired/);
    await f.apply();await send(token(await send(id,true)));
    assert.deepEqual((await f.db.query('SELECT status,status_reason FROM certification_lab_requests WHERE request_id=$1',[f.request])).rows[0],
      {status:'denied',status_reason:'Disposable fixture reason'});
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='lab_request_denied'")).rows[0].n,1);
    for(const sql of ['DELETE FROM certification_lab_requests','TRUNCATE certification_lab_requests','DELETE FROM certification_audit_events',
      "UPDATE certification_audit_events SET action='fixture'",'ALTER TABLE certification_lab_requests ADD COLUMN forbidden_fixture text']){
      await assert.rejects(worker.query(sql),error=>error.code==='42501');
    }
  }));
  await t.test('audit failure rolls back actual restricted-handler mutation; fresh confirmation retries',async()=>isolated(async f=>{
    await f.apply();const send=sender(await f.login()),id=`cert:labact:deny:${f.request}`;
    await f.db.query(`CREATE FUNCTION reject_drift_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected disposable audit failure';END;$$;
      CREATE TRIGGER reject_drift_audit BEFORE INSERT ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_drift_audit()`);
    const before=await f.snapshot(),old=token(await send(id,true));
    await assert.rejects(send(old),/Injected disposable audit failure/);assert.deepEqual(await f.snapshot(),before);
    assert.match((await send(old)).content,/expired/);await f.db.query('DROP TRIGGER reject_drift_audit ON certification_audit_events');
    await send(token(await send(id,true)));
    assert.equal((await f.db.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='lab_request_denied'")).rows[0].n,1);
  }));
});
