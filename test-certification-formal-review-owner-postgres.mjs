import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReviewStore} from './formal-review-postgres.mjs';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewOwnerFlow} from './formal-review-owner-flow.mjs';
import {createFormalReviewOwnerInteractions} from './formal-review-owner-interactions.mjs';
import {createFormalReviewDiscovery} from './formal-review-discovery.mjs';
import {createFormalReviewOwnerBrowser} from './formal-review-owner-browser.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('owner browser and controls compose with restricted disposable PostgreSQL and same-key receipt recovery',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');
 for(const key of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[key]||'','');
 const target=new URL(url);assert.ok(['postgres:','postgresql:'].includes(target.protocol));assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const [{default:pg},sdk]=await Promise.all([import('pg'),import('discord.js')]);
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=3000'});
 const role='owner_review_'+randomUUID().replaceAll('-',''),readerRole=role+'_r',password=randomUUID(),O='100000000000000001',A='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',M='100000000000000006',X='100000000000000007',workId=randomUUID();
 let installed=false,roleCreated=false,readerCreated=false,worker,reader,store,core,flow,handler,discovery,browser,course=true,clock,failReceipt=false,serial=100000000000001000n;const events=[];
 const body='Fictional owner-control PostgreSQL report.';
 function compose(){
  flow=createFormalReviewOwnerFlow({enabled:true,ownerId:O,guildId:G,channelId:C,core,isReady:()=>store.ready,now:()=>clock});
  handler=createFormalReviewOwnerInteractions({enabled:true,ownerId:O,guildId:G,channelId:C,applicationId:B,botId:B,flow,isReady:()=>store.ready,now:()=>clock});
  discovery=createFormalReviewDiscovery({enabled:true,guildId:G,ownerId:O,readPool:reader,core,isReady:()=>store.ready,now:()=>clock});
  browser=createFormalReviewOwnerBrowser({enabled:true,ownerId:O,guildId:G,channelId:C,applicationId:B,botId:B,reviewer:handler,discovery,isReady:()=>store.ready,now:()=>clock});
 }
 async function stopViews(){browser?.dispose();handler?.dispose();discovery?.dispose();flow?.dispose();await Promise.all([browser?.drain(),handler?.drain(),discovery?.drain(),flow?.drain()]);}
 function validate(p){assert.ok(p.content.length<=2000);assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.components.length<=5);for(const r of p.components)new sdk.ActionRowBuilder(r).toJSON();for(const e of p.embeds)new sdk.EmbedBuilder(e).toJSON();}
 function interaction(customId,actor=O){const fields=new Map([['feedback','Explain the fictional transaction.'],['ack','REVIEWED']]);return {id:(serial++).toString(),customId,guildId:G,applicationId:B,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actor},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>!customId.startsWith('frr:form:'),isModalSubmit:()=>customId.startsWith('frr:form:'),fields:{fields,getTextInputValue:k=>fields.get(k)},async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},async showModal(p){new sdk.ModalBuilder(p).toJSON();events.push(p);this.replied=true;},async reply(p){assert.equal(p.flags,64);validate(p);events.push(p);this.replied=true;},async editReply(p){validate(p);events.push(p);if(failReceipt&&p.content.startsWith('Review operation recorded.')){failReceipt=false;throw Error('Synthetic receipt delivery failure');}}};}
 async function snapshot(){return (await admin.query('SELECT (SELECT count(*)::int FROM formal_review.reports WHERE work_id=$1) AS reports,(SELECT count(*)::int FROM formal_review.reviews WHERE work_id=$1) AS reviews,(SELECT count(*)::int FROM formal_review.operations WHERE work_id=$1) AS operations,(SELECT revision FROM formal_review.work WHERE id=$1) AS revision',[workId])).rows[0];}
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  assert.equal((await admin.query("SELECT to_regnamespace('formal_review') AS n")).rows[0].n,null);
  await admin.query(await readFile(new URL('./migrations/012-formal-review.sql',import.meta.url),'utf8'));installed=true;
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await admin.query(`GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${role}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${role}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${role}"`);
  await admin.query(`CREATE ROLE "${readerRole}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);readerCreated=true;
  await admin.query(`GRANT USAGE ON SCHEMA formal_review TO "${readerRole}"; GRANT SELECT(id,guild_id,learner_id,course_key,expires_ms) ON formal_review.work TO "${readerRole}"; GRANT SELECT(id,work_id,submitted_ms,expires_ms) ON formal_review.reports TO "${readerRole}"; ALTER ROLE "${readerRole}" SET default_transaction_read_only=on`);
  target.username=role;target.password=password;worker=new pg.Pool({connectionString:target.href,max:2,connectionTimeoutMillis:5000});
  const readTarget=new URL(target.href);readTarget.username=readerRole;reader=new pg.Pool({connectionString:readTarget.href,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=2000 -c lock_timeout=1000'});
  store=createFormalReviewStore({enabled:true,pool:worker,ownerId:O,expectedDatabase:'formal_review_test',expectedLogin:role});assert.deepEqual(await store.initialize(),{ready:true});
  clock=Date.now();await admin.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-owner-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[workId,G,A,C,clock-5000,clock-5000+86400000]);
  const foreignWork=randomUUID(),foreignReport=randomUUID(),foreignBody='Foreign reviewer-browser fixture.',foreignSubmitted=clock-100;
  await admin.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-foreign-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[foreignWork,G,X,M,clock-5000,clock-5000+86400000]);
  await admin.query('INSERT INTO formal_review.reports(id,work_id,revision,body,body_digest,source_channel_id,source_message_id,source_created_ms,submitted_ms,expires_ms) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9)',[foreignReport,foreignWork,foreignBody,createHash('sha256').update(foreignBody).digest('hex'),M,M,foreignSubmitted-100,foreignSubmitted,foreignSubmitted+86400000]);
  core=createFormalReviewCore({enabled:true,guildId:G,ownerId:O,courseKey:'ethical-hacking-reading',exerciseKeys:['EH-NET-02']},{transaction:store.transaction,isReady:()=>store.ready,now:()=>clock,authorizeCourse:async()=>course?{studentId:'NG-owner-fixture',courseKey:'ethical-hacking-reading'}:null,authorizeExercise:async()=>true,authorizeReviewer:async s=>s.actorId===O,readSource:async()=>({messageId:M,guildId:G,channelId:C,authorId:A,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body,createdAtMs:clock-1000})});
  const submitted=await core.submit({actorId:A,guildId:G},{workId,operationId:randomUUID(),expectedRevision:0,sourceMessageId:M,sourceDigest:createHash('sha256').update(body).digest('hex')});assert.equal(submitted.ok,true);compose();
  const listId='frr:list:'+A+':0',openId='frr:open:'+workId+':'+submitted.reportId;
  await browser.handle(interaction(listId));const page=events.at(-1);assert.equal(page.components.length,2);assert.deepEqual(page.embeds,[]);assert.equal(page.components[0].components[0].custom_id,openId);assert.equal(JSON.stringify(page).includes(body),false);assert.equal(JSON.stringify(page).includes(foreignReport),false);assert.equal(JSON.stringify(page).includes(foreignBody),false);
  assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  await browser.handle(interaction(page.components[0].components[0].custom_id));assert.equal(events.at(-1).embeds[0].description,body);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  await browser.handle(interaction(events.at(-1).components[0].components[0].custom_id));const modal=events.at(-1);assert.ok(modal.custom_id.startsWith('frr:form:changes-requested:'));
  await browser.handle(interaction(modal.custom_id));const prepared=events.at(-1);assert.equal(prepared.embeds[0].description,'Explain the fictional transaction.');assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  const confirmId=prepared.components[0].components[0].custom_id;failReceipt=true;await browser.handle(interaction(confirmId));assert.match(events.at(-1).content,/delivery is unconfirmed/);assert.deepEqual(await snapshot(),{reports:1,reviews:1,operations:2,revision:2});
  await browser.handle(interaction(confirmId));assert.match(events.at(-1).content,/Review operation recorded/);const counts=await snapshot();assert.deepEqual(counts,{reports:1,reviews:1,operations:2,revision:2});
  const stored=(await admin.query('SELECT feedback,decision,expires_ms FROM formal_review.reviews WHERE work_id=$1',[workId])).rows[0];assert.equal(stored.feedback,'Explain the fictional transaction.');assert.equal(stored.decision,'changes-requested');assert.equal(Number(stored.expires_ms),submitted.expiresAtMs);
  course=false;await browser.handle(interaction(confirmId));assert.match(events.at(-1).content,/outcome is unconfirmed/);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);
  await browser.handle(interaction(listId));assert.match(events.at(-1).content,/No current accessible reports/);assert.equal(events.at(-1).components.length,1);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);course=true;
  for(const mode of ['foreign-owner','public-origin'])for(const customId of [listId,openId]){const i=interaction(customId,mode==='foreign-owner'?A:O);if(mode==='public-origin')i.message.flags.has=()=>false;await browser.handle(i);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(events.at(-1).components,[]);assert.deepEqual(await snapshot(),counts);}
  await stopViews();compose();await browser.handle(interaction(listId));assert.equal(events.at(-1).components[0].components[0].custom_id,openId);assert.deepEqual(await snapshot(),counts);
  await browser.handle(interaction(openId));assert.match(events.at(-1).content,/already has immutable feedback/);const feedbackId=events.at(-1).components[0].components[0].custom_id;
  await browser.handle(interaction(feedbackId));assert.equal(events.at(-1).embeds[0].description,stored.feedback);assert.deepEqual(await snapshot(),counts);
  clock=submitted.expiresAtMs;await browser.handle(interaction(listId));assert.match(events.at(-1).content,/No current accessible reports/);assert.equal(events.at(-1).components.length,1);assert.deepEqual(events.at(-1).embeds,[]);
  await browser.handle(interaction(openId));assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(events.at(-1).components,[]);assert.deepEqual(await snapshot(),counts);
  assert.equal(Number((await admin.query('SELECT expires_ms FROM formal_review.reports WHERE id=$1',[submitted.reportId])).rows[0].expires_ms),submitted.expiresAtMs);
  await assert.rejects(reader.query('SELECT body FROM formal_review.reports'),e=>e.code==='42501');await assert.rejects(reader.query('SELECT feedback FROM formal_review.reviews'),e=>e.code==='42501');await assert.rejects(reader.query('DELETE FROM formal_review.reports'),e=>['25006','42501'].includes(e.code));
  await assert.rejects(worker.query('DELETE FROM formal_review.reviews'),e=>e.code==='42501');await assert.rejects(worker.query("UPDATE formal_review.reviews SET feedback='replacement'"),e=>e.code==='42501');
 }finally{await stopViews();core?.dispose();store?.dispose();await store?.drain();await Promise.all([reader?.end(),worker?.end()]);try{if(installed)await admin.query('DROP SCHEMA formal_review CASCADE');if(readerCreated)await admin.query(`DROP ROLE "${readerRole}"`);if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}
});
