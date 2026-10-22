import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { validateManualReviewReadiness,manualReviewReadinessSql } from './certification-manual-review-readiness.mjs';
import { validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
const databaseUrl=process.env.CERTIFICATION_TEST_DATABASE_URL;
const enabled=process.env.CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DDL==='true';
const migrations=['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','008-lab-status-reason.sql','009-active-registration-provenance.sql'];
test('exact manual-review migration and restricted-login readiness reject invalid states',{skip:!databaseUrl||!enabled,timeout:90000},async()=>{
  const url=new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname,'/certification_test');assert.equal(url.search,'');assert.equal(url.hash,'');
  const admin=new pg.Pool({connectionString:databaseUrl,max:1,connectionTimeoutMillis:5000});
  const name=`cert_manual_review_${randomUUID().replaceAll('-','')}`;
  const role=`cert_mr_${randomUUID().replaceAll('-','')}`,password=randomUUID();
  assert.match(name,/^cert_manual_review_[a-f0-9]{32}$/);assert.match(role,/^cert_mr_[a-f0-9]{32}$/);
  let created=false,roleCreated=false,pool,restricted;
  try{
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;
    url.pathname=`/${name}`;
    pool=new pg.Pool({connectionString:url.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'});
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,name);
    for(const file of migrations)await pool.query(await readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
    const content='Disposable manual-review agreement fixture.',hash=createHash('sha256').update(content).digest('hex'),now='2026-10-22T12:00:00Z';
    await pool.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',['fixture-v1',content,hash]);
    await pool.query(`INSERT INTO certification_enrollments(discord_user_id,status,signature_method,agreement_version,agreement_content_sha256,acknowledged_at,learner_confirmed_read_at,comprehension_passed_at,comprehension_check_version,age_eligible,age_declared_at,age_declaration_version) VALUES('111111111111111111','pending','discord_account','fixture-v1',$1,$2,$2,$2,'check-v1',true,$2,'adult-18-v1')`,[hash,now]);
    await pool.query("INSERT INTO certification_enrollments(discord_user_id,status,registration_owner_id) VALUES('111111111111111112','awaiting_acknowledgment','222222222222222222')");
    const before=(await pool.query('SELECT to_jsonb(e) AS record FROM certification_enrollments e ORDER BY discord_user_id')).rows;
    const aclSql="SELECT relacl::text AS acl FROM pg_class WHERE oid='public.certification_enrollments'::regclass",acl=(await pool.query(aclSql)).rows;
    const migration=await readFile(new URL('./migrations/010-manual-review-enrollment.sql',import.meta.url),'utf8');
    await pool.query(migration);
    assert.deepEqual((await pool.query("SELECT to_jsonb(e)-'comprehension_submitted_at'-'comprehension_review_snapshot' AS record FROM certification_enrollments e ORDER BY discord_user_id")).rows,before);
    assert.deepEqual((await pool.query(aclSql)).rows,acl);
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM certification_enrollments WHERE comprehension_submitted_at IS NOT NULL OR comprehension_review_snapshot IS NOT NULL')).rows[0].n),0);
    const constraints=(await pool.query("SELECT convalidated FROM pg_constraint WHERE conrelid='public.certification_enrollments'::regclass AND conname=ANY($1::text[])",[['certification_manual_review_snapshot_complete','certification_account_acknowledgment_required']])).rows;
    assert.equal(constraints.length,2);assert.ok(constraints.every(row=>row.convalidated===true));
    assert.deepEqual((await pool.query("SELECT prosecdef,provolatile,proparallel,proconfig FROM pg_proc WHERE oid='public.certification_valid_manual_review_snapshot(jsonb)'::regprocedure")).rows[0],{prosecdef:false,provolatile:'i',proparallel:'s',proconfig:['search_path=pg_catalog']});
    const snapshot=createManualReviewSnapshot({comprehensionCheck:{version:'check-v1',questions:[{prompt:'Fixture question?'}],correctAnswers:['Expected fixture answer']}},['Different learner response']);
    const columns=['discord_user_id','status','signature_method','agreement_version','agreement_content_sha256','acknowledged_at','learner_confirmed_read_at','comprehension_passed_at','comprehension_check_version','age_eligible','age_declared_at','age_declaration_version','comprehension_submitted_at','comprehension_review_snapshot'];
    const base=[null,'pending','discord_account','fixture-v1',hash,now,now,null,'check-v1',true,now,'adult-18-v1',now,snapshot];let next=111111111111111113n;
    const insert=(index=-1,value=null)=>{const values=[...base];values[0]=String(next++);if(index>=0)values[index]=value;return pool.query(`INSERT INTO certification_enrollments(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`,values);};
    const row=(await insert()).rows[0];assert.equal(row.status,'pending');assert.deepEqual(row.comprehension_review_snapshot,snapshot);
    for(const field of ['comprehension_passed_at','student_id','approved_by','approved_at'])assert.equal(row[field],null);
    for(const [index,value] of [[12,null],[13,null],[7,now],[8,'other-v1'],[8,null],[6,null],[9,false],[10,null],[11,'unknown']])await assert.rejects(insert(index,value),error=>error.code==='23514');
    const invalid=[null,[],{}, {...snapshot,extra:true},{...snapshot,items:[]},{...snapshot,items:Array(4).fill(snapshot.items[0])}];
    for(const field of ['question','response','expectedAnswer'])for(const value of ['', '   ','\t\r\n','\u00a0\ufeff',null,42,'x'.repeat(field==='question'?301:101)])invalid.push({...snapshot,items:[{...snapshot.items[0],[field]:value}]});
    invalid.push({...snapshot,items:[{...snapshot.items[0],extra:true}]});
    for(const value of invalid){assert.equal((await pool.query('SELECT public.certification_valid_manual_review_snapshot($1::jsonb) AS valid',[JSON.stringify(value)])).rows[0].valid,false);await assert.rejects(insert(13,value),error=>error.code==='23514');}
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM certification_enrollments')).rows[0].n),3);

    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
    await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await pool.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await pool.query(`GRANT CONNECT,TEMPORARY ON DATABASE "${name}" TO "${role}"`);
    await pool.query(`GRANT SELECT ON public.certification_enrollments TO "${role}"`);
    await pool.query(`GRANT SELECT(version,content,content_sha256) ON public.certification_agreements TO "${role}"`);
    const restrictedUrl=new URL(url);restrictedUrl.username=role;restrictedUrl.password=password;
    restricted=new pg.Pool({connectionString:restrictedUrl.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'});
    assert.deepEqual((await restricted.query('SELECT current_user AS current,session_user AS session,current_database() AS database')).rows[0],{current:role,session:role,database:name});
    const blocked=()=>assert.rejects(validateManualReviewReadiness(restricted),/Manual-review readiness failed/);
    const ready=async()=>assert.deepEqual(await validateManualReviewReadiness(restricted),{ready:true});
    const config={manualReviewEnabled:true,activeAgreementVersion:'fixture-v1',activeAgreementSha256:hash};
    await validateActiveEnrollmentAgreement(restricted,{...config,manualReviewEnabled:false});
    await assert.rejects(validateActiveEnrollmentAgreement(restricted,config),/Manual-review readiness failed/);
    await blocked();
    await pool.query(`GRANT UPDATE(comprehension_submitted_at,comprehension_review_snapshot) ON public.certification_enrollments TO "${role}"`);
    await ready();await validateActiveEnrollmentAgreement(restricted,config);
    await assert.rejects(validateActiveEnrollmentAgreement(restricted,{...config,activeAgreementSha256:'0'.repeat(64)}),/content hash does not match/);
    for(const action of ['INSERT(comprehension_review_snapshot)','DELETE']){
      await pool.query(`GRANT ${action} ON public.certification_enrollments TO "${role}"`);await blocked();
      await pool.query(`REVOKE ${action} ON public.certification_enrollments FROM "${role}"`);await ready();
    }
    await pool.query(`REVOKE UPDATE(comprehension_review_snapshot) ON public.certification_enrollments FROM "${role}"`);await blocked();
    await pool.query(`GRANT UPDATE(comprehension_review_snapshot) ON public.certification_enrollments TO "${role}"`);await ready();
    await restricted.query('CREATE TEMP TABLE certification_enrollments(dummy text)');await blocked();
    await restricted.query('DROP TABLE pg_temp.certification_enrollments');await ready();
    await pool.query('ALTER TABLE public.certification_enrollments ENABLE ROW LEVEL SECURITY');await blocked();
    await pool.query('ALTER TABLE public.certification_enrollments DISABLE ROW LEVEL SECURITY');await ready();
    await pool.query("ALTER TABLE public.certification_enrollments ALTER COLUMN comprehension_review_snapshot SET DEFAULT '{}'::jsonb");await blocked();
    await pool.query('ALTER TABLE public.certification_enrollments ALTER COLUMN comprehension_review_snapshot DROP DEFAULT');await ready();
    await pool.query('ALTER FUNCTION public.certification_valid_manual_review_snapshot(jsonb) STABLE');await blocked();
    await pool.query('ALTER FUNCTION public.certification_valid_manual_review_snapshot(jsonb) IMMUTABLE');await ready();
    await pool.query('ALTER FUNCTION public.certification_valid_manual_review_snapshot(jsonb) SECURITY DEFINER');await blocked();
    await pool.query('ALTER FUNCTION public.certification_valid_manual_review_snapshot(jsonb) SECURITY INVOKER');await ready();
    const metadata=(await pool.query(manualReviewReadinessSql)).rows[0];
    await pool.query('ALTER TABLE public.certification_enrollments DROP CONSTRAINT certification_manual_review_snapshot_complete');
    await pool.query('ALTER TABLE public.certification_enrollments ADD CONSTRAINT certification_manual_review_snapshot_complete CHECK (public.certification_valid_manual_review_snapshot(comprehension_review_snapshot) OR true)');
    assert.equal((await pool.query(manualReviewReadinessSql)).rows[0].function_dependencies,true);await blocked();
    await pool.query('ALTER TABLE public.certification_enrollments DROP CONSTRAINT certification_manual_review_snapshot_complete');
    await pool.query(`ALTER TABLE public.certification_enrollments ADD CONSTRAINT certification_manual_review_snapshot_complete ${metadata.snapshot_constraint} NOT VALID`);await blocked();
    await pool.query('ALTER TABLE public.certification_enrollments VALIDATE CONSTRAINT certification_manual_review_snapshot_complete');await ready();
    const weaker=metadata.acknowledgment_constraint.replace('^[0-9]{17,20}$','.*');assert.notEqual(weaker,metadata.acknowledgment_constraint);
    await pool.query('ALTER TABLE public.certification_enrollments DROP CONSTRAINT certification_account_acknowledgment_required');
    await pool.query(`ALTER TABLE public.certification_enrollments ADD CONSTRAINT certification_account_acknowledgment_required ${weaker}`);await blocked();
    await pool.query('ALTER TABLE public.certification_enrollments DROP CONSTRAINT certification_account_acknowledgment_required');
    await pool.query(`ALTER TABLE public.certification_enrollments ADD CONSTRAINT certification_account_acknowledgment_required ${metadata.acknowledgment_constraint}`);await ready();
    await pool.query("CREATE OR REPLACE FUNCTION public.certification_valid_manual_review_snapshot(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS 'SELECT true'");await blocked();
    const start=migration.indexOf('CREATE FUNCTION '),end=migration.indexOf('$function$;',migration.indexOf('AS $function$'))+'$function$;'.length;
    assert.ok(start>=0&&end>start);
    await pool.query(migration.slice(start,end).replace('CREATE FUNCTION ','CREATE OR REPLACE FUNCTION '));await ready();
    assert.equal(Number((await pool.query('SELECT count(*) AS n FROM certification_enrollments')).rows[0].n),3);
  }finally{
    try{if(restricted)await restricted.end();}
    finally{try{if(pool)await pool.end();}
    finally{try{if(created)await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);}
    finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}}
  }
});
