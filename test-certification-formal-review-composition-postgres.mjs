import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReviewStore} from './formal-review-postgres.mjs';
import {createFormalDiscordSource} from './formal-review-discord-source.mjs';
import {createFormalReviewComposition} from './formal-review-composition.mjs';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('composition uses actual PostgreSQL persistence and source reader with fictional HTTP responses',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const target=new URL(url);assert.ok(['postgres:','postgresql:'].includes(target.protocol));assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const [{default:pg},sdk]=await Promise.all([import('pg'),import('discord.js')]);
 const G='100000000000000003',O='100000000000000001',A='100000000000000002',C='100000000000000004',B='100000000000000005',workId=randomUUID(),role='compose_review_'+randomUUID().replaceAll('-',''),password=randomUUID();
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=3000'}),client=new EventEmitter(),events=[];
 let installed=false,roleCreated=false,worker,store,source,composition,courseAuthorization,clock,messageId,sourceCreated,serial=100000000000001000n,privateChannel=true,course=true,authReady=false,selectedMessages=0;
 const body='Fictional composition HTTP observation.',feedback='Explain the fictional HTTP observation.';let sourceBody=body;
 async function fetchImpl(address,options){
  const u=new URL(address);assert.equal(u.origin,'https://discord.com');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');let value;
  if(u.pathname==='/api/v10/users/@me')value={id:B,bot:true};
  else if(u.pathname==='/api/v10/guilds/'+G)value={id:G,owner_id:O};
  else if(u.pathname==='/api/v10/guilds/'+G+'/roles')value=[{id:G,permissions:'1024'}];
  else if(u.pathname==='/api/v10/channels/'+C)value={id:C,guild_id:G,type:0,permission_overwrites:[{id:G,type:0,allow:'0',deny:privateChannel?'1024':'0'},...[A,O,B].map(id=>({id,type:1,allow:'68608',deny:'0'}))]};
  else if(u.pathname==='/api/v10/channels/'+C+'/messages/'+messageId){selectedMessages++;value={id:messageId,channel_id:C,type:0,author:{id:A},content:sourceBody,timestamp:new Date(sourceCreated).toISOString(),tts:false,mention_everyone:false,attachments:[],embeds:[],flags:0};}
  else assert.fail('Unexpected source route');
  return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
 }
 function validate(p){assert.ok(p.content.length<=2000);assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.components.length<=5);for(const r of p.components)new sdk.ActionRowBuilder(r).toJSON();for(const e of p.embeds)new sdk.EmbedBuilder(e).toJSON();}
 function interaction(customId,actor=A){const modal=customId.startsWith('frv:preview:')||customId.startsWith('frr:form:'),fields=new Map(customId.startsWith('frv:preview:')?[['source_message_id',messageId],['consent','PREVIEW']]:[['feedback',feedback],['ack','REVIEWED']]);return {id:(serial++).toString(),customId,applicationId:B,guildId:G,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actor},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>!modal,isModalSubmit:()=>modal,fields:{fields,getTextInputValue:k=>fields.get(k)},async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},async showModal(p){new sdk.ModalBuilder(p).toJSON();events.push(p);this.replied=true;},async editReply(p){validate(p);events.push(p);},async reply(p){assert.equal(p.flags,64);validate(p);events.push(p);this.replied=true;}};}
 const handle=(id,actor=A)=>composition.handle(interaction(id,actor));
 async function snapshot(){return (await admin.query('SELECT (SELECT count(*)::int FROM formal_review.reports WHERE work_id=$1) AS reports,(SELECT count(*)::int FROM formal_review.reviews WHERE work_id=$1) AS reviews,(SELECT count(*)::int FROM formal_review.operations WHERE work_id=$1) AS operations,(SELECT revision FROM formal_review.work WHERE id=$1) AS revision',[workId])).rows[0];}
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));assert.equal((await admin.query("SELECT to_regnamespace('formal_review') AS n")).rows[0].n,null);
  await admin.query(await readFile(new URL('./migrations/012-formal-review.sql',import.meta.url),'utf8'));installed=true;
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
  await admin.query(`GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${role}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${role}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${role}"`);
  target.username=role;target.password=password;worker=new pg.Pool({connectionString:target.href,max:2,connectionTimeoutMillis:5000,options:'-c statement_timeout=2000 -c lock_timeout=1000'});
  clock=Date.now();sourceCreated=clock-1000;messageId=(((BigInt(sourceCreated)-1420070400000n)<<22n)+1n).toString();
  await admin.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,'NG-composition-fixture',$4,'ethical-hacking-reading','EH-NET-02',$5,$6)",[workId,G,A,C,clock-5000,clock-5000+86400000]);
  store=createFormalReviewStore({enabled:true,pool:worker,ownerId:O,expectedDatabase:'formal_review_test',expectedLogin:role});
  source=createFormalDiscordSource({enabled:true,guildId:G,ownerId:O,botId:B,token:'fictional_composition_token_only',fetchImpl,isReady:()=>true,now:()=>clock,providerTimeoutMs:2000});
  courseAuthorization={enabled:true,get ready(){return authReady;},async initialize(){authReady=true;return {ready:true};},async authorizeCourse(s){assert.equal(s.learnerId,A);return course?{studentId:'NG-composition-fixture',courseKey:'ethical-hacking-reading'}:null;},dispose(){authReady=false;},drain:async()=>{}};
  composition=createFormalReviewComposition({enabled:true,guildId:G,ownerId:O,reviewerChannelId:C,applicationId:B,botId:B,exerciseKeys:['EH-NET-02'],client,store,courseAuthorization,source,metadataPool:worker,authorizeExercise:async s=>s.exerciseKey==='EH-NET-02',authorizeReviewer:async s=>s.actorId===O,isReady:()=>true,verifyResources:async()=>true,now:()=>clock});
  assert.equal(selectedMessages,0);assert.equal(client.listenerCount('interactionCreate'),0);assert.equal(await composition.initialize(),true);assert.equal(client.listenerCount('interactionCreate'),0);
  const empty={reports:0,reviews:0,operations:0,revision:0};assert.deepEqual(await snapshot(),empty);
  await handle('frv:start:'+workId);assert.equal(selectedMessages,0);await handle(events.at(-1).components[0].components[0].custom_id);const modalId=events.at(-1).custom_id;
  privateChannel=false;await handle(modalId);assert.equal(selectedMessages,0);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),empty);privateChannel=true;
  await handle(modalId);assert.equal(selectedMessages,1);assert.equal(events.at(-1).embeds[0].description,body);const confirmId=events.at(-1).components[0].components[0].custom_id;assert.deepEqual(await snapshot(),empty);
  sourceBody='Edited after the fictional preview.';await handle(confirmId);assert.match(events.at(-1).content,/outcome is unconfirmed/);assert.equal(selectedMessages,2);assert.deepEqual(await snapshot(),empty);
  sourceBody=body;await handle(confirmId);assert.match(events.at(-1).content,/submission recorded/);assert.equal(selectedMessages,3);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  const reportControl=events.at(-1).components.flatMap(r=>r.components).find(b=>b.custom_id.startsWith('frv:report:')).custom_id;
  const saved=(await admin.query('SELECT id,body,body_digest,expires_ms FROM formal_review.reports WHERE work_id=$1',[workId])).rows[0];assert.equal(saved.body,body);assert.equal(saved.body_digest,createHash('sha256').update(body).digest('hex'));
  await handle(confirmId);assert.equal(selectedMessages,3);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  await handle('frv:list:'+A+':0');assert.deepEqual(events.at(-1).embeds,[]);assert.equal(JSON.stringify(events.at(-1)).includes(body),false);await handle(reportControl);assert.equal(events.at(-1).embeds[0].description,body);
  await handle('frr:list:'+A+':0',O);const ownerOpen=events.at(-1).components[0].components[0].custom_id;await handle(ownerOpen,O);await handle(events.at(-1).components[0].components[1].custom_id,O);await handle(events.at(-1).custom_id,O);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  const reviewConfirm=events.at(-1).components[0].components[0].custom_id;await handle(reviewConfirm,O);assert.match(events.at(-1).content,/Review operation recorded/);await handle(reviewConfirm,O);
  const counts={reports:1,reviews:1,operations:2,revision:2};assert.deepEqual(await snapshot(),counts);
  await handle('frv:feedback:'+workId+':'+saved.id);assert.equal(events.at(-1).embeds[0].description,feedback);assert.equal(selectedMessages,3);
  course=false;await handle('frr:list:'+A+':0',O);assert.match(events.at(-1).content,/No current accessible reports/);await handle(reportControl);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);course=true;
  clock=Number(saved.expires_ms);await handle(reportControl);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);assert.equal((await admin.query('SELECT expires_ms FROM formal_review.reports WHERE id=$1',[saved.id])).rows[0].expires_ms,saved.expires_ms);
  composition.attach();assert.equal(client.listenerCount('interactionCreate'),1);assert.deepEqual(await composition.detach(),{drained:true});assert.equal(composition.ready,false);assert.equal(client.listenerCount('interactionCreate'),0);assert.equal((await worker.query('SELECT 1 AS n')).rows[0].n,1);assert.equal(selectedMessages,3);
 }finally{try{await composition?.detach();}finally{source?.dispose();store?.dispose();courseAuthorization?.dispose();await Promise.all([source?.drain(),store?.drain(),courseAuthorization?.drain()]);await worker?.end();try{if(installed)await admin.query('DROP SCHEMA formal_review CASCADE');if(roleCreated)await admin.query(`DROP ROLE "${role}"`);}finally{await admin.end();}}}
});
