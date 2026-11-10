import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('assignment binding structural schema in disposable PostgreSQL',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.CERTIFICATION_ENABLED,'false');
 for(const key of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[key]||'','');
 const target=new URL(url);
 assert.ok(['postgres:','postgresql:'].includes(target.protocol));
 assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const {default:pg}=await import('pg');
 const suffix=randomUUID().replaceAll('-',''),database='binding_'+suffix,role='binding_'+suffix,password=randomUUID();
 const options={max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=5000 -c lock_timeout=2000'};
 const admin=new pg.Pool({...options,connectionString:url});
 let db,worker,databaseCreated=false,roleCreated=false;
 const A='100000000000000001',X='100000000000000002',O='100000000000000003',G='100000000000000004',KEY='ethical-hacking-reading',OTHER='fixture-other',stamp='2026-01-01T00:00:00.000Z';
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];
  assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);databaseCreated=true;
  target.pathname='/'+database;db=new pg.Pool({...options,connectionString:target.href});
  assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  for(const name of ['001-certification.sql','007-course-enrollment-lifecycle.sql','012-formal-review.sql','014-formal-review-assignment-bindings.sql'])await db.query(await readFile(new URL('./migrations/'+name,import.meta.url),'utf8'));
  // Pending fictional enrollments intentionally demonstrate identity linkage is not eligibility.
  await db.query('INSERT INTO public.certification_enrollments(discord_user_id) VALUES($1),($2)',[A,X]);
  for(const learner of [A,X])for(const course of [KEY,OTHER])await db.query("INSERT INTO public.certification_course_enrollments(discord_user_id,course_key,status,assigned_at,assigned_by) VALUES($1,$2,'active',$3,$4)",[learner,course,stamp,O]);
  let channel=100000000000001000n;
  async function work(learner=A){const id=randomUUID();await db.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'fictional-schema-only',$4,$5,'EH-NET-02',1000,86401000)",[id,G,learner,String(channel++),KEY]);return id;}
  const valid=await work(),other=await work(X),spare=await work(),rolledBack=await work();
  const before=(await db.query('SELECT id,learner_id,course_key,revision,state,created_ms,expires_ms FROM formal_review.work ORDER BY id')).rows;
  await db.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT,INSERT ON formal_review.assignment_bindings TO "${role}"`);
  const workerURL=new URL(target.href);workerURL.username=role;workerURL.password=password;worker=new pg.Pool({...options,connectionString:workerURL.href});
  assert.deepEqual((await worker.query('SELECT current_database() AS db,current_user AS login,current_user=session_user AS direct')).rows[0],{db:database,login:role,direct:true});
  const count=async()=>Number((await db.query('SELECT count(*) AS n FROM formal_review.assignment_bindings')).rows[0].n);
  const insert=(pool,id,learner=A,course=KEY,time=stamp)=>pool.query('INSERT INTO formal_review.assignment_bindings(work_id,learner_id,course_key,assigned_at) VALUES($1,$2,$3,$4)',[id,learner,course,time]);
  assert.equal(await count(),0);await insert(worker,valid);assert.equal(await count(),1);
  await assert.rejects(insert(worker,valid),e=>e.code==='23505');
  await assert.rejects(insert(worker,other,A),e=>e.code==='23503');
  await assert.rejects(insert(worker,spare,A,OTHER),e=>e.code==='23503');
  await assert.rejects(insert(worker,spare,A,KEY,'2026-01-02T00:00:00.000Z'),e=>e.code==='23503');
  await assert.rejects(insert(worker,randomUUID()),e=>e.code==='23503');
  await assert.rejects(insert(worker,spare,null),e=>e.code==='23502');
  await assert.rejects(db.query('UPDATE formal_review.assignment_bindings SET assigned_at=assigned_at WHERE work_id=$1',[valid]),/Immutable review record/);
  await assert.rejects(db.query('DELETE FROM formal_review.work WHERE id=$1',[valid]),e=>['23503','23001'].includes(e.code));
  await assert.rejects(db.query('DELETE FROM public.certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2',[A,KEY]),e=>['23503','23001'].includes(e.code));
  for(const sql of ['DELETE FROM formal_review.assignment_bindings','UPDATE formal_review.assignment_bindings SET assigned_at=assigned_at','SELECT * FROM formal_review.work','SELECT * FROM public.certification_enrollments','SELECT * FROM formal_review.reports'])await assert.rejects(worker.query(sql),e=>e.code==='42501');
  const client=await worker.connect();try{await client.query('BEGIN');await insert(client,rolledBack);await client.query('ROLLBACK');}finally{client.release();}
  assert.equal(await count(),1);
  await insert(worker,spare);assert.equal(await count(),2);
  assert.deepEqual((await db.query('SELECT id,learner_id,course_key,revision,state,created_ms,expires_ms FROM formal_review.work ORDER BY id')).rows,before);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.certification_enrollments WHERE status='awaiting_acknowledgment'")).rows[0].n,2);
  assert.equal((await worker.query('SELECT learner_id,course_key,assigned_at FROM formal_review.assignment_bindings WHERE work_id=$1',[valid])).rows[0].assigned_at.toISOString(),stamp);
 }finally{
  try{await Promise.all([worker?.end(),db?.end()]);}finally{
   try{if(databaseCreated)await admin.query(`DROP DATABASE "${database}"`);}finally{
    try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}
   }
  }
 }
});
