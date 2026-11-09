import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {createFormalReviewStore} from './formal-review-postgres.mjs';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewIntake} from './formal-review-intake.mjs';
import {createFormalReviewInteractions} from './formal-review-interactions.mjs';
import {createFormalReviewDiscovery} from './formal-review-discovery.mjs';
import {createFormalReviewBrowser} from './formal-review-browser.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('saved reports, discovery, browser and recreated sessions with restricted disposable PostgreSQL',{skip:!url,timeout:60000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');
 for(const key of ['DISCORD_TOKEN','DATABASE_URL','CERTIFICATION_DATABASE_URL'])assert.equal(process.env[key]||'','');
 const target=new URL(url);assert.ok(['postgres:','postgresql:'].includes(target.protocol));assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const [{default:pg},sdk]=await Promise.all([import('pg'),import('discord.js')]);
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=3000'});
 const role='saved_review_'+randomUUID().replaceAll('-',''),readerRole=role+'_r',password=randomUUID();
 let installed=false,roleCreated=false,readerCreated=false,worker,reader,store,core,intake,handler,discovery,browser;
 const O='100000000000000001',A='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',M='100000000000000006',X='100000000000000007',workId=randomUUID();
 let course=true,clock=Date.now(),serial=100000000000001000n,sourceReads=0,updates=0;const events=[];
 function compose(){
  core=createFormalReviewCore({enabled:true,guildId:G,ownerId:O,courseKey:'ethical-hacking-reading',exerciseKeys:['EH-NET-02']},{transaction:store.transaction,isReady:()=>store.ready,now:()=>clock,authorizeCourse:async()=>course?{studentId:'NG-saved-fixture',courseKey:'ethical-hacking-reading'}:null,authorizeExercise:async()=>true,authorizeReviewer:async s=>s.actorId===O,async readSource(){sourceReads++;return {messageId:M,guildId:G,channelId:C,authorId:A,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body:'Fictional PostgreSQL saved report.',createdAtMs:clock-1000};}});
  intake=createFormalReviewIntake({enabled:true,core,isReady:()=>store.ready,now:()=>clock});
  handler=createFormalReviewInteractions({enabled:true,guildId:G,applicationId:B,botId:B,core,intake,isReady:()=>store.ready,now:()=>clock});
  discovery=createFormalReviewDiscovery({enabled:true,guildId:G,ownerId:O,readPool:reader,core,isReady:()=>store.ready,now:()=>clock});
  browser=createFormalReviewBrowser({enabled:true,guildId:G,applicationId:B,botId:B,learner:handler,discovery,isReady:()=>store.ready,now:()=>clock});
 }
 async function stopViews(){browser?.dispose();handler?.dispose();discovery?.dispose();intake?.dispose();core?.dispose();await Promise.all([browser?.drain(),handler?.drain(),discovery?.drain(),intake?.drain()]);}
 function interaction(customId,actor=A){return {id:(serial++).toString(),customId,applicationId:B,guildId:G,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actor},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,async deferReply(p){assert.ok(customId.startsWith('frv:confirm:'));assert.deepEqual(p,{flags:64});this.deferred=true;this.ephemeral=true;},async deferUpdate(){assert.ok(!customId.startsWith('frv:confirm:'));updates++;this.deferred=true;},async reply(p){events.push(p);},async editReply(p){assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.content.length<=2000);assert.ok(p.components.length<=5);for(const r of p.components)new sdk.ActionRowBuilder(r).toJSON();for(const e of p.embeds)new sdk.EmbedBuilder(e).toJSON();events.push(p);}};}
 async function snapshot(){return (await admin.query('SELECT (SELECT count(*)::int FROM formal_review.reports WHERE work_id=$1) AS reports,(SELECT count(*)::int FROM formal_review.reviews WHERE work_id=$1) AS reviews,(SELECT count(*)::int FROM formal_review.operations WHERE work_id=$1) AS operations,(SELECT revision FROM formal_review.work WHERE id=$1) AS revision',[workId])).rows[0];}
 async function list(){await browser.handle(interaction('frv:list:'+A+':0'));return events.at(-1);}
 try{
  const identity=(await admin.query('SELECT current_database() AS db,current_user AS login,current_setting(\'server_version_num\')::int AS version')).rows[0];
  assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  assert.equal((await admin.query("SELECT to_regnamespace('formal_review') AS n")).rows[0].n,null);
  await admin.query(await readFile(new URL('./migrations/012-formal-review.sql',import.meta.url),'utf8'));installed=true;
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await admin.query(`GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${role}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${role}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${role}"`);
  await admin.query(`CREATE ROLE "${readerRole}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);readerCreated=true;
  await admin.query(`GRANT USAGE ON SCHEMA formal_review TO "${readerRole}"; GRANT SELECT(id,guild_id,learner_id,course_key,expires_ms) ON formal_review.work TO "${readerRole}"; GRANT SELECT(id,work_id,submitted_ms,expires_ms) ON formal_review.reports TO "${readerRole}"; ALTER ROLE "${readerRole}" SET default_transaction_read_only=on`);
  target.username=role;target.password=password;worker=new pg.Pool({connectionString:target.href,max:2,connectionTimeoutMillis:5000});
  const readTarget=new URL(target.href);readTarget.username=readerRole;reader=new pg.Pool({connectionString:readTarget.href,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=2000 -c lock_timeout=1000'});
  store=createFormalReviewStore({enabled:true,pool:worker,ownerId:O,expectedDatabase:'formal_review_test',expectedLogin:role});assert.equal((await store.initialize()).ready,true);
  clock=Date.now();await admin.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-saved-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[workId,G,A,C,clock-5000,clock-5000+86400000]);
  const foreignWork=randomUUID(),foreignReport=randomUUID(),foreignBody='Foreign learner fixture.',submitted=clock-100;
  await admin.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-foreign-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[foreignWork,G,X,M,clock-5000,clock-5000+86400000]);
  await admin.query('INSERT INTO formal_review.reports(id,work_id,revision,body,body_digest,source_channel_id,source_message_id,source_created_ms,submitted_ms,expires_ms) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9)',[foreignReport,foreignWork,foreignBody,createHash('sha256').update(foreignBody).digest('hex'),M,M,submitted-100,submitted,submitted+86400000]);
  compose();
  const preview=await intake.preview({actorId:A,guildId:G,channelId:C},{workId,sourceMessageId:M,consent:true});assert.equal(preview.ok,true);
  await browser.handle(interaction('frv:confirm:'+preview.previewId));
  const receiptButtons=events.at(-1).components.flatMap(r=>r.components);assert.ok(receiptButtons.some(b=>b.label==='Read saved report'));assert.ok(receiptButtons.some(b=>b.label==='Read feedback'));
  const before=(await admin.query('SELECT id,body,expires_ms FROM formal_review.reports WHERE work_id=$1',[workId])).rows[0];assert.equal(before.body,'Fictional PostgreSQL saved report.');const reads=sourceReads;
  let refs=await discovery.list({actorId:A,guildId:G},{learnerId:A});assert.equal(refs.ok,true);assert.equal(refs.reports.length,1);assert.equal(refs.reports[0].reportId,before.id);assert.ok(!JSON.stringify(refs).includes(before.body));assert.ok(!JSON.stringify(refs).includes(foreignReport));
  assert.deepEqual(await discovery.list({actorId:X,guildId:G},{learnerId:A}),{ok:false});
  let page=await list();assert.equal(page.embeds.length,0);assert.equal(page.components.length,2);assert.ok(!JSON.stringify(page).includes(foreignBody));
  let reportControl=page.components[0].components[0].custom_id,feedbackControl=page.components[0].components[1].custom_id;
  await browser.handle(interaction(reportControl));assert.equal(events.at(-1).embeds[0].description,before.body);
  const preRecovery=await snapshot();await stopViews();compose();
  assert.deepEqual(await intake.confirm({actorId:A,guildId:G,channelId:C},{previewId:preview.previewId}),{ok:false});
  page=await list();reportControl=page.components[0].components[0].custom_id;feedbackControl=page.components[0].components[1].custom_id;assert.ok(reportControl.endsWith(before.id));
  await browser.handle(interaction(reportControl));assert.equal(events.at(-1).embeds[0].description,before.body);assert.deepEqual(await snapshot(),preRecovery);
  const reviewed=await core.review({actorId:O,guildId:G},{workId,operationId:randomUUID(),expectedRevision:1,reportId:before.id,decision:'changes-requested',feedback:'Explain the fictional database result.'});assert.equal(reviewed.ok,true);assert.equal(String(reviewed.expiresAtMs),before.expires_ms);
  await browser.handle(interaction(feedbackControl));assert.equal(events.at(-1).embeds[0].description,'Explain the fictional database result.');
  refs=await discovery.list({actorId:A,guildId:G},{learnerId:A});assert.equal(refs.reports[0].reviewDecision,'changes-requested');
  const counts=await snapshot();assert.deepEqual(counts,{reports:1,reviews:1,operations:2,revision:2});
  for(const mode of ['foreign','revoked','expired']){
   if(mode==='revoked')course=false;if(mode==='expired'){course=true;clock=Number(before.expires_ms);}
   await browser.handle(interaction(reportControl,mode==='foreign'?X:A));assert.equal(events.at(-1).content,'Saved report unavailable or expired.');assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);
   if(mode!=='foreign'){refs=await discovery.list({actorId:A,guildId:G},{learnerId:A});assert.deepEqual(refs,{ok:true,reports:[]});page=await list();assert.ok(page.content.startsWith('No current accessible reports'));assert.equal(page.components.length,1);assert.deepEqual(page.embeds,[]);assert.deepEqual(await snapshot(),counts);}
  }
  assert.ok(updates>=7);assert.equal(sourceReads,reads);assert.equal((await admin.query('SELECT expires_ms FROM formal_review.reports WHERE id=$1',[before.id])).rows[0].expires_ms,before.expires_ms);
  await assert.rejects(worker.query('DELETE FROM formal_review.reports'),e=>e.code==='42501');
  await assert.rejects(reader.query('SELECT body FROM formal_review.reports'),e=>e.code==='42501');
  await assert.rejects(reader.query('SELECT feedback FROM formal_review.reviews'),e=>e.code==='42501');
  await assert.rejects(reader.query('DELETE FROM formal_review.reports'),e=>['25006','42501'].includes(e.code));
 }finally{
  await stopViews();store?.dispose();await store?.drain();await Promise.all([reader?.end(),worker?.end()]);
  try{if(installed)await admin.query('DROP SCHEMA formal_review CASCADE');if(readerCreated)await admin.query(`DROP ROLE "${readerRole}"`);if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}
 }
});
