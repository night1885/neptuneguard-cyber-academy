import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createFormalReviewAuthorization } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-read-policy.mjs';
import { createTrustedFormalReviewRoute } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/trusted-route.mjs';
import { FORMAL_REVIEW_COURSE as COURSE } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-course.mjs';
const OWNER='1223123544301633567',ACTOR='1223123544301633568',OTHER='1223123544301633569',G='1330353166830665859',CHANNEL='1330353166830665860',ROLE='1330353166830665861',MESSAGE='1330353166830665862';
const migrations=['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','008-lab-status-reason.sql','009-active-registration-provenance.sql','010-manual-review-enrollment.sql'];
test('disposable PostgreSQL 16 formal policy and restricted-reader integration',{timeout:120000},async t=>{
  assert.equal(process.env.FORMAL_REVIEW_CI,'true','Explicit disposable CI opt-in required');
  assert.equal(process.env.GITHUB_ACTIONS,'true','This DDL fixture is restricted to the CI job');
  const url=new URL(process.env.CERTIFICATION_TEST_DATABASE_URL);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'5432');
  assert.equal(url.pathname,'/certification_test');assert.equal(url.username,'formal_ci_admin');assert.equal(url.search,'');assert.equal(url.hash,'');
  const admin=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'});
  const role='formal_read_'+randomUUID().replaceAll('-',''),password=randomUUID();let worker,authorize,route,roleCreated=false;
  try{
    const identity=(await admin.query('SELECT current_database() AS db,current_user AS actor,current_setting(\'server_version_num\')::int AS version')).rows[0];
    assert.equal(identity.db,'certification_test');assert.equal(identity.actor,'formal_ci_admin');assert.ok(identity.version>=160000&&identity.version<170000);
    const existing=(await admin.query("SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')")).rows[0].count;
    assert.equal(existing,0,'Refuse any database with pre-existing public tables before DDL');
    // Migration 010 explicitly targets public; use the fresh dedicated database, never rewrite SQL.
    for(const file of migrations)await admin.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
    const content='Disposable formal PostgreSQL review agreement.',hash=createHash('sha256').update(content).digest('hex');
    await admin.query('INSERT INTO certification_agreements (version,content,content_sha256) VALUES ($1,$2,$3)',['fixture-v1',content,hash]);
    const config={enabled:true,enrollmentSubmissionEnabled:true,ownerId:OWNER,activeAgreementVersion:'fixture-v1',activeAgreementSha256:hash,comprehensionCheck:{version:'fixture-check',correctAnswers:['stop']}};
    await createCertificationSubmission(admin,config).submitEnrollment(ACTOR,{ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,answers:['stop'],agreementVersion:'fixture-v1',agreementSha256:hash,comprehensionCheckVersion:'fixture-check'});
    const approved=await createCertificationService(admin,config).approveEnrollment(OWNER,ACTOR);
    const lifecycle=createCertificationCourseLifecycle(admin,config,{courseKeys:[COURSE.key]});
    await lifecycle.assignCourses(OWNER,ACTOR,[COURSE.key]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT CONNECT ON DATABASE certification_test TO "${role}"`);
    await admin.query('REVOKE TEMPORARY ON DATABASE certification_test FROM PUBLIC');
    await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_enrollments,certification_course_enrollments TO "${role}"`);
    await admin.query(`ALTER ROLE "${role}" SET default_transaction_read_only=on`);
    const readerUrl=new URL(url.href);readerUrl.username=role;readerUrl.password=password;
    worker=new pg.Pool({connectionString:readerUrl.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=2000 -c lock_timeout=1000'});
    authorize=createFormalReviewAuthorization({enabled:true,reviewOnly:true,readPool:worker,config});
    const expected={student_id:approved.studentId,course_key:COURSE.key};
    await t.test('real migrated query returns the current scoped grant',async()=>{assert.deepEqual(await authorize(ACTOR,COURSE.key),expected);});
    await t.test('reader login has no elevated role or creation privileges',async()=>{
      const row=(await worker.query('SELECT current_user AS actor,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
      assert.equal(row.actor,role);for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'])assert.equal(row[key],false);
      const rights=(await worker.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS schema_create,has_database_privilege(current_user,current_database(),'CREATE') AS db_create,has_database_privilege(current_user,current_database(),'TEMPORARY') AS temporary")).rows[0];
      assert.deepEqual(rights,{schema_create:false,db_create:false,temporary:false});
      assert.equal((await worker.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
    });
    await t.test('unknown actor and other course do not gain access',async()=>{assert.equal(await authorize(OTHER,COURSE.key),null);assert.equal(await authorize(ACTOR,'linux-fundamentals'),null);});
    await t.test('committed enrollment revocation is visible without positive caching',async()=>{
      await admin.query("UPDATE certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[ACTOR]);assert.equal(await authorize(ACTOR,COURSE.key),null);
      await admin.query("UPDATE certification_enrollments SET status='approved' WHERE discord_user_id=$1",[ACTOR]);assert.deepEqual(await authorize(ACTOR,COURSE.key),expected);
    });
    await t.test('current agreement mismatch denies on actual rows',async()=>{
      const stale=createFormalReviewAuthorization({enabled:true,reviewOnly:true,readPool:worker,config:{...config,activeAgreementVersion:'old-version'}});
      try{assert.equal(await stale(ACTOR,COURSE.key),null);}finally{stale.dispose();}
    });
    await t.test('actual manual-review JSONB branch remains valid without projecting guide data',async()=>{
      const snapshot={formatVersion:'manual-review-v1',checkVersion:'fixture-check',items:[{question:'SYNTHETIC QUESTION',response:'SYNTHETIC RESPONSE',expectedAnswer:'PRIVATE SYNTHETIC GUIDE'}]};
      await admin.query('UPDATE certification_enrollments SET comprehension_passed_at=NULL,comprehension_submitted_at=NOW(),comprehension_review_snapshot=$2::jsonb WHERE discord_user_id=$1',[ACTOR,JSON.stringify(snapshot)]);
      const grant=await authorize(ACTOR,COURSE.key);assert.deepEqual(grant,expected);assert.equal(JSON.stringify(grant).includes('GUIDE'),false);
    });
    await t.test('trusted route renders through the real read-only database capability',async()=>{
      const client={guilds:{async fetch(id){assert.equal(id,G);return {id:G,available:true,members:{async fetch(options){assert.deepEqual(options,{user:ACTOR,force:true,cache:false});return {id:ACTOR,guild:{id:G},roles:{cache:{has:id=>id===ROLE}}};}}};}}};
      const bundle={schemaVersion:1,mode:'draft-review-only',courseId:COURSE.key,runtimeIntegration:false,publishable:false,pages:[{id:'first',audience:'learner',kind:'reading',title:'Fixture reading',text:'SYNTHETIC DATABASE READING'}]};
      route=createTrustedFormalReviewRoute({enabled:true,reviewOnly:true,mode:'review',guildId:G,entryChannelId:CHANNEL,verifiedRoleId:ROLE,client,readPool:worker,config,bundle,isReady:()=>true});
      const edits=[],i={customId:'fws:open',guildId:G,channelId:CHANNEL,user:{id:ACTOR},isButton:()=>true,deferred:false,replied:false,ephemeral:false,
        async deferReply(options){assert.equal(options.flags,64);this.deferred=true;this.ephemeral=true;},async editReply(payload){edits.push(payload);this.replied=true;return {id:MESSAGE,flags:{has:bit=>bit===64}};},async reply(){assert.fail('Unexpected entry rejection');}};
      assert.equal(await route.handle(i),true);assert.match(edits[0].content,/SYNTHETIC DATABASE READING/);assert.equal(JSON.stringify(edits).includes('PRIVATE SYNTHETIC GUIDE'),false);assert.equal(JSON.stringify(edits).includes(approved.studentId),false);
      assert.deepEqual(await route.dispose(),{drained:true});route=null;
    });
    await t.test('default read-only transaction blocks writes',async()=>{await assert.rejects(worker.query("UPDATE certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[ACTOR]),error=>['25006','42501'].includes(error.code));});
    await t.test('table ACLs still block writes if the login changes its transaction default',async()=>{
      const connection=await worker.connect();let discard=false;
      try{
        await connection.query('SET default_transaction_read_only=off');
        assert.equal((await connection.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'off');
        await assert.rejects(connection.query("UPDATE certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[ACTOR]),error=>error.code==='42501');
        await assert.rejects(connection.query('CREATE TABLE public.blocked_fixture (id int)'),error=>error.code==='42501');
      }finally{
        try{await connection.query('SET default_transaction_read_only=on');}catch(error){discard=true;throw error;}
        finally{connection.release(discard);}
      }
    });
    await t.test('ungranted audit data is not readable by the policy login',async()=>{await assert.rejects(worker.query('SELECT * FROM certification_audit_events'),error=>error.code==='42501');});
    await t.test('server-side statement deadline interrupts a stalled driver request',async()=>{
      await assert.rejects(worker.query('SELECT pg_sleep(3)'),error=>error.code==='57014');assert.deepEqual(await authorize(ACTOR,COURSE.key),expected);
    });
    await t.test('admin-confirmed completion no longer grants active course access',async()=>{
      await lifecycle.completeCourse(OWNER,ACTOR,COURSE.key);assert.equal(await authorize(ACTOR,COURSE.key),null);
    });
    await t.test('facade disposal retires access without closing the shared reader pool',async()=>{
      authorize.dispose();assert.equal(await authorize(ACTOR,COURSE.key),null);assert.equal((await worker.query('SELECT 1 AS value')).rows[0].value,1);
    });
  }finally{
    if(route)await route.dispose();authorize?.dispose();
    try{if(worker)await worker.end();}finally{
      try{if(roleCreated){await admin.query(`DROP OWNED BY "${role}"`);await admin.query(`DROP ROLE "${role}"`);}}
      finally{await admin.end();}
    }
    // The job owns the fresh database/container. Its service teardown removes migration fixtures.
  }
});
