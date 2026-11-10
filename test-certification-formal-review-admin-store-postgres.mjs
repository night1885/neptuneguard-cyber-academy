import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReviewStore} from './formal-review-postgres.mjs';
import {createFormalReviewCore} from './formal-review-core.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('Administrator review persistence and permission-loss rollback',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const u=new URL(url);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'5432');assert.equal(u.pathname,'/formal_review_test');assert.equal(u.username,'formal_review_admin');assert.equal(u.search,'');assert.equal(u.hash,'');
 const {default:pg}=await import('pg'),suffix=randomUUID().replaceAll('-',''),database='admin_review_'+suffix,role='review_writer_'+suffix,password=randomUUID();
 const opt={max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=5000 -c lock_timeout=2000'},admin=new pg.Pool({...opt,connectionString:url});
 const O='100000000000000001',A='100000000000000002',D='100000000000000003',G='100000000000000004',M='100000000000000005',X='100000000000000006';
 let db,worker,store,ownerStore,created=false,roleCreated=false,permitted=true,channel=100000000000001000n;const cores=[];
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);created=true;u.pathname='/'+database;db=new pg.Pool({...opt,connectionString:u.href});assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  await db.query(await readFile(new URL('./migrations/012-formal-review.sql',import.meta.url),'utf8'));
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${role}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${role}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${role}"`);
  const wu=new URL(u.href);wu.username=role;wu.password=password;worker=new pg.Pool({...opt,connectionString:wu.href});
  const profile={enabled:true,pool:worker,ownerId:O,expectedDatabase:database,expectedLogin:role};
  store=createFormalReviewStore({...profile,reviewerMode:'current-administrator',authorizeReviewer:async s=>s.actorId===D&&permitted});ownerStore=createFormalReviewStore(profile);await store.initialize();await ownerStore.initialize();
  async function fixture(){const workId=randomUUID(),created=Date.now()-5000,C=String(channel++),body='Disposable administrator report';await db.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'fictional-id',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[workId,G,A,C,created,created+86400000]);
   const scope={actorId:D,guildId:G,learnerId:A,studentId:'fictional-id',courseKey:'ethical-hacking-reading',exerciseKey:'EH-NET-02',workId,sourceChannelId:C};
   const core=createFormalReviewCore({enabled:true,guildId:G,ownerId:O,courseKey:scope.courseKey,exerciseKeys:[scope.exerciseKey],reviewerMode:'current-administrator'},{transaction:store.transaction,isReady:()=>store.ready,now:Date.now,authorizeCourse:async()=>({studentId:scope.studentId,courseKey:scope.courseKey}),authorizeExercise:async()=>true,authorizeReviewer:async s=>s.actorId===D&&permitted,readSource:async()=>({messageId:M,guildId:G,channelId:C,authorId:A,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body,createdAtMs:Date.now()-1000})});cores.push(core);
   const result=await core.submit({actorId:A,guildId:G},{workId,operationId:randomUUID(),expectedRevision:0,sourceMessageId:M,sourceDigest:createHash('sha256').update(body).digest('hex')});assert.equal(result.ok,true);
   const request={workId,operationId:randomUUID(),expectedRevision:1,reportId:result.reportId,decision:'review-recorded',feedback:'Disposable administrator feedback',expiresAtMs:result.expiresAtMs};return {core,scope,request,result};
  }
  const f=await fixture(),q={...f.request};delete q.expiresAtMs;const reviewed=await f.core.review({actorId:D,guildId:G},q);assert.equal(reviewed.ok,true);assert.equal(reviewed.expiresAtMs,f.result.expiresAtMs);assert.deepEqual(await f.core.review({actorId:D,guildId:G},q),reviewed);
  assert.equal((await db.query('SELECT reviewer_id FROM formal_review.reviews WHERE report_id=$1',[q.reportId])).rows[0].reviewer_id,D);assert.equal((await db.query("SELECT count(*)::int AS n FROM formal_review.operations WHERE work_id=$1 AND actor_id=$2 AND action='review'",[q.workId,D])).rows[0].n,1);assert.equal((await f.core.read({actorId:A,guildId:G},{workId:q.workId,reportId:q.reportId})).review.feedback,q.feedback);
  const denied=await fixture();for(const actorId of [A,X])await assert.rejects(store.transaction(async tx=>{await tx.lockWork(denied.scope.workId);await tx.insertReview({...denied.scope,actorId},denied.request);}));
  await assert.rejects(ownerStore.transaction(async tx=>{await tx.lockWork(denied.scope.workId);await tx.insertReview(denied.scope,denied.request);}));
  await assert.rejects(store.transaction(async tx=>{await tx.lockWork(denied.scope.workId);const saved=await tx.insertReview(denied.scope,denied.request);await tx.saveOperation(denied.scope,{workId:denied.scope.workId,operationId:denied.request.operationId,digest:'a'.repeat(64),reportId:saved.reportId,revision:saved.revision,expiresAtMs:saved.expiresAtMs});permitted=false;}));
  assert.equal((await db.query('SELECT revision FROM formal_review.work WHERE id=$1',[denied.scope.workId])).rows[0].revision,1);assert.equal((await db.query('SELECT count(*)::int AS n FROM formal_review.reviews WHERE work_id=$1',[denied.scope.workId])).rows[0].n,0);assert.equal((await db.query("SELECT count(*)::int AS n FROM formal_review.operations WHERE work_id=$1 AND action='review'",[denied.scope.workId])).rows[0].n,0);permitted=true;
  await assert.rejects(worker.query('DELETE FROM formal_review.reports'),e=>e.code==='42501');
 }finally{for(const core of cores)core.dispose();store?.dispose();ownerStore?.dispose();await Promise.all([store?.drain(),ownerStore?.drain()]);await Promise.all([worker?.end(),db?.end()]);try{if(created)await admin.query(`DROP DATABASE "${database}"`);}finally{try{if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
});
