import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createClosedApplicationRetentionExecutor} from './certification-retention-closed-application.js';
const url=process.env.CERTIFICATION_TEST_DATABASE_URL;
const opted=process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL==='true';
const owner='1223123544301633567',subject='1223123544301633568',stamp=new Date('2026-10-22T04:00:00.000Z');
async function isolated(operation){
  const suffix=randomUUID().replaceAll('-',''),schema=`retention_${suffix}`,role=`retention_exec_${suffix}`,password=randomUUID();
  const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=2000`});
  let created=false,roleCreated=false,worker;
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
    for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql'])await admin.query(await readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
    await admin.query(`INSERT INTO certification_enrollments(discord_user_id,status,application_closed_at,application_closed_by,application_closed_as)
      VALUES($1,'denied','2026-10-16T16:00:00.123Z',$2,'withdrawn')`,[subject,owner]);
    await admin.query("INSERT INTO certification_audit_events(actor_discord_user_id,subject_discord_user_id,action) VALUES($1,$2,'fixture_history')",[owner,subject]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT(discord_user_id,status,student_id,approved_by,approved_at,application_closed_at,application_closed_by,application_closed_as),UPDATE(updated_at),DELETE ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT SELECT(discord_user_id) ON certification_course_enrollments,certification_lab_requests TO "${role}"`);
    const connection=new URL(url);connection.username=role;connection.password=password;
    worker=new pg.Pool({connectionString:connection.href,max:2,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000`});
    let reviews=0;
    const config={ownerId:owner,executorRole:role,expectedDatabase:'certification_test',schema,enabled:true};
    const provider=async context=>{reviews++;return{...context,decision:'allow',reference:'fixture_review',reviewedAt:new Date(stamp.getTime()-1000),expiresAt:new Date(stamp.getTime()+60000)};};
    const executor=createClosedApplicationRetentionExecutor(worker,config,{reviewPreservation:provider,now:()=>new Date(stamp)});
    const snapshot=async()=>{
      const result={};for(const [table,order]of[['certification_enrollments','discord_user_id'],['certification_course_enrollments','discord_user_id,course_key'],['certification_lab_requests','request_id'],['certification_audit_events','event_id']])result[table]=(await admin.query(`SELECT to_jsonb(t) AS record FROM ${table} t ORDER BY ${order}`)).rows;
      return result;
    };
    await operation({admin,worker,config,provider,executor,snapshot,get reviews(){return reviews;}});
  }finally{
    try{if(worker)await worker.end();}finally{
      try{if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{
        try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}
      }
    }
  }
}
test('disposable restricted closed-application retention transaction',{skip:!url||!opted,timeout:120000},async t=>{
  const parsed=new URL(url);assert.ok(['postgres:','postgresql:'].includes(parsed.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(parsed.hostname));assert.equal(parsed.pathname,'/certification_test');assert.equal(parsed.search,'');assert.equal(parsed.hash,'');
  await t.test('deletes only the eligible parent and preserves independent audit events',async()=>isolated(async f=>{
    const before=await f.snapshot();assert.equal((await f.executor.execute(owner,subject)).deleted,1);const after=await f.snapshot();
    assert.deepEqual(after.certification_enrollments,[]);for(const table of ['certification_course_enrollments','certification_lab_requests','certification_audit_events'])assert.deepEqual(after[table],before[table]);
    assert.equal((await f.executor.execute(owner,subject)).outcome,'not_found');assert.equal(f.reviews,1);
    for(const sql of ['DELETE FROM certification_audit_events','DELETE FROM certification_lab_requests',"UPDATE certification_enrollments SET status='pending'",'ALTER TABLE certification_enrollments ADD COLUMN forbidden text'])await assert.rejects(f.worker.query(sql),e=>e.code==='42501');
  }));
  await t.test('concurrent invocations serialize and delete at most once',async()=>isolated(async f=>{
    const results=await Promise.all([f.executor.execute(owner,subject),f.executor.execute(owner,subject)]);assert.deepEqual(results.map(r=>r.deleted).sort(),[0,1]);assert.equal(f.reviews,1);
  }));
  for(const blocker of ['unknown_fk','cascade_fk','lab','course','preservation_hold','excess_privilege'])await t.test(`blocks ${blocker} without deletion`,async()=>isolated(async f=>{
    if(blocker==='unknown_fk')await f.admin.query('CREATE TABLE unknown_child(subject text REFERENCES certification_enrollments(discord_user_id))');
    if(blocker==='cascade_fk')await f.admin.query('ALTER TABLE certification_course_enrollments DROP CONSTRAINT certification_course_enrollments_discord_user_id_fkey;ALTER TABLE certification_course_enrollments ADD CONSTRAINT certification_course_enrollments_discord_user_id_fkey FOREIGN KEY(discord_user_id) REFERENCES certification_enrollments(discord_user_id) ON DELETE CASCADE');
    if(blocker==='lab')await f.admin.query("INSERT INTO certification_lab_requests(request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES($1,$2,'fixture','fixture',NOW())",[randomUUID(),subject]);
    if(blocker==='course')await f.admin.query("INSERT INTO certification_course_enrollments(discord_user_id,course_key,status,assigned_at,assigned_by) VALUES($1,'fixture','active','2026-10-15T10:00:00Z',$2)",[subject,owner]);
    if(blocker==='excess_privilege')await f.admin.query(`GRANT DELETE ON certification_lab_requests TO "${f.config.executorRole}"`);
    const executor=blocker==='preservation_hold'?createClosedApplicationRetentionExecutor(f.worker,f.config,{reviewPreservation:async()=>({decision:'hold'}),now:()=>new Date(stamp)}):f.executor;
    const before=await f.snapshot();await assert.rejects(executor.execute(owner,subject),/review current state/);assert.deepEqual(await f.snapshot(),before);
  }));
  await t.test('pre-commit failure rolls back a real delete',async()=>isolated(async f=>{
    const wrapper={async connect(){const client=await f.worker.connect();return{query(sql,...args){if(sql==='COMMIT')throw new Error('Injected fixture pre-commit failure');return client.query(sql,...args);},release(discard){client.release(discard);}};}};
    const executor=createClosedApplicationRetentionExecutor(wrapper,f.config,{reviewPreservation:f.provider,now:()=>new Date(stamp)});
    const before=await f.snapshot();await assert.rejects(executor.execute(owner,subject),/commit/);assert.deepEqual(await f.snapshot(),before);
  }));
  await t.test('administrative connection is not an accepted executor identity',async()=>isolated(async f=>{
    const before=await f.snapshot();const executor=createClosedApplicationRetentionExecutor(f.admin,f.config,{reviewPreservation:f.provider,now:()=>new Date(stamp)});await assert.rejects(executor.execute(owner,subject),/identity/);assert.deepEqual(await f.snapshot(),before);
  }));
});
