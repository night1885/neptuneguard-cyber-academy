import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReadingBookmarks} from './formal-reading-bookmarks.mjs';
import {createFormalBookmarkAuthorization} from './formal-bookmark-course-authorizer.mjs';
const optIn=process.env.FORMAL_BOOKMARK_CI==='true';
test('isolated PostgreSQL bookmark integration',{skip:!optIn},async t=>{
  const raw=process.env.FORMAL_BOOKMARK_TEST_DATABASE_URL;
  const url=new URL(raw);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol)&&url.hostname==='127.0.0.1'&&url.pathname==='/formal_bookmark_test'&&url.username==='bookmark_ci_admin'&&!url.search&&!url.hash,'Disposable loopback database required');
  const {default:pg}=await import('pg');
  const suffix=randomBytes(8).toString('hex'),schema='bookmark_'+suffix,role='bookmark_reader_'+suffix,password=randomBytes(24).toString('hex');
  const admin=new pg.Pool({connectionString:raw,max:4}),options='-c search_path='+schema;
  let scoped,reader,schemaCreated=false,roleCreated=false;
  try{
    await admin.query('CREATE SCHEMA '+schema);schemaCreated=true;
    scoped=new pg.Pool({connectionString:raw,options,max:4});
    await scoped.query(`CREATE TABLE certification_enrollments(discord_user_id TEXT PRIMARY KEY,student_id TEXT,status TEXT,approved_by TEXT,approved_at TIMESTAMPTZ,signature_method TEXT,acknowledgment_name TEXT,signature_reference TEXT,agreement_version TEXT,agreement_content_sha256 TEXT,acknowledged_at TIMESTAMPTZ,learner_confirmed_read_at TIMESTAMPTZ,comprehension_passed_at TIMESTAMPTZ,comprehension_check_version TEXT,age_eligible BOOLEAN,age_declared_at TIMESTAMPTZ,age_declaration_version TEXT,comprehension_submitted_at TIMESTAMPTZ,comprehension_review_snapshot JSONB,application_closed_at TIMESTAMPTZ,application_closed_by TEXT,application_closed_as TEXT);
      CREATE TABLE certification_course_enrollments(discord_user_id TEXT,course_key TEXT,status TEXT,PRIMARY KEY(discord_user_id,course_key));`);
    await scoped.query(await readFile(new URL('./docs/formal-course-authoring/reading-bookmarks-schema.sql',import.meta.url),'utf8'));
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
    await scoped.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${role}; GRANT UPDATE(discord_user_id) ON certification_enrollments TO ${role}; GRANT UPDATE(course_key) ON certification_course_enrollments TO ${role}; GRANT INSERT ON formal_reading_bookmarks TO ${role}; GRANT UPDATE(revision,lesson_key,page_index,version,updated_at) ON formal_reading_bookmarks TO ${role};`);
    const restricted=new URL(raw);restricted.username=role;restricted.password=password;
    reader=new pg.Pool({connectionString:restricted.toString(),options,max:4});
    const actorId='11111111111111111',courseKey='ethical-hacking',revision='a'.repeat(64),config={enabled:true,ownerId:'33333333333333333',activeAgreementVersion:'test-v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'test-check'}};
    await scoped.query(`INSERT INTO certification_enrollments(discord_user_id,student_id,status,approved_by,approved_at,signature_method,agreement_version,agreement_content_sha256,acknowledged_at,learner_confirmed_read_at,comprehension_passed_at,comprehension_check_version,age_eligible,age_declared_at,age_declaration_version) VALUES($1,'SYNTHETIC-STUDENT','approved',$2,now(),'discord_account','test-v1',$3,now(),now(),now(),'test-check',true,now(),'adult-18-v1')`,[actorId,config.ownerId,config.activeAgreementSha256]);
    await scoped.query("INSERT INTO certification_course_enrollments VALUES($1,$2,'active')",[actorId,courseKey]);
    const packages=[{courseKey,revision,pages:{'EH-LAB-00':2,'EH-LAB-01':1}}];
    const make=()=>createFormalReadingBookmarks({enabled:true,pool:reader,packages,authorizeTransaction:createFormalBookmarkAuthorization(config)});
    const load={actorId,courseKey},save={...load,revision,lessonKey:'EH-LAB-00',pageIndex:0,expectedVersion:0};
    await t.test('restricted direct login without delete privilege',async()=>{const r=(await reader.query("SELECT current_user=session_user AS direct,has_table_privilege(current_user,'formal_reading_bookmarks','DELETE') AS destructive")).rows[0];assert.equal(r.direct,true);assert.equal(r.destructive,false);});
    await t.test('save survives service recreation and repeated click is idempotent',async()=>{assert.equal((await make().save(save)).status,'saved');assert.equal((await make().load(load)).version,1);assert.equal((await make().save(save)).duplicate,true);assert.equal(Number((await scoped.query('SELECT count(*) FROM formal_reading_bookmarks')).rows[0].count),1);});
    await t.test('concurrent stale saves cannot overwrite each other',async()=>{const results=await Promise.all([make().save({...save,pageIndex:1,expectedVersion:1}),make().save({...save,lessonKey:'EH-LAB-01',expectedVersion:1})]);assert.deepEqual(results.map(r=>r.status).sort(),['conflict','saved']);assert.equal((await make().load(load)).version,2);});
    await t.test('revocation blocks reads and writes without changing bookmark',async()=>{await scoped.query("UPDATE certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[actorId]);assert.equal((await make().load(load)).status,'unavailable');assert.equal((await make().save({...save,expectedVersion:2})).status,'unavailable');assert.equal((await scoped.query('SELECT version FROM formal_reading_bookmarks')).rows[0].version,2);await scoped.query("UPDATE certification_enrollments SET status='approved' WHERE discord_user_id=$1",[actorId]);});
    await t.test('current acknowledgement and closure rules remain enforced',async()=>{await scoped.query('UPDATE certification_enrollments SET age_eligible=false WHERE discord_user_id=$1',[actorId]);assert.equal((await make().load(load)).status,'unavailable');await scoped.query("UPDATE certification_enrollments SET age_eligible=true,application_closed_as='withdrawn' WHERE discord_user_id=$1",[actorId]);assert.equal((await make().load(load)).status,'unavailable');});
  }finally{
    if(reader)await reader.end();if(scoped)await scoped.end();
    if(schemaCreated)await admin.query('DROP SCHEMA '+schema+' CASCADE');
    if(roleCreated)await admin.query('DROP ROLE '+role);await admin.end();
  }
});
