import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createCertificationSubmission} from './certification-submission.js';
import {createCertificationService} from './certification-service.js';
import {createCertificationCourseLifecycle} from './certification-course-lifecycle.js';
import {createSharedEnrollmentRetentionExecutor} from './certification-retention-shared-executor.js';
import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const url=process.env.CERTIFICATION_TEST_DATABASE_URL,opted=process.env.CERTIFICATION_TEST_ALLOW_ROLE_DDL==='true';
const owner='1223123544301633567',subject='1223123544301633568',other='1223123544301633569';
const fmt='YYYY-MM-DD"T"HH24:MI:SS.US"Z"';
async function isolated(operation,{partial=false,status='approved'}={}){
  const suffix=randomUUID().replaceAll('-',''),schema=`shared_ret_${suffix}`,role=`shared_exec_${suffix}`,password=randomUUID();
  let base;
  const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c statement_timeout=15000 -c lock_timeout=2000`});
  let created=false,roleCreated=false,worker;
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE SCHEMA "${schema}"`);created=true;
    for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql'])await admin.query(await readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
    const content='Disposable shared-retention fixture; not a production agreement.',digest=createHash('sha256').update(content).digest('hex');
    const settings={enabled:true,ownerId:owner,enrollmentSubmissionEnabled:true,activeAgreementVersion:'shared-fixture',activeAgreementSha256:digest,comprehensionCheck:{version:'shared-check',correctAnswers:['stop']}};
    await admin.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',[settings.activeAgreementVersion,content,digest]);
    await createCertificationSubmission(admin,settings).submitEnrollment(subject,{ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,agreementVersion:settings.activeAgreementVersion,agreementSha256:digest,comprehensionCheckVersion:'shared-check',answers:['stop']});
    await createCertificationService(admin,settings).approveEnrollment(owner,subject);
    base=Date.now()+1000;
    let clock=base;const lifecycle=createCertificationCourseLifecycle(admin,settings,{courseKeys:['fixture-one','fixture-two'],now:()=>new Date(clock)});
    await lifecycle.assignCourses(owner,subject,['fixture-one','fixture-two']);clock=base+1000;await lifecycle.completeCourse(owner,subject,'fixture-one');
    if(!partial){clock=base+2000;await lifecycle.completeCourse(owner,subject,'fixture-two');}
    if(status!=='approved')await admin.query('UPDATE certification_enrollments SET status=$2 WHERE discord_user_id=$1',[subject,status]);
    await admin.query("INSERT INTO certification_enrollments(discord_user_id,status) VALUES($1,'awaiting_acknowledgment')",[other]);
    await admin.query("INSERT INTO certification_lab_requests(request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES($1,$2,'fixture','fixture',NOW())",[randomUUID(),other]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
    await admin.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
    await admin.query(`GRANT SELECT(discord_user_id,status,student_id,approved_by,approved_at,application_closed_at,application_closed_by,application_closed_as),UPDATE(updated_at),DELETE ON certification_enrollments TO "${role}"`);
    await admin.query(`GRANT SELECT(discord_user_id,course_key,status,assigned_at,assigned_by,completed_at,completed_by),DELETE ON certification_course_enrollments TO "${role}"`);
    await admin.query(`GRANT SELECT(discord_user_id) ON certification_lab_requests TO "${role}"`);
    const connection=new URL(url);connection.username=role;connection.password=password;
    worker=new pg.Pool({connectionString:connection.href,max:2,connectionTimeoutMillis:5000,options:`-c search_path=${schema} -c TimeZone=Pacific/Auckland -c statement_timeout=5000 -c lock_timeout=2000`});
    const now=()=>new Date(base+5000);let reviews=0;
    const config={ownerId:owner,executorRole:role,expectedDatabase:'certification_test',schema,enabled:true};
    const provider=async context=>{reviews++;return{...context,decision:'allow',reference:'fixture_review',reviewedAt:new Date(base+4900),expiresAt:new Date(base+65000)};};
    const executor=createSharedEnrollmentRetentionExecutor(worker,config,{reviewPreservation:provider,now});
    const hash=async()=>{
      const enrollment=(await admin.query(`SELECT discord_user_id,status,student_id,approved_by,to_char(approved_at AT TIME ZONE 'UTC','${fmt}') AS approved_at_utc,application_closed_at,application_closed_by,application_closed_as FROM certification_enrollments WHERE discord_user_id=$1`,[subject])).rows[0];
      const courses=(await admin.query(`SELECT discord_user_id,course_key,status,assigned_by,completed_by,to_char(assigned_at AT TIME ZONE 'UTC','${fmt}') AS assigned_at_utc,to_char(completed_at AT TIME ZONE 'UTC','${fmt}') AS completed_at_utc FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key`,[subject])).rows;
      return buildSharedCompletionSnapshot({database:'certification_test',schema,subjectId:subject,enrollment,courses,labCount:0,unreviewedDependencies:[],asOf:now()}).snapshotSha256;
    };
    const snapshot=async()=>{const result={};for(const [table,order]of[['certification_enrollments','discord_user_id'],['certification_course_enrollments','discord_user_id,course_key'],['certification_lab_requests','request_id'],['certification_audit_events','event_id']])result[table]=(await admin.query(`SELECT to_jsonb(t) AS record FROM ${table} t ORDER BY ${order}`)).rows;return result;};
    await operation({admin,worker,executor,config,provider,now,hash,snapshot,get reviews(){return reviews;}});
  }finally{try{if(worker)await worker.end();}finally{try{if(created)await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}}
}
// Fixture-only DDL/DML. Never invoke against Render or with production credentials.
test('disposable restricted shared enrollment retention acceptance',{skip:!url||!opted,timeout:120000},async t=>{
  const u=new URL(url);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname));assert.equal(u.pathname,'/certification_test');assert.equal(u.search,'');assert.equal(u.hash,'');
  for(const status of ['approved','suspended','revoked'])await t.test(`actual service-created ${status} completion deletes only its parent and children`,async()=>isolated(async f=>{
    const before=await f.snapshot(),expected=await f.hash(),result=await f.executor.execute(owner,subject,expected),after=await f.snapshot();
    assert.equal(result.deletedEnrollments,1);assert.equal(result.deletedCourses,2);
    assert.deepEqual(after.certification_enrollments,before.certification_enrollments.filter(r=>r.record.discord_user_id!==subject));
    assert.deepEqual(after.certification_course_enrollments,[]);for(const name of ['certification_lab_requests','certification_audit_events'])assert.deepEqual(after[name],before[name]);
    assert.equal((await f.executor.execute(owner,subject,expected)).outcome,'not_found');assert.equal(f.reviews,1);
    for(const sql of ['DELETE FROM certification_audit_events','DELETE FROM certification_lab_requests',"UPDATE certification_course_enrollments SET status='active'",'ALTER TABLE certification_enrollments ADD COLUMN forbidden_fixture text'])await assert.rejects(f.worker.query(sql),e=>e.code==='42501');
  },{status}));
  await t.test('partial completion blocks all deletion',async()=>isolated(async f=>{const before=await f.snapshot();await assert.rejects(f.executor.execute(owner,subject,'a'.repeat(64)));assert.deepEqual(await f.snapshot(),before);assert.equal(f.reviews,0);},{partial:true}));
  await t.test('concurrent executors delete the reviewed set at most once',async()=>isolated(async f=>{const expected=await f.hash();const results=await Promise.all([f.executor.execute(owner,subject,expected),f.executor.execute(owner,subject,expected)]);assert.deepEqual(results.map(r=>r.deletedEnrollments).sort(),[0,1]);assert.equal(results.reduce((n,r)=>n+r.deletedCourses,0),2);assert.equal(f.reviews,1);}));
  for(const blocker of ['lab','unknown_course_fk','cascade_fk','changed_status','hold','excess_privilege'])await t.test(`blocks ${blocker} and preserves every record`,async()=>isolated(async f=>{
    const expected=await f.hash();
    if(blocker==='lab')await f.admin.query("INSERT INTO certification_lab_requests(request_id,discord_user_id,lab_key,rules_version,rules_acknowledged_at) VALUES($1,$2,'fixture','fixture',NOW())",[randomUUID(),subject]);
    if(blocker==='unknown_course_fk')await f.admin.query('CREATE TABLE course_child(subject text,course text,FOREIGN KEY(subject,course) REFERENCES certification_course_enrollments(discord_user_id,course_key) ON DELETE CASCADE)');
    if(blocker==='cascade_fk')await f.admin.query('ALTER TABLE certification_course_enrollments DROP CONSTRAINT certification_course_enrollments_discord_user_id_fkey;ALTER TABLE certification_course_enrollments ADD CONSTRAINT certification_course_enrollments_discord_user_id_fkey FOREIGN KEY(discord_user_id) REFERENCES certification_enrollments(discord_user_id) ON DELETE CASCADE');
    if(blocker==='changed_status')await f.admin.query("UPDATE certification_enrollments SET status='suspended' WHERE discord_user_id=$1",[subject]);
    if(blocker==='excess_privilege')await f.admin.query(`GRANT DELETE ON certification_audit_events TO "${f.config.executorRole}"`);
    const executor=blocker==='hold'?createSharedEnrollmentRetentionExecutor(f.worker,f.config,{reviewPreservation:async()=>({decision:'hold'}),now:f.now}):f.executor;
    const before=await f.snapshot();await assert.rejects(executor.execute(owner,subject,expected));assert.deepEqual(await f.snapshot(),before);
  }));
  for(const stage of ['parent','commit'])await t.test(`failure at ${stage} restores actual course deletions`,async()=>isolated(async f=>{
    const wrapper={async connect(){const client=await f.worker.connect();return{query(sql,...args){if((stage==='commit'&&sql==='COMMIT')||(stage==='parent'&&sql.startsWith('DELETE FROM')&&sql.includes('RETURNING discord_user_id')))throw new Error('Injected fixture failure');return client.query(sql,...args);},release(v){client.release(v);}};}};
    const executor=createSharedEnrollmentRetentionExecutor(wrapper,f.config,{reviewPreservation:f.provider,now:f.now}),before=await f.snapshot();await assert.rejects(executor.execute(owner,subject,await f.hash()));assert.deepEqual(await f.snapshot(),before);
  }));
  await t.test('a racing active-course insertion cannot survive successful parent deletion',async()=>isolated(async f=>{
    const expected=await f.hash();const [deletion,insertion]=await Promise.allSettled([f.executor.execute(owner,subject,expected),f.admin.query('INSERT INTO certification_course_enrollments(discord_user_id,course_key,status,assigned_at,assigned_by) VALUES($1,$2,$3,$4,$5)',[subject,'race-course','active',new Date(),owner])]);
    assert.ok(!(deletion.status==='fulfilled'&&insertion.status==='fulfilled'));
    const parent=(await f.admin.query('SELECT discord_user_id FROM certification_enrollments WHERE discord_user_id=$1',[subject])).rows;
    const courses=(await f.admin.query('SELECT course_key FROM certification_course_enrollments WHERE discord_user_id=$1',[subject])).rows;
    if(!parent.length){assert.equal(deletion.status,'fulfilled');assert.equal(deletion.value.deletedEnrollments,1);assert.equal(insertion.status,'rejected');assert.deepEqual(courses,[]);}else{assert.equal(deletion.status,'rejected');assert.ok(courses.some(r=>r.course_key==='fixture-one')&&courses.some(r=>r.course_key==='fixture-two'));if(insertion.status==='fulfilled')assert.ok(courses.some(r=>r.course_key==='race-course'));}
  }));
});
