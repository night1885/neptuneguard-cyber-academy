import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
import {createCertificationCourseRemoval} from './certification-course-removal.mjs';
import {createCertificationSubmission} from './certification-submission.js';
import {createCertificationService} from './certification-service.js';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('removal-aware review authorization with a real restricted reader',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');
 for(const key of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[key]||'','');
 const baseUrl=new URL(url);assert.ok(['postgres:','postgresql:'].includes(baseUrl.protocol));assert.equal(baseUrl.hostname,'127.0.0.1');assert.equal(baseUrl.port,'5432');assert.equal(baseUrl.pathname,'/formal_review_test');assert.equal(baseUrl.username,'formal_review_admin');assert.equal(baseUrl.search,'');assert.equal(baseUrl.hash,'');
 const {default:pg}=await import('pg'),database='review_gate_'+randomUUID().replaceAll('-',''),role='review_reader_'+randomUUID().replaceAll('-',''),password=randomUUID();
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=15000 -c lock_timeout=5000'});
 const O='100000000000000001',A='100000000000000002',G='100000000000000003',C='100000000000000004',KEY='ethical-hacking-reading',OTHER='fixture-other';
 let databaseCreated=false,roleCreated=false,db,reader,removal;const adapters=[];
 try{
  const identity=(await admin.query('SELECT current_database() AS db,current_user AS login,current_setting(\'server_version_num\')::int AS version')).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  await admin.query(`CREATE DATABASE "${database}"`);databaseCreated=true;
  const writeUrl=new URL(baseUrl.href);writeUrl.pathname='/'+database;db=new pg.Pool({connectionString:writeUrl.href,max:3,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=10000 -c lock_timeout=3000'});
  assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  for(const filename of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','013-course-removal-events.sql'])await db.query(await readFile(new URL('./migrations/'+filename,import.meta.url),'utf8'));
  const content='Disposable removal reader agreement.',digest=createHash('sha256').update(content).digest('hex'),config={enabled:true,courseRemovalEnabled:true,ownerId:O,enrollmentSubmissionEnabled:true,activeAgreementVersion:'reader-fixture',activeAgreementSha256:digest,comprehensionCheck:{version:'reader-check',correctAnswers:['stop']}};
  await db.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',[config.activeAgreementVersion,content,digest]);
  await createCertificationSubmission(db,config).submitEnrollment(A,{ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,agreementVersion:config.activeAgreementVersion,agreementSha256:digest,comprehensionCheckVersion:config.comprehensionCheck.version,answers:['stop']});
  const approval=await createCertificationService(db,config).approveEnrollment(O,A);
  removal=createCertificationCourseRemoval(db,config,{courseKeys:[KEY,OTHER],isReady:()=>true});await removal.assignCourses(O,A,[KEY,OTHER]);
  await db.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await db.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO "${role}"; GRANT SELECT ON public.certification_enrollments,public.certification_course_enrollments TO "${role}"; GRANT SELECT(discord_user_id,course_key) ON public.certification_course_removals TO "${role}"; ALTER ROLE "${role}" SET default_transaction_read_only=on`);
  const readUrl=new URL(writeUrl.href);readUrl.username=role;readUrl.password=password;reader=new pg.Pool({connectionString:readUrl.href,max:2,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=2000 -c lock_timeout=1000'});
  function adapter(){const value=createFormalReviewCourseAuthorization({enabled:true,guildId:G,ownerId:O,readPool:reader,config,expectedDatabase:database,expectedLogin:role,isReady:()=>true});adapters.push(value);return value;}
  const gate=adapter();assert.deepEqual(await gate.initialize(),{ready:true});
  const scope={actorId:A,guildId:G,learnerId:A,studentId:approval.studentId,courseKey:KEY,exerciseKey:'EH-NET-02',workId:randomUUID(),sourceChannelId:C};
  for(const actorId of [A,O])assert.deepEqual(await gate.authorizeCourse({...scope,actorId}),{studentId:approval.studentId,courseKey:KEY});
  const before=(await db.query('SELECT status,student_id FROM certification_enrollments WHERE discord_user_id=$1',[A])).rows[0];
  const receipt=await removal.removeCourse(O,A,KEY);assert.equal(receipt.ok,true);assert.equal(receipt.deletionAuthorized,false);assert.equal(Date.parse(receipt.eligibleAt)-Date.parse(receipt.removedAt),86400000);
  for(const actorId of [A,O])assert.equal(await gate.authorizeCourse({...scope,actorId}),null);assert.equal(await gate.authorizeCourse(scope),null);
  assert.ok(await removal.getCourseAuthorization(A,OTHER));assert.deepEqual((await db.query('SELECT status,student_id FROM certification_enrollments WHERE discord_user_id=$1',[A])).rows[0],before);
  assert.equal((await db.query('SELECT status FROM certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2',[A,KEY])).rows[0].status,'active');
  const original=(await db.query('SELECT reference,removed_at FROM certification_course_removals WHERE discord_user_id=$1 AND course_key=$2',[A,KEY])).rows[0];
  const retry=await removal.removeCourse(O,A,KEY);assert.equal(retry.reference,original.reference);assert.equal(retry.removedAt,original.removed_at.toISOString());assert.equal(retry.eligibleAt,receipt.eligibleAt);
  await assert.rejects(reader.query('SELECT removed_at FROM public.certification_course_removals'),e=>e.code==='42501');
  await assert.rejects(reader.query('SELECT * FROM public.certification_audit_events'),e=>e.code==='42501');
  await assert.rejects(reader.query('DELETE FROM public.certification_course_removals'),e=>['25006','42501'].includes(e.code));
  await db.query(`GRANT UPDATE(removed_at) ON public.certification_course_removals TO "${role}"`);
  const unsafe=adapter();await assert.rejects(unsafe.initialize(),/authorization unavailable/);assert.equal(unsafe.ready,false);unsafe.dispose();await unsafe.drain();
  await db.query(`REVOKE UPDATE(removed_at) ON public.certification_course_removals FROM "${role}"; REVOKE SELECT(course_key) ON public.certification_course_removals FROM "${role}"`);
  const unreadable=adapter();await assert.rejects(unreadable.initialize(),/authorization unavailable/);assert.equal(unreadable.ready,false);unreadable.dispose();await unreadable.drain();
  await db.query(`GRANT SELECT(course_key) ON public.certification_course_removals TO "${role}"`);
  gate.dispose();await gate.drain();const recreated=adapter();assert.deepEqual(await recreated.initialize(),{ready:true});assert.equal(await recreated.authorizeCourse(scope),null);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM certification_audit_events WHERE action='course_removed'")).rows[0].n,1);
 }finally{
  for(const a of adapters)a.dispose();removal?.dispose();await Promise.all([...adapters.map(a=>a.drain()),removal?.drain()]);await Promise.all([reader?.end(),db?.end()]);
  try{if(databaseCreated)await admin.query(`DROP DATABASE "${database}"`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}
 }
});
