import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createFormalReviewStore} from './formal-review-postgres.mjs';
import {createFormalDiscordSource} from './formal-review-discord-source.mjs';
import {createFormalReviewComposition} from './formal-review-composition.mjs';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
import {createCertificationCourseRemoval} from './certification-course-removal.mjs';
import {createCertificationSubmission} from './certification-submission.js';
import {createCertificationService} from './certification-service.js';
const url=process.env.FORMAL_REVIEW_TEST_DATABASE_URL;
test('composition integrates actual enrollment, receipts, private recovery UI and fictional source HTTP',{skip:!url,timeout:90000},async()=>{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.CERTIFICATION_ENABLED,'false');for(const k of ['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'])assert.equal(process.env[k]||'','');
 const target=new URL(url);assert.ok(['postgres:','postgresql:'].includes(target.protocol));assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'5432');assert.equal(target.pathname,'/formal_review_test');assert.equal(target.username,'formal_review_admin');assert.equal(target.search,'');assert.equal(target.hash,'');
 const [{default:pg},sdk]=await Promise.all([import('pg'),import('discord.js')]);
 const G='100000000000000003',O='100000000000000001',A='100000000000000002',C='100000000000000004',B='100000000000000005',KEY='ethical-hacking-reading',OTHER='fixture-other',workId=randomUUID(),database='composition_'+randomUUID().replaceAll('-',''),role='compose_review_'+randomUUID().replaceAll('-',''),courseRole=role+'_c',metadataRole=role+'_m',receiptRole=role+'_r',password=randomUUID();
 const admin=new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:5000,options:'-c statement_timeout=15000 -c lock_timeout=5000'}),client=new EventEmitter(),events=[],createdRoles=[];
 let databaseCreated=false,db,worker,reader,metadata,receipts,store,source,composition,courseAuthorization,removal,config,studentId,clock,baseline,messageId,sourceCreated,serial=100000000000001000n,privateChannel=true,selectedMessages=0,updates=0,receiptQueries=0,failRecoveryDelivery=false;
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
 function interaction(customId,actor=A){const modal=customId.startsWith('frv:preview:')||customId.startsWith('frr:form:'),fields=new Map(customId.startsWith('frv:preview:')?[['source_message_id',messageId],['consent','PREVIEW']]:[['feedback',feedback],['ack','REVIEWED']]);return {id:(serial++).toString(),customId,applicationId:B,guildId:G,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actor},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>!modal,isModalSubmit:()=>modal,fields:{fields,getTextInputValue:k=>fields.get(k)},async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;this.ephemeral=true;},async deferUpdate(){updates++;this.deferred=true;},async showModal(p){new sdk.ModalBuilder(p).toJSON();events.push(p);this.replied=true;},async editReply(p){validate(p);events.push(p);if(failRecoveryDelivery&&p.content.startsWith('Latest recorded ')){failRecoveryDelivery=false;throw Error('Fictional recovery delivery failure');}},async reply(p){assert.equal(p.flags,64);validate(p);events.push(p);this.replied=true;}};}
 const handle=(id,actor=A)=>composition.handle(interaction(id,actor));
 async function snapshot(){return (await db.query('SELECT (SELECT count(*)::int FROM formal_review.reports WHERE work_id=$1) AS reports,(SELECT count(*)::int FROM formal_review.reviews WHERE work_id=$1) AS reviews,(SELECT count(*)::int FROM formal_review.operations WHERE work_id=$1) AS operations,(SELECT revision FROM formal_review.work WHERE id=$1) AS revision',[workId])).rows[0];}
 function compose(){
  store=createFormalReviewStore({enabled:true,pool:worker,ownerId:O,expectedDatabase:database,expectedLogin:role});
  source=createFormalDiscordSource({enabled:true,guildId:G,ownerId:O,botId:B,token:'fictional_composition_token_only',fetchImpl,isReady:()=>true,now:()=>clock,providerTimeoutMs:2000});
  courseAuthorization=createFormalReviewCourseAuthorization({enabled:true,guildId:G,ownerId:O,readPool:reader,config,expectedDatabase:database,expectedLogin:courseRole,isReady:()=>true,providerTimeoutMs:2000});
  composition=createFormalReviewComposition({enabled:true,guildId:G,ownerId:O,reviewerChannelId:C,applicationId:B,botId:B,exerciseKeys:['EH-NET-02'],client,store,courseAuthorization,source,metadataPool:metadata,recoveryEnabled:true,receiptPool:{query(...args){receiptQueries++;return receipts.query(...args);}},authorizeExercise:async s=>s.exerciseKey==='EH-NET-02',authorizeReviewer:async s=>s.actorId===O,isReady:()=>true,verifyResources:async()=>true,now:()=>clock});
 }
 try{
  const identity=(await admin.query("SELECT current_database() AS db,current_user AS login,current_setting('server_version_num')::int AS version")).rows[0];assert.equal(identity.db,'formal_review_test');assert.equal(identity.login,'formal_review_admin');assert.ok([16,18].includes(Math.floor(identity.version/10000)));
  await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);databaseCreated=true;target.pathname='/'+database;
  db=new pg.Pool({connectionString:target.href,max:3,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=10000 -c lock_timeout=3000'});assert.equal((await db.query('SELECT current_database() AS db')).rows[0].db,database);
  for(const file of ['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','013-course-removal-events.sql','012-formal-review.sql'])await db.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
  const agreement='Disposable composition enrollment agreement.',digest=createHash('sha256').update(agreement).digest('hex');config={enabled:true,courseRemovalEnabled:true,ownerId:O,enrollmentSubmissionEnabled:true,activeAgreementVersion:'composition-fixture',activeAgreementSha256:digest,comprehensionCheck:{version:'composition-check',correctAnswers:['stop']}};
  await db.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',[config.activeAgreementVersion,agreement,digest]);
  await createCertificationSubmission(db,config).submitEnrollment(A,{ageEligibility:'yes',acknowledgmentAccepted:true,confirmedRead:true,agreementVersion:config.activeAgreementVersion,agreementSha256:digest,comprehensionCheckVersion:config.comprehensionCheck.version,answers:['stop']});
  studentId=(await createCertificationService(db,config).approveEnrollment(O,A)).studentId;assert.ok(typeof studentId==='string'&&studentId.length>0);
  removal=createCertificationCourseRemoval(db,config,{courseKeys:[KEY,OTHER],isReady:()=>true});await removal.assignCourses(O,A,[KEY,OTHER]);
  for(const login of [role,courseRole,metadataRole,receiptRole]){await db.query(`CREATE ROLE "${login}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);createdRoles.push(login);}
  await db.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA formal_review TO "${role}"; GRANT SELECT ON ALL TABLES IN SCHEMA formal_review TO "${role}"; GRANT INSERT ON formal_review.reports,formal_review.reviews,formal_review.operations TO "${role}"; GRANT UPDATE(revision,state,expires_ms) ON formal_review.work TO "${role}"`);
  await db.query(`GRANT USAGE ON SCHEMA public TO "${courseRole}"; GRANT SELECT ON public.certification_enrollments,public.certification_course_enrollments TO "${courseRole}"; GRANT SELECT(discord_user_id,course_key) ON public.certification_course_removals TO "${courseRole}"; ALTER ROLE "${courseRole}" SET default_transaction_read_only=on`);
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${metadataRole}"; GRANT SELECT(id,guild_id,learner_id,course_key,expires_ms) ON formal_review.work TO "${metadataRole}"; GRANT SELECT(id,work_id,submitted_ms,expires_ms) ON formal_review.reports TO "${metadataRole}"; ALTER ROLE "${metadataRole}" SET default_transaction_read_only=on`);
  await db.query(`GRANT USAGE ON SCHEMA formal_review TO "${receiptRole}"; GRANT SELECT(id,guild_id,learner_id,expires_ms) ON formal_review.work TO "${receiptRole}"; GRANT SELECT(work_id,actor_id,operation_id,action,report_id,revision,expires_ms) ON formal_review.operations TO "${receiptRole}"; ALTER ROLE "${receiptRole}" SET default_transaction_read_only=on`);
  function pool(login,max,searchPath){const u=new URL(target.href);u.username=login;u.password=password;return new pg.Pool({connectionString:u.href,max,connectionTimeoutMillis:5000,options:'-c search_path='+searchPath+' -c statement_timeout=2000 -c lock_timeout=1000'});}
  worker=pool(role,2,'public');reader=pool(courseRole,2,'public');metadata=pool(metadataRole,1,'pg_catalog');receipts=pool(receiptRole,1,'pg_catalog');
  clock=baseline=Date.now();sourceCreated=clock-1000;messageId=(((BigInt(sourceCreated)-1420070400000n)<<22n)+1n).toString();
  await db.query("INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,$4,$5,'ethical-hacking-reading','EH-NET-02',$6,$7)",[workId,G,A,studentId,C,clock-5000,clock-5000+86400000]);
  compose();assert.equal(selectedMessages,0);assert.equal(client.listenerCount('interactionCreate'),0);assert.equal(await composition.initialize(),true);assert.equal(client.listenerCount('interactionCreate'),0);
  const empty={reports:0,reviews:0,operations:0,revision:0};assert.deepEqual(await snapshot(),empty);
  for(const actor of [A,O]){await handle((actor===A?'frv:':'frr:')+'recover:'+workId,actor);assert.match(events.at(-1).content,/unavailable or unconfirmed/);assert.deepEqual(events.at(-1).components,[]);assert.deepEqual(await snapshot(),empty);assert.equal(selectedMessages,0);}
  await handle('frv:start:'+workId);assert.equal(selectedMessages,0);await handle(events.at(-1).components[0].components[0].custom_id);const modalId=events.at(-1).custom_id;
  privateChannel=false;await handle(modalId);assert.equal(selectedMessages,0);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),empty);privateChannel=true;
  await handle(modalId);assert.equal(selectedMessages,1);assert.equal(events.at(-1).embeds[0].description,body);const confirmId=events.at(-1).components[0].components[0].custom_id;assert.deepEqual(await snapshot(),empty);
  sourceBody='Edited after the fictional preview.';await handle(confirmId);assert.match(events.at(-1).content,/outcome is unconfirmed/);assert.equal(selectedMessages,2);assert.deepEqual(await snapshot(),empty);
  sourceBody=body;await handle(confirmId);assert.match(events.at(-1).content,/submission recorded/);assert.equal(selectedMessages,3);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  const reportControl=events.at(-1).components.flatMap(r=>r.components).find(b=>b.custom_id.startsWith('frv:report:')).custom_id;
  const saved=(await db.query('SELECT id,body,body_digest,expires_ms FROM formal_review.reports WHERE work_id=$1',[workId])).rows[0];assert.equal(saved.body,body);assert.equal(saved.body_digest,createHash('sha256').update(body).digest('hex'));
  await handle(confirmId);assert.equal(selectedMessages,3);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  await handle('frv:recover:'+workId);assert.match(events.at(-1).content,/Latest recorded submission/);assert.deepEqual(events.at(-1).embeds,[]);assert.equal(events.at(-1).components[0].components[0].custom_id,reportControl);assert.equal(JSON.stringify(events.at(-1)).includes(body),false);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  await handle('frv:list:'+A+':0');assert.deepEqual(events.at(-1).embeds,[]);assert.equal(JSON.stringify(events.at(-1)).includes(body),false);await handle(reportControl);assert.equal(events.at(-1).embeds[0].description,body);
  await handle('frr:list:'+A+':0',O);const ownerOpen=events.at(-1).components[0].components[0].custom_id;await handle(ownerOpen,O);await handle(events.at(-1).components[0].components[1].custom_id,O);await handle(events.at(-1).custom_id,O);assert.deepEqual(await snapshot(),{reports:1,reviews:0,operations:1,revision:1});
  const reviewConfirm=events.at(-1).components[0].components[0].custom_id;await handle(reviewConfirm,O);assert.match(events.at(-1).content,/Review operation recorded/);await handle(reviewConfirm,O);
  const counts={reports:1,reviews:1,operations:2,revision:2};assert.deepEqual(await snapshot(),counts);
  async function recoveryJourney(actor){
   const prefix=actor===A?'frv:':'frr:',before=updates;
   await handle(prefix+'recover:'+workId,actor);const view=events.at(-1);assert.match(view.content,/Latest recorded/);assert.deepEqual(view.embeds,[]);assert.match(view.content,/No write was retried/);assert.equal(JSON.stringify(view).includes(body),false);assert.equal(JSON.stringify(view).includes(feedback),false);assert.equal(JSON.stringify(view).includes(saved.body_digest),false);
   assert.equal(view.components[0].components[0].custom_id,prefix+(actor===A?'report:':'open:')+workId+':'+saved.id);
   await handle(view.components[0].components[2].custom_id,actor);assert.deepEqual(events.at(-1),view);
   await handle(view.components[0].components[0].custom_id,actor);assert.equal(events.at(-1).embeds[0].description,body);
   await handle(view.components[0].components[1].custom_id,actor);assert.equal(events.at(-1).embeds[0].description,feedback);assert.equal(updates-before,4);assert.deepEqual(await snapshot(),counts);assert.equal(selectedMessages,3);
  }
  async function recoveryDenied(actor){await handle((actor===O?'frr:':'frv:')+'recover:'+workId,actor);const view=events.at(-1);assert.match(view.content,/unavailable or unconfirmed/);assert.deepEqual(view.components,[]);assert.deepEqual(view.embeds,[]);assert.equal(JSON.stringify(view).includes(saved.id),false);assert.deepEqual(await snapshot(),counts);assert.equal(selectedMessages,3);}
  const beforeDeliveryFailure=receiptQueries;failRecoveryDelivery=true;await handle('frv:recover:'+workId);assert.match(events.at(-1).content,/unavailable or unconfirmed/);assert.deepEqual(events.at(-1).components,[]);assert.equal(receiptQueries-beforeDeliveryFailure,1);assert.deepEqual(await snapshot(),counts);
  for(const actor of [A,O])await recoveryJourney(actor);
  for(const actor of [A,O]){const i=interaction((actor===A?'frv:':'frr:')+'recover:'+workId,actor),before=events.length;i.message.flags.has=()=>false;await composition.handle(i);assert.equal(events.length,before);assert.deepEqual(await snapshot(),counts);}
  await recoveryDenied('100000000000000006');
  await handle('frv:feedback:'+workId+':'+saved.id);assert.equal(events.at(-1).embeds[0].description,feedback);assert.equal(selectedMessages,3);
  await db.query("UPDATE public.certification_enrollments SET status='revoked' WHERE discord_user_id=$1",[A]);await handle('frr:list:'+A+':0',O);assert.match(events.at(-1).content,/No current accessible reports/);await handle(reportControl);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);
  for(const actor of [A,O])await recoveryDenied(actor);
  await db.query("UPDATE public.certification_enrollments SET status='approved' WHERE discord_user_id=$1",[A]);await handle(reportControl);assert.equal(events.at(-1).embeds[0].description,body);
  clock=Number(saved.expires_ms);await handle(reportControl);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);assert.equal((await db.query('SELECT expires_ms FROM formal_review.reports WHERE id=$1',[saved.id])).rows[0].expires_ms,saved.expires_ms);
  for(const actor of [A,O])await recoveryDenied(actor);
  composition.attach();assert.equal(client.listenerCount('interactionCreate'),1);assert.deepEqual(await composition.detach(),{drained:true});assert.equal(composition.ready,false);assert.equal(client.listenerCount('interactionCreate'),0);assert.equal((await worker.query('SELECT 1 AS n')).rows[0].n,1);assert.equal((await receipts.query('SELECT 1 AS n')).rows[0].n,1);assert.equal(selectedMessages,3);
  clock=baseline;compose();assert.equal(await composition.initialize(),true);await handle(reportControl);assert.equal(events.at(-1).embeds[0].description,body);assert.deepEqual(await snapshot(),counts);
  await handle(confirmId);assert.match(events.at(-1).content,/outcome is unconfirmed/);await handle(reviewConfirm,O);assert.match(events.at(-1).content,/outcome is unconfirmed/);assert.deepEqual(await snapshot(),counts);
  for(const actor of [A,O])await recoveryJourney(actor);
  const enrollmentBefore=(await db.query('SELECT status,student_id FROM public.certification_enrollments WHERE discord_user_id=$1',[A])).rows[0];
  const receipt=await removal.removeCourse(O,A,KEY);assert.equal(receipt.ok,true);assert.equal(receipt.deletionAuthorized,false);assert.equal(Date.parse(receipt.eligibleAt)-Date.parse(receipt.removedAt),86400000);
  for(const actor of [A,O]){await handle((actor===A?'frv':'frr')+':list:'+A+':0',actor);assert.match(events.at(-1).content,/No current accessible reports/);}
  await handle(reportControl);assert.deepEqual(events.at(-1).embeds,[]);await handle('frr:open:'+workId+':'+saved.id,O);assert.deepEqual(events.at(-1).embeds,[]);assert.deepEqual(await snapshot(),counts);assert.equal(selectedMessages,3);
  for(const actor of [A,O])await recoveryDenied(actor);
  assert.deepEqual((await db.query('SELECT status,student_id FROM public.certification_enrollments WHERE discord_user_id=$1',[A])).rows[0],enrollmentBefore);assert.ok(await removal.getCourseAuthorization(A,OTHER));
  const retried=await removal.removeCourse(O,A,KEY);assert.equal(retried.reference,receipt.reference);assert.equal(retried.eligibleAt,receipt.eligibleAt);
  await assert.rejects(metadata.query('SELECT body FROM formal_review.reports'),e=>e.code==='42501');await assert.rejects(metadata.query('SELECT feedback FROM formal_review.reviews'),e=>e.code==='42501');await assert.rejects(metadata.query('DELETE FROM formal_review.reports'),e=>['25006','42501'].includes(e.code));
  await assert.rejects(reader.query('SELECT removed_at FROM public.certification_course_removals'),e=>e.code==='42501');await assert.rejects(reader.query('SELECT * FROM public.certification_audit_events'),e=>e.code==='42501');await assert.rejects(reader.query('DELETE FROM public.certification_course_removals'),e=>['25006','42501'].includes(e.code));
  for(const sql of ['SELECT body FROM formal_review.reports','SELECT feedback FROM formal_review.reviews','SELECT digest FROM formal_review.operations'])await assert.rejects(receipts.query(sql),e=>e.code==='42501');
  await assert.rejects(receipts.query('DELETE FROM formal_review.operations'),e=>['25006','42501'].includes(e.code));
  await assert.rejects(worker.query('SELECT * FROM public.certification_enrollments'),e=>e.code==='42501');
 }finally{try{await composition?.detach();}finally{source?.dispose();store?.dispose();courseAuthorization?.dispose();removal?.dispose();await Promise.all([source?.drain(),store?.drain(),courseAuthorization?.drain(),removal?.drain()]);await Promise.all([receipts?.end(),metadata?.end(),reader?.end(),worker?.end(),db?.end()]);try{if(databaseCreated)await admin.query(`DROP DATABASE "${database}"`);}finally{try{for(const login of createdRoles.reverse())await admin.query(`DROP ROLE "${login}"`);}finally{await admin.end();}}}}
});
