import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
const childPath=fileURLToPath(new URL('./test-support/formal-review-recovery-child.mjs',import.meta.url));
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('persisted receipt inspection across killed writer and fresh reader processes',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const target=new URL(url);assert.ok(['postgres:','postgresql:'].includes(target.protocol));assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const {default:pg}=await import('pg'),database='recover_'+randomUUID().replaceAll('-',''),workerRole='recover_worker_'+randomUUID().replaceAll('-',''),readerRole=workerRole+'_r',password=randomUUID();
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=3000'});
 const guildId='100000000000000001',ownerId='100000000000000002',learnerId='100000000000000003',channelId='100000000000000004',messageId='100000000000000005',foreign='100000000000000006',workId=randomUUID(),body='Fictional process-recovery report.';
 let databaseCreated=false,db,reader;const roles=[],children=new Set();
 async function run(config){return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[childPath],{cwd:fileURLToPath(new URL('.',import.meta.url)),env:{PATH:process.env.PATH,GITHUB_ACTIONS:'true',FORMAL_RECOVERY_CHILD:JSON.stringify(config),CERTIFICATION_ENABLED:'false',DATABASE_URL:'',CERTIFICATION_DATABASE_URL:'',DISCORD_TOKEN:''},stdio:['ignore','pipe','pipe','ipc']});
  children.add(p);let value,marker=false,failed=false,bytes=0;
  const timer=setTimeout(()=>{failed=true;p.kill('SIGKILL');},12000);
  const output=chunk=>{bytes+=chunk.length;if(bytes>512){failed=true;p.kill('SIGKILL');}};p.stdout.on('data',output);p.stderr.on('data',output);
  p.on('message',m=>{if(marker||!m||m.type!==(config.mode==='inspect'?'done':'committed')){failed=true;p.kill('SIGKILL');return;}marker=true;value=m.value;if(config.mode!=='inspect'&&!p.kill('SIGKILL'))failed=true;});
  p.on('error',()=>{failed=true;});
  p.on('close',(code,signal)=>{clearTimeout(timer);children.delete(p);if(failed||!marker||(config.mode==='inspect'?(code!==0||signal!==null):(signal!=='SIGKILL')))reject(Error('Recovery fixture child outcome invalid'));else resolve(value);});
 });}
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);databaseCreated=true;target.pathname='/'+database;
  db=new pg.Pool({connectionString:target.href,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=3000'});assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  await db.query(await readFile(new URL('./migrations/012-formal-review.sql',import.meta.url),'utf8'));
  for(const role of [workerRole,readerRole]){await db.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roles.push(role);}
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${workerRole}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${workerRole}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${workerRole}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${workerRole}"`);
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${readerRole}"; GRANT SELECT(id,guild_id,learner_id,expires_ms) ON formal_review.work TO "${readerRole}"; GRANT SELECT(work_id,actor_id,operation_id,action,report_id,revision,expires_ms) ON formal_review.operations TO "${readerRole}"; ALTER ROLE "${readerRole}" SET default_transaction_read_only=on`);
  const connect=role=>{const t=new URL(target.href);t.username=role;t.password=password;return t.href;};
  reader=new pg.Pool({connectionString:connect(readerRole),max:1,connectionTimeoutMillis:5000});
  for(const sql of ['SELECT body FROM formal_review.reports','SELECT feedback FROM formal_review.reviews','SELECT digest FROM formal_review.operations'])await assert.rejects(reader.query(sql),e=>e.code==='42501');
  await assert.rejects(reader.query('DELETE FROM formal_review.operations'),e=>['25006','42501'].includes(e.code));
  const stamp=Date.now();await db.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-recovery-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[workId,guildId,learnerId,channelId,stamp-5000,stamp-5000+86400000]);
  const base={database,workerRole,workerUrl:connect(workerRole),readerUrl:connect(readerRole),guildId,ownerId,learnerId,channelId,messageId,workId,body,sourceCreatedMs:stamp-1000};
  const counts=async()=>(await db.query('SELECT (SELECT count(*)::int FROM formal_review.reports) AS reports,(SELECT count(*)::int FROM formal_review.reviews) AS reviews,(SELECT count(*)::int FROM formal_review.operations) AS operations')).rows[0];
  const submissionKey=randomUUID(),submitted=await run({...base,mode:'submit',request:{workId,operationId:submissionKey,expectedRevision:0,sourceMessageId:messageId,sourceDigest:createHash('sha256').update(body).digest('hex')}});assert.equal(submitted.ok,true);assert.deepEqual(await counts(),{reports:1,reviews:0,operations:1});
  const first=await run({...base,mode:'inspect',actorId:learnerId});assert.deepEqual(first,{ok:true,kind:'latest-recorded-operation',workId,reportId:submitted.reportId,operationId:submissionKey,action:'submit',revision:1,expiresAtMs:submitted.expiresAtMs});
  assert.deepEqual(await run({...base,mode:'inspect',actorId:learnerId}),first);assert.deepEqual(await counts(),{reports:1,reviews:0,operations:1});
  const reviewKey=randomUUID(),reviewed=await run({...base,mode:'review',request:{workId,operationId:reviewKey,expectedRevision:1,reportId:submitted.reportId,decision:'review-recorded',feedback:'Fictional persisted feedback.'}});assert.equal(reviewed.ok,true);assert.equal(reviewed.expiresAtMs,submitted.expiresAtMs);
  const expected={reports:1,reviews:1,operations:2};assert.deepEqual(await counts(),expected);
  const receipt=await run({...base,mode:'inspect',actorId:ownerId});assert.deepEqual(receipt,{ok:true,kind:'latest-recorded-operation',workId,reportId:submitted.reportId,operationId:reviewKey,action:'review',revision:2,expiresAtMs:submitted.expiresAtMs});assert.equal(JSON.stringify(receipt).includes('Fictional'),false);
  assert.deepEqual(await run({...base,mode:'inspect',actorId:learnerId}),first);
  for(const patch of [{actorId:foreign},{actorId:learnerId,allowed:false},{actorId:ownerId,allowed:false},{actorId:learnerId,contextGuild:foreign},{actorId:learnerId,inspectWork:randomUUID()},{actorId:learnerId,asOfMs:submitted.expiresAtMs}]){assert.deepEqual(await run({...base,mode:'inspect',...patch}),{ok:false});assert.deepEqual(await counts(),expected);}
  const deadlines=(await db.query('SELECT r.expires_ms AS report,v.expires_ms AS review FROM formal_review.reports r JOIN formal_review.reviews v ON v.report_id=r.id WHERE r.id=$1',[submitted.reportId])).rows[0];assert.equal(Number(deadlines.report),submitted.expiresAtMs);assert.equal(deadlines.review,deadlines.report);
 }finally{
  await Promise.all([...children].map(p=>new Promise(resolve=>{p.once('close',resolve);p.kill('SIGKILL');})));
  await Promise.all([reader?.end(),db?.end()]);try{if(databaseCreated)await admin.query(`DROP DATABASE "${database}"`);}finally{try{for(const role of roles.reverse())await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}
 }
});
