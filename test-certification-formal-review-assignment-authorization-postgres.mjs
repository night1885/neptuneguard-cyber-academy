import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createAssignmentBoundReviewAuthorization} from './formal-review-assignment-authorization.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('assignment-bound authority with restricted PostgreSQL metadata reader',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const u=new URL(url);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'5432');assert.equal(u.pathname,'/formal_review_test');assert.equal(u.username,'formal_review_admin');assert.equal(u.search,'');assert.equal(u.hash,'');
 const {default:pg}=await import('pg'),suffix=randomUUID().replaceAll('-',''),database='bound_'+suffix,role='bound_reader_'+suffix,password=randomUUID(),opt={max:1,connectionTimeoutMillis:5000,options:'-c search_path=pg_catalog -c statement_timeout=2000 -c lock_timeout=1000'},admin=new pg.Pool({...opt,connectionString:url});
 const G='100000000000000001',A='100000000000000002',O='100000000000000003',C='100000000000000004',KEY='ethical-hacking-reading';let db,reader,adapter,created=false,roleCreated=false,eligible=true,calls=0,baseDisposed=false;
 try{
  const proof=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(proof.db,'formal_review_test');assert.equal(proof.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(proof.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);created=true;u.pathname='/'+database;db=new pg.Pool({...opt,options:'-c search_path=public -c statement_timeout=5000 -c lock_timeout=2000',connectionString:u.href});assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  for(const file of ['001-certification.sql','007-course-enrollment-lifecycle.sql','012-formal-review.sql','014-formal-review-assignment-bindings.sql'])await db.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
  await db.query('INSERT INTO public.certification_enrollments(discord_user_id) VALUES($1)',[A]);
  const assigned=Date.now()-10000;await db.query("INSERT INTO public.certification_course_enrollments(discord_user_id,course_key,status,assigned_at,assigned_by) VALUES($1,$2,'active',$3,$4)",[A,KEY,new Date(assigned),O]);
  const workId=randomUUID(),predated=randomUUID(),now=Date.now();
  for(const [id,createdMs,channel] of [[workId,now-1000,C],[predated,assigned-1,'100000000000000005']])await db.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'fictional-id',$4,$5,'EH-NET-02',$6,$7)",[id,G,A,channel,KEY,createdMs,createdMs+86400000]);
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await db.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public,formal_review TO "${role}"; GRANT SELECT(work_id,learner_id,course_key,assigned_at) ON formal_review.assignment_bindings TO "${role}"; GRANT SELECT(id,guild_id,learner_id,student_id,course_key,exercise_key,channel_id,created_ms,expires_ms) ON formal_review.work TO "${role}"; GRANT SELECT(discord_user_id,course_key,assigned_at,status) ON public.certification_course_enrollments TO "${role}"; ALTER ROLE "${role}" SET default_transaction_read_only=on`);
  const ru=new URL(u.href);ru.username=role;ru.password=password;reader=new pg.Pool({...opt,connectionString:ru.href});
  const base={enabled:true,ready:false,async initialize(){this.ready=true;return {ready:true};},async authorizeCourse(){calls++;return eligible?{studentId:'fictional-id',courseKey:KEY}:null;},dispose(){this.ready=false;baseDisposed=true;},drain:async()=>{}};
  adapter=createAssignmentBoundReviewAuthorization({enabled:true,courseAuthorization:base,readPool:reader,expectedDatabase:database,expectedLogin:role,guildId:G,isReady:()=>true});await adapter.initialize();
  const scope={actorId:A,guildId:G,learnerId:A,studentId:'fictional-id',courseKey:KEY,exerciseKey:'EH-NET-02',workId,sourceChannelId:C};
  assert.equal(await adapter.authorizeCourse(scope),null);
  for(const id of [workId,predated])await db.query('INSERT INTO formal_review.assignment_bindings(work_id,learner_id,course_key,assigned_at) VALUES($1,$2,$3,$4)',[id,A,KEY,new Date(assigned)]);
  const before=calls;assert.deepEqual(await adapter.authorizeCourse(scope),{studentId:'fictional-id',courseKey:KEY});assert.equal(calls-before,2);
  for(const patch of [{studentId:'other'},{sourceChannelId:O},{exerciseKey:'EH-NET-03'},{workId:randomUUID()}])assert.equal(await adapter.authorizeCourse({...scope,...patch}),null);
  assert.equal(await adapter.authorizeCourse({...scope,workId:predated,sourceChannelId:'100000000000000005'}),null);
  eligible=false;assert.equal(await adapter.authorizeCourse(scope),null);eligible=true;
  await db.query("UPDATE public.certification_course_enrollments SET status='completed',completed_at=date_trunc('milliseconds',clock_timestamp()),completed_by=$2 WHERE discord_user_id=$1",[A,O]);assert.equal(await adapter.authorizeCourse(scope),null);
  await assert.rejects(reader.query('SELECT body FROM formal_review.reports'),e=>e.code==='42501');await assert.rejects(reader.query('DELETE FROM formal_review.assignment_bindings'),e=>['42501','25006'].includes(e.code));
  await db.query(`REVOKE SELECT(assigned_at) ON formal_review.assignment_bindings FROM "${role}"`);assert.equal(await adapter.authorizeCourse(scope),null);
  adapter.dispose();assert.equal(baseDisposed,true);assert.equal(await adapter.authorizeCourse(scope),null);await adapter.drain();assert.equal((await reader.query('SELECT 1 AS n')).rows[0].n,1);
 }finally{adapter?.dispose();await adapter?.drain();await Promise.all([reader?.end(),db?.end()]);try{if(created)await admin.query(`DROP DATABASE "${database}"`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
});
