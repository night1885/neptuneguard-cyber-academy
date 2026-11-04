// DDL and disposable role creation: exact local CI container only, never hosted staging.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { createFormalReviewAuthorization } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-read-policy.mjs';
const exec=promisify(execFile),DB='neptuneguard_fictional_staging_db',READER='formal_review_staging_reader';
const directory=new URL('./docs/formal-ethical-hacking/authoring/discord-workspace-prototype/staging-db/',import.meta.url);
const names=['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql'];
const pins=['d6680451f3d0dfc7ad8129a7954ea726a975b06a','127b7eaf9ce52f6144f4f8eb5861d174b3f0c005','0a2f2acbb4be3151f08136fd7f355912254acb83','2f917f84f4320b752410fe018fb600b09f2ba14e','7c8021f9b5c1c4e366fc55544c7ccec25b0fb520','71140fd7b16921706383c6a799227f673c69d928','b0f91f9cda392c5b2aa356f9866d0cd43c69c4b3'];
test('staging 001-007 package and reader grants in an owned disposable CI database',{timeout:120000},async t=>{
  assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.FORMAL_STAGING_DB_CI,'true');
  const url=new URL(process.env.CERTIFICATION_TEST_DATABASE_URL);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'5432');
  assert.equal(url.username,'formal_ci_admin');assert.equal(url.pathname,'/certification_test');assert.equal(url.search,'');assert.equal(url.hash,'');
  const expectedMajor=Number(process.env.FORMAL_STAGING_TEST_POSTGRES);assert.ok([16,18].includes(expectedMajor));
  for(let i=0;i<names.length;i++){
    const data=await readFile(new URL('./migrations/'+names[i],import.meta.url));
    const hash=createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex');assert.equal(hash,pins[i]);
  }
  const psql=(database,file)=>exec('psql',['-X','--no-password','-v','ON_ERROR_STOP=1','-d',database,'-f',fileURLToPath(new URL(file,directory))],{
    env:{PATH:process.env.PATH,PGHOST:url.hostname,PGPORT:url.port,PGUSER:url.username,PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:'disable'},timeout:45000,maxBuffer:131072});
  const admin=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:5000});
  let databaseCreated=false,roleCreated=false,owner,worker,authorize;
  try{
    const identity=(await admin.query('SELECT current_database() AS db,current_user AS actor,current_setting(\'server_version_num\')::int AS version')).rows[0];
    assert.equal(identity.db,'certification_test');assert.equal(identity.actor,'formal_ci_admin');assert.equal(Math.floor(identity.version/10000),expectedMajor);
    assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[DB])).rowCount,0,'Refuse an existing target database');
    assert.equal((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[READER])).rowCount,0,'Refuse an existing reader role');
    await t.test('wrong database refuses driver before certification DDL',async()=>{
      await assert.rejects(psql('certification_test','apply-staging.psql'),error=>{assert.equal(error.code,3);assert.match(error.stderr,/Wrong database/);return true;});
      assert.equal((await admin.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname ~ '^certification_'")).rows[0].n,0);
    });
    await admin.query('CREATE DATABASE "'+DB+'" TEMPLATE template0');databaseCreated=true;
    const ownerUrl=new URL(url.href);ownerUrl.pathname='/'+DB;
    owner=new pg.Pool({connectionString:ownerUrl.href,max:1,connectionTimeoutMillis:5000});
    await owner.query('CREATE SCHEMA fi_stage');
    for(const name of ['drafts','records','reports']){await owner.query('CREATE TABLE fi_stage.'+name+' (marker text PRIMARY KEY)');await owner.query('INSERT INTO fi_stage.'+name+' VALUES ($1)',['FICTIONAL-'+name]);}
    const before=await owner.query("SELECT c.relname,c.oid::text,c.relowner::text,c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fi_stage' ORDER BY c.relname");
    await t.test('actual psql driver applies only pinned 001-007 and preserves old fixtures',async()=>{
      await psql(DB,'apply-staging.psql');
      assert.deepEqual((await owner.query("SELECT c.relname,c.oid::text,c.relowner::text,c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='fi_stage' ORDER BY c.relname")).rows,before.rows);
      for(const name of ['drafts','records','reports'])assert.deepEqual((await owner.query('SELECT marker FROM fi_stage.'+name)).rows,[{marker:'FICTIONAL-'+name}]);
      await validateCertificationSchema(owner);
      assert.equal((await owner.query("SELECT to_regprocedure('public.certification_valid_manual_review_snapshot(jsonb)') AS value")).rows[0].value,null);
    });
    await t.test('a repeated fresh-install driver is rejected instead of overwriting',async()=>{
      await assert.rejects(psql(DB,'apply-staging.psql'),error=>{assert.match(error.stderr,/already exist/);return true;});
      await validateCertificationSchema(owner);
    });
    await t.test('grant proposal refuses an absent reader role',async()=>{
      await assert.rejects(psql(DB,'reader-grants-proposal.sql'),error=>{assert.match(error.stderr,/does not exist/);return true;});
    });
    const password=randomUUID();
    await admin.query('CREATE ROLE "'+READER+'" LOGIN PASSWORD \''+password+'\' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT');roleCreated=true;
    await psql(DB,'reader-grants-proposal.sql');
    const text='Synthetic formal staging agreement only.',sha=createHash('sha256').update(text).digest('hex');
    const actor='111111111111111111',approver='222222222222222222',time=new Date().toISOString(),key='formal-ethical-hacking';
    await owner.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES ($1,$2,$3)',['staging-fixture-v1',text,sha]);
    await owner.query(`INSERT INTO certification_enrollments(discord_user_id,student_id,status,agreement_version,agreement_content_sha256,
      acknowledged_at,signature_method,learner_confirmed_read_at,comprehension_passed_at,comprehension_check_version,
      approved_by,approved_at,age_eligible,age_declared_at,age_declaration_version)
      VALUES($1,'SYNTHETIC-STAGING-ONLY','approved','staging-fixture-v1',$2,$3,'discord_account',$3,$3,'staging-check-v1',$4,$3,true,$3,'adult-18-v1')`,[actor,sha,time,approver]);
    await owner.query("INSERT INTO certification_course_enrollments(discord_user_id,course_key,status,assigned_at,assigned_by) VALUES($1,$2,'active',$3,$4)",[actor,key,time,approver]);
    const workerUrl=new URL(ownerUrl.href);workerUrl.username=READER;workerUrl.password=password;
    worker=new pg.Pool({connectionString:workerUrl.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c default_transaction_read_only=on -c statement_timeout=2000 -c lock_timeout=1000'});
    const config={enabled:true,enrollmentSubmissionEnabled:false,activeAgreementVersion:'staging-fixture-v1',activeAgreementSha256:sha,comprehensionCheck:{version:'staging-check-v1'}};
    authorize=createFormalReviewAuthorization({enabled:true,reviewOnly:true,readPool:worker,config});
    await t.test('restricted login passes actual schema agreement and policy reads',async()=>{
      assert.equal((await worker.query('SELECT current_user AS role')).rows[0].role,READER);
      await validateCertificationSchema(worker);await validateActiveEnrollmentAgreement(worker,config);
      assert.deepEqual(await authorize(actor,key),{student_id:'SYNTHETIC-STAGING-ONLY',course_key:key});
    });
    await t.test('reader cannot read old intake or ungranted audit records',async()=>{
      await assert.rejects(worker.query('SELECT * FROM fi_stage.records'),error=>error.code==='42501');
      await assert.rejects(worker.query('SELECT * FROM public.certification_audit_events'),error=>error.code==='42501');
    });
    await t.test('table ACLs reject an update even after disabling the transaction default',async()=>{
      const client=await worker.connect();
      try{await client.query('SET default_transaction_read_only=off');
        await assert.rejects(client.query("UPDATE public.certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[actor]),error=>error.code==='42501');
      }finally{try{await client.query('SET default_transaction_read_only=on');}finally{client.release();}}
      assert.equal((await owner.query('SELECT status FROM certification_enrollments WHERE discord_user_id=$1',[actor])).rows[0].status,'approved');
    });
    await t.test('grant proposal refuses preexisting effective table write authority',async()=>{
      await owner.query('GRANT UPDATE ON public.certification_enrollments TO "'+READER+'"');
      try{await assert.rejects(psql(DB,'reader-grants-proposal.sql'),error=>{assert.match(error.stderr,/unreviewed table authority/);return true;});}
      finally{await owner.query('REVOKE UPDATE ON public.certification_enrollments FROM "'+READER+'"');}
    });
    await t.test('committed course-access revocation is visible through the reader',async()=>{
      await owner.query("UPDATE certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[actor]);
      assert.equal(await authorize(actor,key),null);
    });
  }finally{
    authorize?.dispose();
    try{if(worker)await worker.end();}finally{
      try{if(owner)await owner.end();}finally{
        try{if(databaseCreated)await admin.query('DROP DATABASE "'+DB+'" WITH (FORCE)');}finally{
          try{if(roleCreated)await admin.query('DROP ROLE "'+READER+'"');}finally{await admin.end();}
        }
      }
    }
  }
});
