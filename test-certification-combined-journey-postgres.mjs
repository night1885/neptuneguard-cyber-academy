import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {attachCertificationRuntime} from './certification-runtime.js';
import {createCertificationDatabasePool} from './certification-database-pool.js';
import {loadCertificationConfig} from './certification-config.js';
import {createCertificationCourseLifecycle} from './certification-course-lifecycle.js';
import {COURSE_SECTION_KEYS} from './certification-course-sections.js';
import {registrationAcknowledgmentUpdateColumns} from './certification-registration-provenance-readiness.js';
import {validateRuntimeCertificationSchema} from './certification-pilot-runtime-readiness.js';
import {validateActiveEnrollmentAgreement} from './certification-schema-readiness.js';
import {validateCourseLifecycleReadiness} from './certification-course-readiness.js';
import {validateCourseRequestReadiness} from './certification-course-request-readiness.js';
import {validateManualReviewDecisionCapabilities} from './certification-manual-review-decision-capabilities.mjs';
const urlText=process.env.CERTIFICATION_TEST_DATABASE_URL;
const enabled=['CERTIFICATION_TEST_ALLOW_ROLE_DDL','CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DDL','CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DECISION_DDL'].every(k=>process.env[k]==='true');
const migrations=['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','008-lab-status-reason.sql','009-active-registration-provenance.sql','010-manual-review-enrollment.sql','011-course-requests.sql'];
const O='100000000000000001',S='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',V='100000000000000006',L='100000000000000007';
const GUIDE='SensitiveReviewGuideFixture',ANSWER='LearnerResponseFixture';
const data=p=>JSON.parse(JSON.stringify(p));
const buttons=i=>(i.latest?.packet?.components||[]).flatMap(r=>r.components||[]);
const control=(i,re)=>{const found=buttons(i).find(b=>!b.disabled&&re.test(b.custom_id||''));assert.ok(found,'Expected native control '+re);return found.custom_id;};
for(const general of [false,true])test('single-database native registration, separate owner review, courses and requests — '+(general?'general members':'restricted targets'), {skip:!urlText||!enabled,timeout:180000},async t=>{
 const u=new URL(urlText);assert.ok(['postgres:','postgresql:'].includes(u.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(u.hostname));assert.equal(u.pathname,'/certification_test');assert.equal(u.search,'');assert.equal(u.hash,'');
 const suffix=randomUUID().replaceAll('-',''),name='cert_combo_'+suffix,primary='cert_app_'+suffix,decision='cert_dec_'+suffix;
 for(const value of [name,primary,decision])assert.match(value,/^[a-z_][a-z0-9_]{0,62}$/);
 const errors=[],roles=[],owned=[],learnerPackets=[],ownerPackets=[];let phase='setup',created=false,db,app,dec,rt,client;
 const state=code=>typeof code==='string'&&/^[A-Z0-9]{5}$/.test(code)?code:'unknown';
 const pool=(connectionString,label)=>{const p=new pg.Pool({connectionString,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'});p.on('error',e=>errors.push({phase,pool:label,code:state(e.code)}));return p;};
 const admin=pool(urlText,'admin');t.after(()=>assert.deepEqual(errors,[],'Unexpected fixture pool or cleanup errors'));
 const stage=p=>{phase=p;t.diagnostic('Combined phase: '+p);};
 let sequence=800000000000000000n;
 const channel=actor=>actor===O?C:L;
 const frame=actor=>({id:String(sequence++),channelId:channel(actor),flags:{has:n=>n===64},author:{id:B},interactionMetadata:{user:{id:actor}}});
 const everyone={},bot={id:B};
 const guild={id:G,roles:{everyone},members:{async fetch(value){const id=typeof value==='object'?value.user:value;return{id,guild:{id:G},pending:false,user:{id,bot:false,username:'Fixture'},roles:{cache:{has:r=>r===V&&[O,S].includes(id)}}};},async fetchMe(){return bot;}}};
 async function send(id,{actor=S,type='button',fields={},values,source}={}){
  let finish;const done=new Promise(r=>finish=r);const message=source||frame(actor);
  const i={customId:id,user:{id:actor,bot:false},member:await guild.members.fetch(actor),guildId:G,guild,channelId:message.channelId,client,message,values,deferred:false,replied:false,ephemeral:false,latest:message,
   isButton:()=>type==='button',isModalSubmit:()=>type==='modal',isStringSelectMenu:()=>type==='menu',fields:{getTextInputValue(k){assert.ok(Object.hasOwn(fields,k),'Missing fixture field '+k);return fields[k];}},
   capture(p){const packet=data(p),target=this.replyFrame||this.message;target.packet=packet;this.latest=target;(actor===O?ownerPackets:learnerPackets).push(packet);finish();},
   async reply(p){assert.equal(p.flags,64);this.replied=true;this.ephemeral=true;this.replyFrame=frame(actor);this.capture(p);},
   async followUp(p){assert.equal(p.flags,64);this.replyFrame=frame(actor);this.capture(p);},
   async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;this.replyFrame=frame(actor);},
   async editReply(p){assert.ok(this.deferred||this.replied);this.capture(p);},async deferUpdate(){this.deferred=true;this.ephemeral=true;this.replyFrame=this.message;},
   async update(p){this.replyFrame=this.message;this.capture(p);},async showModal(p){this.modal=data(p);this.replied=true;(actor===O?ownerPackets:learnerPackets).push(this.modal);finish();}};
  let timer;try{client.emit('interactionCreate',i);await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Missing native response in '+phase)),10000);})]);await new Promise(r=>setImmediate(r));return i;}finally{clearTimeout(timer);}
 }
 const managed=(connection,options)=>{const real=createCertificationDatabasePool(connection,options),entry={ends:0};owned.push(entry);return{query:(...a)=>real.query(...a),connect:()=>real.connect(),end(){entry.ends++;entry.closing??=real.end();return entry.closing;}};};
 async function stop(){if(rt){const closing=rt.detach();assert.equal(rt.detach(),closing);await closing;assert.equal(rt.ready,false);assert.equal(client.listenerCount('interactionCreate'),0);rt=null;}}
 async function start(env){client=new EventEmitter();client.user={id:B};client.isReady=()=>false;client.guilds={fetch:async()=>guild};client.channels={fetch:async id=>{assert.equal(id,C);return{guildId:G,isTextBased:()=>true,send(){assert.fail('No Discord publication');},permissionsFor:member=>({has:()=>member===bot})};}};client.users={fetch(){assert.fail('No Discord DM or user-network lookup');}};
  rt=attachCertificationRuntime(client,undefined,G,env,{createPool:managed});client.emit('clientReady');const deadline=Date.now()+15000;while(!rt.ready&&Date.now()<deadline)await new Promise(r=>setTimeout(r,10));assert.equal(rt.ready,true,'Native combined runtime startup');assert.equal(rt.combinedRegistration,true);assert.equal(rt.registrationPilot,false);assert.equal(rt.manualReviewDecisionsReady,true);
 }
 const record=async()=> (await db.query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1',[S])).rows[0];
 const courses=async()=> (await db.query('SELECT * FROM public.certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key',[S])).rows;
 const requests=async()=> (await db.query('SELECT * FROM public.certification_course_requests WHERE discord_user_id=$1 ORDER BY requested_at,request_id',[S])).rows;
 const audits=async()=> (await db.query('SELECT action,details FROM public.certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY event_id',[S])).rows;
 const confirm=async(i,re,actor=O)=>send(control(i,re),{actor,source:i.latest});
 try{
  stage('disposable-database');assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;u.pathname='/'+name;db=pool(u.href,'setup');
  for(const file of migrations){stage('migration:'+file);await db.query(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));}
  stage('separate-restricted-logins');const passA=randomUUID(),passD=randomUUID();
  for(const [role,password]of [[primary,passA],[decision,passD]]){await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roles.push(role);await db.query(`GRANT CONNECT ON DATABASE "${name}" TO "${role}"`);await db.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);}
  await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await db.query(`GRANT SELECT ON public.certification_enrollments,public.certification_agreements,public.certification_lab_requests,public.certification_course_enrollments,public.certification_audit_events TO "${primary}"`);
  await db.query(`GRANT INSERT(discord_user_id,status,registration_owner_id) ON public.certification_enrollments TO "${primary}"`);
  const updates=[...registrationAcknowledgmentUpdateColumns,'comprehension_submitted_at','comprehension_review_snapshot'];assert.ok(updates.every(v=>/^[a-z_][a-z0-9_]{0,62}$/.test(v)));
  await db.query(`GRANT UPDATE(${updates.join(',')}) ON public.certification_enrollments TO "${primary}"`);
  await db.query(`GRANT INSERT(discord_user_id,course_key,status,assigned_at,assigned_by),UPDATE(course_key,status,completed_at,completed_by) ON public.certification_course_enrollments TO "${primary}"`);
  await db.query(`GRANT SELECT,INSERT,UPDATE ON public.certification_course_requests TO "${primary}"`);
  await db.query(`GRANT INSERT(actor_discord_user_id,subject_discord_user_id,action,details,created_at) ON public.certification_audit_events TO "${primary}"`);
  await db.query(`GRANT SELECT ON public.certification_enrollments,public.certification_agreements TO "${decision}"`);
  await db.query(`GRANT UPDATE(status,student_id,approved_by,approved_at,status_reason,updated_at) ON public.certification_enrollments TO "${decision}"`);
  await db.query(`GRANT INSERT(actor_discord_user_id,subject_discord_user_id,action,details) ON public.certification_audit_events TO "${decision}"`);
  for(const role of roles){await db.query(`GRANT UPDATE(version) ON public.certification_agreements TO "${role}"`);await db.query(`GRANT USAGE ON SEQUENCE public.certification_audit_events_event_id_seq TO "${role}"`);}
  const a=new URL(u);a.username=primary;a.password=passA;const d=new URL(u);d.username=decision;d.password=passD;app=pool(a.href,'primary-assertions');dec=pool(d.href,'decision-assertions');
  const content='Disposable combined journey agreement.',hash=createHash('sha256').update(content).digest('hex');await db.query('INSERT INTO public.certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',['combo-v1',content,hash]);
  const env=Object.freeze({CERTIFICATION_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'true',CERTIFICATION_COURSES_ENABLED:'true',CERTIFICATION_REGISTRATION_PILOT:'false',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSE_REQUESTS_ENABLED:'true',CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED:'false',...(general?{CERTIFICATION_REGISTRATION_SCOPE:'guild-members'}:{CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS:S}),ACADEMY_OWNER_ID:O,ACADEMY_ADMIN_CHANNEL_ID:C,GUILD_ID:G,VERIFIED_ROLE_ID:V,CERTIFICATION_DATABASE_URL:a.href,CERTIFICATION_DATABASE_TLS:'disable',CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL:d.href,CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS:'disable',CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'combo-v1',agreementSha256:hash,comprehensionCheck:{version:'combo-check-v1',questions:[{prompt:'Explain explicit authorization.'}],correctAnswers:[GUIDE]}})});
  const config=loadCertificationConfig(env),lifecycle=createCertificationCourseLifecycle(app,config,{courseKeys:COURSE_SECTION_KEYS});assert.ok(COURSE_SECTION_KEYS.length>=3);const [one,two,three]=COURSE_SECTION_KEYS;
  stage('real-readiness');await validateRuntimeCertificationSchema(app,{pilotConnection:{connectionString:a.href}});await validateActiveEnrollmentAgreement(app,config);await validateCourseLifecycleReadiness(app);await validateCourseRequestReadiness(app);stage('dedicated-decision-preflight');await validateManualReviewDecisionCapabilities(dec,{expectedRole:decision,expectedDatabase:name});stage('native-combined-startup');await start(env);
  if(general){
   assert.equal(config.scopedRegistration.generalMembers,true);assert.deepEqual(config.scopedRegistration.studentIds,[]);assert.equal(env.CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS,undefined);
   stage('general-member-own-home-before-invitation');const home=await send('cert:initial:home');assert.match(JSON.stringify(home.latest.packet),/Ask the academy owner/);assert.equal(await record(),undefined);assert.equal((await courses()).length,0);
  }
  stage('native-registration');let i=await send('cert:register:submit',{actor:O,type:'modal',fields:{discord_user_id:S}});await confirm(i,/^cert:register:confirm:/);assert.equal((await record()).status,'awaiting_acknowledgment');
  stage('native-learner-submission');i=await send('cert:invite:start');for(let n=0;n<20&&!i.modal;n++)i=await send(control(i,/^cert:invite:(form|next):/),{source:i.latest});assert.ok(i.modal);assert.match(i.modal.custom_id,/^cert:invite:send:/);await send(i.modal.custom_id,{type:'modal',source:i.message,fields:{age:'Yes',read:'AGREE',answer0:ANSWER}});
  const pending=await record();assert.equal(pending.status,'pending');assert.equal(pending.student_id,null);assert.equal(pending.approved_by,null);assert.equal(pending.comprehension_passed_at,null);assert.ok(pending.comprehension_submitted_at);assert.equal(await lifecycle.getCourseAuthorization(S,one),null);assert.equal((await courses()).length,0);
  stage('separate-owner-review');await send('cert:review:open:'+S);assert.deepEqual(await record(),pending);i=await send('cert:review:open:'+S,{actor:O});i=await send(control(i,/^cert:review:choose:approve:/),{actor:O,source:i.latest});assert.ok(i.modal);i=await send(i.modal.custom_id,{actor:O,type:'modal',source:i.message,fields:{reason:'Owner reviewed the disposable responses',review_ack:'REVIEWED'}});const decisionId=control(i,/^cert:review:confirm:/),ownerFrame=i.latest;assert.equal((await record()).student_id,null);await send(decisionId,{actor:S,source:ownerFrame});assert.deepEqual(await record(),pending);await send(decisionId,{actor:O,source:ownerFrame});
  const approved=await record();assert.equal(approved.status,'approved');assert.match(approved.student_id,/^NG-PT-[a-f0-9-]{36}$/);assert.equal(approved.approved_by,O);assert.equal(approved.comprehension_passed_at,null);assert.deepEqual(approved.comprehension_review_snapshot,pending.comprehension_review_snapshot);assert.equal((await courses()).length,0);const afterApproval=(await audits()).length;await send(decisionId,{actor:O,source:ownerFrame});assert.equal((await audits()).length,afterApproval);assert.equal((await record()).student_id,approved.student_id);
  stage('native-course-assignment');i=await send('cert:courselife:assign:'+S,{actor:O,type:'menu',values:[one]});await confirm(i,/^cert:courselife:confirm:/);assert.equal((await courses()).length,1);assert.equal((await lifecycle.getCourseAuthorization(S,one)).student_id,approved.student_id);assert.equal(await lifecycle.getCourseAuthorization(S,two),null);
  stage('native-course-login-modal');i=await send('cert:course:open:'+one);assert.ok(i.modal,'Native course login modal must survive combined adapter');assert.match(i.modal.custom_id,/^cert:course:submit:/);i=await send(i.modal.custom_id,{type:'modal',source:i.message,fields:{student_id:approved.student_id}});assert.ok(i.latest.packet.embeds?.length);let oldPage=control(i,/^cert:course:page:/),pageFrame=i.latest;await send(oldPage,{source:pageFrame});
  stage('learner-request-hold');await send('cert:cr:choose:'+two);assert.equal((await requests()).length,0);assert.equal(env.CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED,'false');await stop();assert.equal(owned.length,2);assert.ok(owned.every(p=>p.ends===1));
  stage('explicit-disposable-request-opt-in');await start({...env,CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED:'true'});assert.equal(env.CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED,'false');i=await send('cert:course:open:'+one);assert.ok(i.modal);i=await send(i.modal.custom_id,{type:'modal',source:i.message,fields:{student_id:approved.student_id}});assert.ok(i.latest.packet.embeds?.length);oldPage=control(i,/^cert:course:page:/);pageFrame=i.latest;await send(oldPage,{source:pageFrame});
  async function request(key){let view=await send('cert:cr:choose:'+key);const id=control(view,/^cert:cr:confirm:/);await send(id,{source:view.latest});return view;}
  i=await send('cert:cr:choose:'+two);const requestId=control(i,/^cert:cr:confirm:/),requestFrame=i.latest;await send(requestId);assert.equal((await requests()).length,0);await send(requestId,{source:requestFrame});assert.equal((await requests()).length,1);assert.equal((await requests())[0].status,'pending');assert.equal(await lifecycle.getCourseAuthorization(S,two),null);const requestAuditCount=(await audits()).length;await send(requestId,{source:requestFrame});assert.equal((await audits()).length,requestAuditCount);await request(two);assert.equal((await requests()).length,1);assert.equal((await audits()).length,requestAuditCount);
  stage('native-owner-course-request-approval');const first=(await courses())[0];i=await send('cert:cr:queue:0',{actor:O});i=await send(control(i,/^cert:cr:approve:/),{actor:O,source:i.latest});assert.equal((await courses()).length,1);await confirm(i,/^cert:cr:confirm:/);assert.equal((await requests())[0].status,'approved');assert.equal((await courses()).length,2);assert.deepEqual((await courses()).find(c=>c.course_key===one),first);assert.ok(await lifecycle.getCourseAuthorization(S,one));assert.ok(await lifecycle.getCourseAuthorization(S,two));
  stage('native-owner-course-request-denial');await request(three);i=await send('cert:cr:queue:0',{actor:O});i=await send(control(i,/^cert:cr:deny:/),{actor:O,source:i.latest});await confirm(i,/^cert:cr:confirm:/);assert.equal((await requests()).find(r=>r.course_key===three).status,'denied');assert.equal(await lifecycle.getCourseAuthorization(S,three),null);
  stage('completion-and-stale-navigation');i=await send('cert:courselife:complete:'+S+':'+one,{actor:O});await confirm(i,/^cert:courselife:confirm:/);assert.equal(await lifecycle.getCourseAuthorization(S,one),null);assert.ok(await lifecycle.getCourseAuthorization(S,two));i=await send(oldPage,{source:pageFrame});assert.equal(i.latest.packet.embeds.length,0);assert.equal(i.latest.packet.components.length,0);
  i=await send('cert:courselife:complete:'+S+':'+two,{actor:O});await confirm(i,/^cert:courselife:confirm:/);assert.ok((await courses()).every(c=>c.status==='completed'));const completedAuditCount=(await audits()).length;await request(three);await send('cert:courselife:assign:'+S,{actor:O,type:'menu',values:[three]});assert.equal((await courses()).length,2);assert.equal((await requests()).length,2);assert.equal((await audits()).length,completedAuditCount);assert.equal((await record()).student_id,approved.student_id);assert.equal((await record()).status,'approved');assert.equal((await record()).application_closed_at,null);
  stage('privacy-and-role-boundaries');assert.ok(JSON.stringify(ownerPackets).includes(GUIDE));assert.ok(JSON.stringify(ownerPackets).includes(ANSWER));assert.ok(!JSON.stringify(learnerPackets).includes(GUIDE));assert.ok(!JSON.stringify(await audits()).includes(GUIDE));assert.ok(!JSON.stringify(await audits()).includes(ANSWER));
  await assert.rejects(app.query('UPDATE public.certification_enrollments SET student_id=student_id WHERE discord_user_id=$1',[S]),e=>e.code==='42501');await assert.rejects(dec.query('UPDATE public.certification_enrollments SET comprehension_review_snapshot=comprehension_review_snapshot WHERE discord_user_id=$1',[S]),e=>e.code==='42501');await assert.rejects(dec.query('DELETE FROM public.certification_enrollments WHERE discord_user_id=$1',[S]),e=>e.code==='42501');assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM public.certification_lab_requests')).rows[0].n),0);
  stage('native-shutdown');await stop();assert.equal(owned.length,4);assert.ok(owned.every(p=>p.ends===1));
 }catch(error){throw new Error('Combined phase '+phase+': '+(error?.code||error?.name||'failure'),{cause:error});}
 finally{
  const cleanup=async(label,fn)=>{phase='cleanup:'+label;try{await fn();return true;}catch(e){errors.push({phase,code:state(e.code)});return false;}};
  await cleanup('runtime',stop);for(const p of owned)if(p.closing)await cleanup('owned-pool',()=>p.closing);await cleanup('primary',async()=>{if(app)await app.end();});await cleanup('decision',async()=>{if(dec)await dec.end();});await cleanup('setup',async()=>{if(db)await db.end();});let dropped=!created;if(created)dropped=await cleanup('database',()=>admin.query(`DROP DATABASE "${name}"`));if(dropped)for(const role of roles)await cleanup('role',()=>admin.query(`DROP ROLE "${role}"`));await cleanup('admin',()=>admin.end());
 }
});
