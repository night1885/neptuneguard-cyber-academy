import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { loadCertificationConfig } from './certification-config.js';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy } from './certification-registration-pilot-guard.js';
import { createOwnerRegistrationService } from './certification-owner-registration.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createCertificationService } from './certification-service.js';
import { createReadOnlyPreviewPool } from './certification-read-only-preview.js';
import { validateCertificationSchema, validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';
const databaseUrl=process.env.CERTIFICATION_TEST_DATABASE_URL;
test('disposable restricted-role registration pilot PostgreSQL acceptance',{skip:!databaseUrl,timeout:120000},async t=>{
  assert.equal(process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL,'true');
  const url=new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname,'/certification_test');assert.equal(url.search,'');assert.equal(url.hash,'');
  const suffix=randomUUID().replaceAll('-',''),schema='pilot_test_'+suffix,role='pilot_role_'+suffix,password=randomUUID();
  const admin=new pg.Pool({connectionString:databaseUrl,ssl:false,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=5000`});
  const owner='1'.repeat(18),[first,race,auditFail,uninvited,duplicate]=['2','6','7','8','9'].map(x=>x.repeat(18)),outsider='5'.repeat(18);
  let schemaCreated=false,roleCreated=false,worker,checkouts=0;
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`);schemaCreated=true;
    for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql'])await admin.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
    const content='Disposable registration pilot PostgreSQL agreement.',hash=createHash('sha256').update(content).digest('hex');
    await admin.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',['pilot-fixture-v1',content,hash]);
    await admin.query(`CREATE TABLE "${schema}".pilot_write_probe(id integer PRIMARY KEY,value integer NOT NULL)`);
    await admin.query(`INSERT INTO "${schema}".pilot_write_probe VALUES(1,0)`);
    await admin.query(`CREATE FUNCTION "${schema}".write_probe() RETURNS integer LANGUAGE plpgsql AS 'BEGIN UPDATE "${schema}".pilot_write_probe SET value=value+1 WHERE id=1; RETURN 1; END;'`);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT, UPDATE(version) ON certification_agreements TO "${role}"`);
    await admin.query(`GRANT SELECT, INSERT(discord_user_id,status) ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT UPDATE(status,agreement_version,agreement_content_sha256,acknowledgment_name,signature_method,signature_reference,acknowledged_at,learner_confirmed_read_at,comprehension_passed_at,comprehension_check_version,age_eligible,age_declared_at,age_declaration_version,status_reason,updated_at) ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT INSERT, SELECT(actor_discord_user_id,subject_discord_user_id,action) ON certification_audit_events TO "${role}"`);
    await admin.query(`GRANT SELECT ON certification_lab_requests TO "${role}"`);
    await admin.query(`GRANT USAGE ON ALL SEQUENCES IN SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON "${schema}".pilot_write_probe TO "${role}"`);
    await admin.query(`GRANT EXECUTE ON FUNCTION "${schema}".write_probe() TO "${role}"`);
    const workerUrl=new URL(databaseUrl);workerUrl.username=role;workerUrl.password=password;
    worker=new pg.Pool({connectionString:workerUrl.href,ssl:false,max:4,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=5000 -c lock_timeout=2000`});
    const backing={query:(...args)=>worker.query(...args),async connect(){checkouts++;return worker.connect();},end:()=>worker.end()};
    const views=createReadOnlyPreviewPool(backing);
    const env={CERTIFICATION_REGISTRATION_PILOT:'true',CERTIFICATION_ENABLED:'true',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSES_ENABLED:'false',ACADEMY_OWNER_ID:owner,ACADEMY_ADMIN_CHANNEL_ID:'4'.repeat(18),GUILD_ID:'3'.repeat(18),CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS:[first,race,auditFail,uninvited,duplicate].join(','),CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'pilot-fixture-v1',agreementSha256:hash,comprehensionCheck:{version:'pilot-check',questions:[{prompt:'Type A.'}],correctAnswers:['A']}})};
    const settings=readRegistrationPilotOptions(env),base=loadCertificationConfig(env),policy=createRegistrationPilotPolicy(settings),config=Object.freeze({...base,registrationPilotEnabled:true,registrationPilotPolicy:policy});
    const registration=createOwnerRegistrationService(backing,config),submission=createCertificationSubmission(backing,config),access=createCertificationService(views,config);
    const payload={ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,agreementVersion:'pilot-fixture-v1',agreementSha256:hash,comprehensionCheckVersion:'pilot-check',answers:['A']};
    const snapshot=async id=>({records:(await admin.query('SELECT row_to_json(e)::text AS state FROM certification_enrollments e WHERE discord_user_id=$1',[id])).rows,events:(await admin.query('SELECT row_to_json(a)::text AS state FROM certification_audit_events a WHERE subject_discord_user_id=$1 ORDER BY event_id',[id])).rows});
    await t.test('real restricted login, writable default and readonly startup checks',async()=>{
      assert.deepEqual((await worker.query('SELECT current_user AS current,session_user AS session')).rows[0],{current:role,session:role});
      const flags=(await worker.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=current_user')).rows[0];assert.ok(Object.values(flags).every(v=>v===false));
      assert.equal((await worker.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'off');
      await validateCertificationSchema(views);await validateActiveEnrollmentAgreement(views,config);
    });
    await t.test('view facade blocks DML CTE and function writes on writable backing',async()=>{
      await worker.query(`UPDATE "${schema}".pilot_write_probe SET value=1 WHERE id=1`);
      const before=checkouts;await assert.rejects(views.connect());await assert.rejects(views.query(`UPDATE "${schema}".pilot_write_probe SET value=2`));assert.equal(checkouts,before);
      await assert.rejects(views.query(`WITH removed AS (DELETE FROM "${schema}".pilot_write_probe RETURNING id) SELECT * FROM removed`),e=>e.code==='25006');
      await assert.rejects(views.query(`SELECT "${schema}".write_probe()`),e=>e.code==='25006');
      assert.deepEqual((await views.query(`SELECT id,value FROM "${schema}".pilot_write_probe`)).rows,[{id:1,value:1}]);
      assert.equal((await worker.query(`UPDATE "${schema}".pilot_write_probe SET value=value WHERE id=1 RETURNING value`)).rows[0].value,1);
    });
    await t.test('unlisted actors and general submissions fail before service checkout',async()=>{
      const before=checkouts;await assert.rejects(registration.register(owner,outsider));await assert.rejects(registration.register(first,first));await assert.rejects(submission.submitInvitedEnrollment(outsider,payload));await assert.rejects(submission.submitEnrollment(first,payload));assert.equal(checkouts,before);assert.deepEqual(await snapshot(outsider),{records:[],events:[]});
    });
    await t.test('listed registration and personal submission reach complete pending only',async()=>{
      assert.equal((await registration.register(owner,first)).created,true);assert.equal((await submission.submitInvitedEnrollment(first,payload)).status,'pending');
      const record=(await admin.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1',[first])).rows[0];assert.equal(hasCompleteAccountAcknowledgment(record),true);for(const field of ['student_id','approved_by','approved_at','acknowledgment_name','signature_reference'])assert.equal(record[field],null);
      assert.equal(await access.getCourseAuthorization(first),null);const before=await snapshot(first);await assert.rejects(submission.submitInvitedEnrollment(first,payload),/invitation required/);assert.deepEqual(await snapshot(first),before);
    });
    await t.test('concurrent invited requests produce one transition and one submission audit',async()=>{
      await registration.register(owner,race);const outcomes=await Promise.allSettled([submission.submitInvitedEnrollment(race,payload),submission.submitInvitedEnrollment(race,payload)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);
      assert.equal((await admin.query('SELECT status,student_id FROM certification_enrollments WHERE discord_user_id=$1',[race])).rows[0].status,'pending');assert.equal((await admin.query("SELECT COUNT(*)::int AS n FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='enrollment_submitted'",[race])).rows[0].n,1);assert.equal(await access.getCourseAuthorization(race),null);
    });
    await t.test('concurrent owner registration is duplicate-safe',async()=>{
      const results=await Promise.all([registration.register(owner,duplicate),registration.register(owner,duplicate)]);assert.equal(results.filter(x=>x.created).length,1);assert.equal((await admin.query("SELECT COUNT(*)::int AS n FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='student_registered_by_owner'",[duplicate])).rows[0].n,1);
    });
    await t.test('allowlisting alone does not establish an owner invitation',async()=>{
      await admin.query("INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment')",[uninvited]);const before=await snapshot(uninvited);await assert.rejects(submission.submitInvitedEnrollment(uninvited,payload),/invitation required/);assert.deepEqual(await snapshot(uninvited),before);
    });
    await t.test('real audit failure rolls back acknowledgment and permits retry',async()=>{
      await registration.register(owner,auditFail);await admin.query(`ALTER TABLE certification_audit_events ADD CONSTRAINT pilot_submission_audit_fail CHECK (NOT (subject_discord_user_id='${auditFail}' AND action='enrollment_submitted'))`);const before=await snapshot(auditFail);await assert.rejects(submission.submitInvitedEnrollment(auditFail,payload));assert.deepEqual(await snapshot(auditFail),before);
      await admin.query('ALTER TABLE certification_audit_events DROP CONSTRAINT pilot_submission_audit_fail');assert.equal((await submission.submitInvitedEnrollment(auditFail,payload)).status,'pending');assert.equal(await access.getCourseAuthorization(auditFail),null);
    });
    await t.test('approval metadata, audit deletion and safeguards remain outside role privileges',async()=>{
      for(const sql of [`UPDATE certification_enrollments SET student_id='NG-PT-blocked-fixture',approved_by='${owner}',approved_at=NOW()`,'DELETE FROM certification_enrollments',"UPDATE certification_audit_events SET action='blocked'",'DELETE FROM certification_audit_events','TRUNCATE certification_audit_events',"UPDATE certification_lab_requests SET status='revoked'",'ALTER TABLE certification_enrollments DISABLE TRIGGER certification_student_id_immutable',`CREATE TABLE "${schema}".blocked_fixture(id integer)`])await assert.rejects(worker.query(sql),e=>e.code==='42501');
      await assert.rejects(worker.query("UPDATE certification_agreements SET version='blocked' WHERE version='pilot-fixture-v1'"),e=>e.code==='P0001'&&/immutable/.test(e.message));
      assert.equal((await admin.query('SELECT COUNT(*)::int AS n FROM certification_enrollments WHERE student_id IS NOT NULL OR approved_by IS NOT NULL OR approved_at IS NOT NULL')).rows[0].n,0);
    });
  }finally{
    try{if(worker)await worker.end();}finally{try{if(schemaCreated)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
  }
});
