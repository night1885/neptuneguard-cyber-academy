import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createAuditRetentionExecutor} from './certification-retention-audit-executor.js';
const url=process.env.CERTIFICATION_TEST_DATABASE_URL,opted=process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL==='true';
const owner='1223123544301633567',subject='1223123544301633568',event='9007199254740993';
const occurred='2026-01-31T23:59:59.123456Z',boundary='2026-04-30T23:59:59.123456Z';
async function isolated(operation){
  const suffix=randomUUID().replaceAll('-',''),schema=`audit_exec_${suffix}`,role=`audit_retention_${suffix}`,password=randomUUID();
  const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=2000`});
  let created=false,roleCreated=false,worker;
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
    for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql'])await admin.query(await readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
    await admin.query("INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment')",[subject]);
    await admin.query("INSERT INTO certification_audit_events(event_id,actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES($1,$2,$3,'fixture',jsonb_build_object('fixture_private',true),$4::timestamptz)",[event,owner,subject,occurred]);
    await admin.query("INSERT INTO certification_audit_events(event_id,actor_discord_user_id,action,created_at) VALUES('9007199254740994',$1,'future_fixture','2026-05-01T00:00:00Z')",[owner]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT(event_id,created_at),DELETE ON certification_audit_events TO "${role}"`);
    const u=new URL(url);u.username=role;u.password=password;
    worker=new pg.Pool({connectionString:u.href,max:2,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c TimeZone=Pacific/Auckland -c statement_timeout=5000 -c lock_timeout=2000`});
    let cutoff=boundary,reviews=0;
    const config={ownerId:owner,executorRole:role,expectedDatabase:'certification_test',schema,enabled:true};
    const dependencies={cutoffUtc:()=>cutoff,reviewPreservation:async context=>{reviews++;const now=new Date();return{...context,decision:'allow',reference:'fixture_review',reviewedAt:new Date(now.getTime()-100),expiresAt:new Date(now.getTime()+60000)};}};
    const executor=createAuditRetentionExecutor(worker,config,dependencies);
    const snapshot=async()=>({
      enrollments:(await admin.query('SELECT to_jsonb(t) AS record FROM certification_enrollments t ORDER BY discord_user_id')).rows,
      courses:(await admin.query('SELECT to_jsonb(t) AS record FROM certification_course_enrollments t ORDER BY discord_user_id,course_key')).rows,
      labs:(await admin.query('SELECT to_jsonb(t) AS record FROM certification_lab_requests t ORDER BY request_id')).rows,
      audit:(await admin.query(`SELECT event_id::text AS event_id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at_utc,to_jsonb(t)-'event_id'-'created_at' AS rest FROM certification_audit_events t ORDER BY event_id`)).rows
    });
    await operation({admin,worker,config,dependencies,executor,snapshot,setCutoff(v){cutoff=v;},get reviews(){return reviews;}});
  }finally{
    try{if(worker)await worker.end();}finally{try{if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
  }
}
test('disposable independent audit expiry with exact IDs and timestamps',{skip:!url||!opted,timeout:120000},async t=>{
  const u=new URL(url);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname));assert.equal(u.pathname,'/certification_test');assert.equal(u.search,'');assert.equal(u.hash,'');
  await t.test('one microsecond early blocks; exact month-end boundary deletes only the selected audit event',async()=>isolated(async f=>{
    const before=await f.snapshot();f.setCutoff('2026-04-30T23:59:59.123455Z');await assert.rejects(f.executor.execute(owner,event),/eligibility/);assert.deepEqual(await f.snapshot(),before);
    f.setCutoff(boundary);assert.equal((await f.executor.execute(owner,event)).eventId,event);const after=await f.snapshot();
    assert.deepEqual(after.enrollments,before.enrollments);assert.deepEqual(after.courses,before.courses);assert.deepEqual(after.labs,before.labs);
    assert.deepEqual(after.audit,before.audit.filter(row=>row.event_id!==event));assert.equal(f.reviews,1);
    assert.equal((await f.executor.execute(owner,event)).outcome,'not_found');
    for(const sql of ['SELECT details FROM certification_audit_events','DELETE FROM certification_enrollments',"UPDATE certification_audit_events SET action='fixture'",'TRUNCATE certification_audit_events'])await assert.rejects(f.worker.query(sql),e=>e.code==='42501');
  }));
  await t.test('concurrent invocations delete at most once',async()=>isolated(async f=>{
    const result=await Promise.all([f.executor.execute(owner,event),f.executor.execute(owner,event)]);assert.deepEqual(result.map(r=>r.deleted).sort(),[0,1]);assert.equal(f.reviews,1);
  }));
  for(const blocker of ['foreign_key','delete_trigger','preservation_hold','excess_privilege'])await t.test(`blocks ${blocker}`,async()=>isolated(async f=>{
    if(blocker==='foreign_key')await f.admin.query('CREATE TABLE audit_child(event bigint REFERENCES certification_audit_events(event_id) ON DELETE CASCADE)');
    if(blocker==='delete_trigger')await f.admin.query("CREATE FUNCTION reject_audit_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'fixture';END;$$;CREATE TRIGGER reject_audit_delete BEFORE DELETE ON certification_audit_events FOR EACH ROW EXECUTE FUNCTION reject_audit_delete()");
    if(blocker==='excess_privilege')await f.admin.query(`GRANT DELETE ON certification_enrollments TO "${f.config.executorRole}"`);
    const executor=blocker==='preservation_hold'?createAuditRetentionExecutor(f.worker,f.config,{...f.dependencies,reviewPreservation:async()=>({decision:'hold'})}):f.executor;
    const before=await f.snapshot();await assert.rejects(executor.execute(owner,event));assert.deepEqual(await f.snapshot(),before);
  }));
  await t.test('failure before commit rolls back a real audit deletion',async()=>isolated(async f=>{
    const pool={async connect(){const c=await f.worker.connect();return{query(sql,...args){if(sql==='COMMIT')throw new Error('fixture pre-commit');return c.query(sql,...args);},release(v){c.release(v);}};}};
    const executor=createAuditRetentionExecutor(pool,f.config,f.dependencies),before=await f.snapshot();await assert.rejects(executor.execute(owner,event),/commit/);assert.deepEqual(await f.snapshot(),before);
  }));
});
