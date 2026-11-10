import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createCertificationSubmission} from './certification-submission.js';
import {createCertificationService} from './certification-service.js';
import {createCertificationCourseLifecycle} from './certification-course-lifecycle.js';
import {createFormalReviewProvisioner} from './formal-review-provisioning.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('atomic review work and binding provisioning with restricted writer',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const u=new URL(url);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'5432');assert.equal(u.pathname,'/formal_review_test');assert.equal(u.username,'formal_review_admin');assert.equal(u.search,'');assert.equal(u.hash,'');
 const {default:pg}=await import('pg'),suffix=randomUUID().replaceAll('-',''),database='provision_'+suffix,role='provisioner_'+suffix,password=randomUUID(),opt={max:2,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=5000 -c lock_timeout=2000'},admin=new pg.Pool({...opt,connectionString:url});
 const G='100000000000000001',A='100000000000000002',O='100000000000000003',KEY='ethical-hacking-reading';let db,writer,service,created=false,roleCreated=false,privacy=true;
 try{
  const p=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(p.db,'formal_review_test');assert.equal(p.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(p.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);created=true;u.pathname='/'+database;db=new pg.Pool({...opt,connectionString:u.href});
  assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  for(const name of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','012-formal-review.sql','013-course-removal-events.sql','014-formal-review-assignment-bindings.sql'])await db.query(await readFile(new URL('./migrations/'+name,import.meta.url),'utf8'));
  const text='Disposable provisioning agreement.',hash=createHash('sha256').update(text).digest('hex'),config={enabled:true,ownerId:O,enrollmentSubmissionEnabled:true,activeAgreementVersion:'provision-fixture',activeAgreementSha256:hash,comprehensionCheck:{version:'provision-check',correctAnswers:['stop']}};
  await db.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',[config.activeAgreementVersion,text,hash]);
  await createCertificationSubmission(db,config).submitEnrollment(A,{ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,agreementVersion:config.activeAgreementVersion,agreementSha256:hash,comprehensionCheckVersion:config.comprehensionCheck.version,answers:['stop']});
  const studentId=(await createCertificationService(db,config).approveEnrollment(O,A)).studentId,lifecycle=createCertificationCourseLifecycle(db,config,{courseKeys:[KEY]});await lifecycle.assignCourses(O,A,[KEY]);
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await db.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public,formal_review TO "${role}"; GRANT SELECT ON public.certification_enrollments,public.certification_course_enrollments,public.certification_course_removals TO "${role}"; GRANT UPDATE(updated_at) ON public.certification_enrollments TO "${role}"; GRANT UPDATE(completed_at) ON public.certification_course_enrollments TO "${role}"; GRANT SELECT,INSERT ON formal_review.work,formal_review.assignment_bindings TO "${role}"`);
  const wu=new URL(u.href);wu.username=role;wu.password=password;writer=new pg.Pool({...opt,connectionString:wu.href});
  service=createFormalReviewProvisioner({enabled:true,pool:writer,guildId:G,config,exerciseKeys:['EH-NET-02'],expectedDatabase:database,expectedLogin:role,isReady:()=>true,verifyAdministrator:async actor=>actor===O,authorizeExercise:async()=>true,verifyPrivateChannel:async()=>privacy,verifyConsent:async()=>true});await service.initialize();
  const scope={actorId:O,guildId:G,learnerId:A,studentId,courseKey:KEY,exerciseKey:'EH-NET-02',workId:randomUUID(),sourceChannelId:'100000000000000004'};
  const first=await service.provision(scope);assert.equal(first.ok,true);assert.equal(first.alreadyProvisioned,false);assert.equal(first.expiresAtMs-first.createdAtMs,86400000);
  const retry=await service.provision(scope);assert.equal(retry.alreadyProvisioned,true);assert.equal(retry.createdAtMs,first.createdAtMs);assert.equal(retry.expiresAtMs,first.expiresAtMs);
  const counts=async()=> (await db.query('SELECT (SELECT count(*)::int FROM formal_review.work) AS work,(SELECT count(*)::int FROM formal_review.assignment_bindings) AS bindings')).rows[0];assert.deepEqual(await counts(),{work:1,bindings:1});
  privacy=false;await assert.rejects(service.provision({...scope,workId:randomUUID(),sourceChannelId:'100000000000000005'}));privacy=true;assert.deepEqual(await counts(),{work:1,bindings:1});
  await assert.rejects(service.provision({...scope,studentId:'mismatched-id'}));
  await db.query("CREATE FUNCTION formal_review.reject_binding_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional binding failure'; END; $$; CREATE TRIGGER reject_binding_fixture BEFORE INSERT ON formal_review.assignment_bindings FOR EACH ROW EXECUTE FUNCTION formal_review.reject_binding_fixture()");
  await assert.rejects(service.provision({...scope,workId:randomUUID(),sourceChannelId:'100000000000000006'}));assert.deepEqual(await counts(),{work:1,bindings:1});await db.query('DROP TRIGGER reject_binding_fixture ON formal_review.assignment_bindings; DROP FUNCTION formal_review.reject_binding_fixture()');
  await lifecycle.completeCourse(O,A,KEY);await assert.rejects(service.provision({...scope,workId:randomUUID(),sourceChannelId:'100000000000000007'}));assert.deepEqual(await counts(),{work:1,bindings:1});
  await assert.rejects(writer.query("UPDATE public.certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[A]),e=>e.code==='42501');await assert.rejects(writer.query('SELECT body FROM formal_review.reports'),e=>e.code==='42501');
 }finally{service?.dispose();await service?.drain();await Promise.all([writer?.end(),db?.end()]);try{if(created)await admin.query(`DROP DATABASE "${database}"`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
});
