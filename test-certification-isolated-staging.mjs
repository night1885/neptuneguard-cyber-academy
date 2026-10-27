import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { Client, Events, version } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
import { createTrustedFormalReviewRoute } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/trusted-route.mjs';
import { isFormalRead } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-read-policy.mjs';
import { createIsolatedFormalStagingApplication } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/isolated-staging.mjs';
const O='111111111111111111',G='222222222222222222',B='333333333333333333',C='444444444444444444',R='555555555555555555',E='666666666666666666',A='999999999999999999',M='100000000000000001';
const T='2026-01-01T00:00:00.000Z',K='formal-ethical-hacking';
async function until(check){for(let i=0;i<200&&!check();i++)await new Promise(r=>setImmediate(r));assert.ok(check(),'Expected synthetic staging checkpoint');}
function fixture(t){
 assert.equal(version,'14.27.0');
 const client=new Client({intents:[]});Object.defineProperty(client,'user',{configurable:true,value:{id:B}});
 const state={ended:0,policyReads:0,active:true,exits:[],queryKinds:[]};
 const agreement='Synthetic isolated staging agreement.',hash=createHash('sha256').update(agreement).digest('hex');
 const env={FORMAL_STAGING_ENABLED:'true',CERTIFICATION_ENABLED:'true',GUILD_ID:G,ACADEMY_OWNER_ID:O,ACADEMY_ADMIN_CHANNEL_ID:C,
 VERIFIED_ROLE_ID:R,FORMAL_STAGING_BOT_ID:B,FORMAL_STAGING_ENTRY_CHANNEL_ID:E,
 CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable',
 CERTIFICATION_REGISTRATION_PILOT:'false',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',
 CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSES_ENABLED:'false',CERTIFICATION_MANUAL_REVIEW_ENABLED:'false',CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'false',
 CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'synthetic-v1',agreementSha256:hash,
 comprehensionCheck:{version:'synthetic-check-v1',questions:[{prompt:'Synthetic question'}],correctAnswers:['Synthetic response']}})};
 const row={discord_user_id:A,status:'approved',student_id:'SYNTHETIC-STUDENT',approved_by:O,approved_at:T,signature_method:'discord_account',
 acknowledgment_name:null,signature_reference:null,agreement_version:'synthetic-v1',agreement_content_sha256:hash,acknowledged_at:T,learner_confirmed_read_at:T,
 comprehension_passed_at:T,comprehension_check_version:'synthetic-check-v1',age_eligible:true,age_declared_at:T,age_declaration_version:'adult-18-v1',
 course_status:'active',authorized_course_key:K,application_closed_at:null,application_closed_by:null,application_closed_as:null};
 const bot={},everyone={};
 const guild={id:G,available:true,roles:{everyone},members:{
 async fetch(request){if(typeof request==='string'){assert.equal(request,O);return {id:O};}
 assert.deepEqual(request,{user:A,force:true,cache:false});return {id:A,guild:{id:G},roles:{cache:new Set([R])}};},async fetchMe(){return bot;}}};
 Object.defineProperty(client.guilds,'fetch',{value:async id=>{assert.equal(id,G);return guild;}});
 Object.defineProperty(client.channels,'fetch',{value:async id=>{assert.equal(id,C);return {guildId:G,isTextBased:()=>true,
 send(){assert.fail('No publication');},permissionsFor:member=>({has:()=>member===bot})};}});
 for(const verb of ['get','post','put','patch','delete'])Object.defineProperty(client.rest,verb,{value:async()=>{throw new Error('No network in staging tests');}});
 const pool={async query(sql,params){assert.match(sql.trim(),/^SELECT\b/);state.queryKinds.push('SELECT');
 if(isFormalRead(sql,params)){state.policyReads++;return {rows:state.active?[structuredClone(row)]:[]};}
 if(sql.includes("to_regclass('certification_agreements')"))return {rows:[{agreements:'agreements',enrollments:'enrollments',labs:'labs',audit:'audit'}]};
 if(sql.includes('FROM pg_attribute'))return {rows:requiredEnrollmentColumns.map(attname=>({attname}))};
 if(sql.includes('FROM pg_constraint'))return {rows:[{conname:'certification_account_acknowledgment_required',convalidated:true}]};
 if(sql.includes('FROM pg_trigger'))return {rows:(params[0]==='certification_enrollments'?['certification_student_id_immutable']:['certification_agreement_immutable','certification_agreement_no_truncate']).map(tgname=>({tgname,tgenabled:'O'}))};
 if(sql.startsWith('SELECT content'))return {rows:[{content:agreement,content_sha256:hash}]};throw new Error('Unexpected synthetic query');},async end(){state.ended++;}};
 const bundle={schemaVersion:1,mode:'draft-review-only',courseId:K,runtimeIntegration:false,publishable:false,
 pages:[{id:'first',audience:'learner',kind:'reading',title:'Synthetic first page',text:'SYNTHETIC STAGING ONE'},
 {id:'second',audience:'learner',kind:'reading',title:'Synthetic next page',text:'SYNTHETIC STAGING TWO'}]};
 const app=createIsolatedFormalStagingApplication({client,env,bundle,
 productionBoundary:{guildId:'777777777777777777',botId:'888888888888888888',databaseHost:'production.example',databasePort:'5432',databaseName:'production'},
 lifecycle:{signals:new EventEmitter(),exit:code=>state.exits.push(code),log:()=>{},timeoutMs:1000}},
 {loadConfig:loadCertificationConfig,createApplication:createRestoredCertificationApplication,attachRuntime:attachCertificationRuntime,
 createRoute:createTrustedFormalReviewRoute,createPool(connection,limits){assert.equal(limits.readOnly,true);assert.equal(limits.max,2);return pool;}});
 t.after(async()=>{try{await app.shutdown();}finally{await client.destroy();}});
 function button(customId='fws:open'){
 return {customId,guildId:G,channelId:E,user:{id:A},isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,
 deferred:false,replied:false,ephemeral:false,message:{id:M,flags:{has:bit=>bit===64}},edits:[],replies:[],
 async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},
 async editReply(p){this.edits.push(p);return {id:M,flags:{has:bit=>bit===64}};},async reply(p){this.replies.push(p);this.replied=true;}};
 }
 return {app,client,state,button,async ready(){client.emit(Events.ClientReady,client);await until(()=>app.ready);},emit:i=>client.emit(Events.InteractionCreate,i)};
}
test('actual application runtime config and formal route construct without login and shut down one pool',async t=>{
 const f=fixture(t);assert.equal(f.app.ready,false);assert.equal(f.state.queryKinds.length,0);await f.app.shutdown();assert.equal(f.state.ended,1);assert.deepEqual(f.state.exits,[0]);
});
test('actual isolated composition opens and navigates using synthetic providers then denies assignment removal',async t=>{
 const f=fixture(t);await f.ready();const entry=f.button();f.emit(entry);await until(()=>entry.edits.length===1);assert.match(entry.edits[0].content,/SYNTHETIC STAGING ONE/);
 const next=f.button(entry.edits[0].components[0].components.find(b=>b.label==='Next').custom_id);f.emit(next);await until(()=>next.edits.length===1);assert.match(next.edits[0].content,/SYNTHETIC STAGING TWO/);
 f.state.active=false;const home=f.button(next.edits[0].components[0].components.find(b=>b.label==='Home').custom_id);f.emit(home);await until(()=>home.edits.length===1);
 assert.deepEqual(home.edits[0].components,[]);assert.ok(f.state.policyReads>0);assert.equal(JSON.stringify([entry.edits,next.edits,home.edits]).includes('SYNTHETIC-STUDENT'),false);
});
test('actual root listener rejects nonformal certification actions without policy reads',async t=>{
 const f=fixture(t);await f.ready();const i=f.button('cert:initial:home');f.emit(i);await until(()=>i.replies.length===1);
 assert.equal(i.replies[0].flags,64);assert.equal(f.state.policyReads,0);assert.deepEqual(i.replies[0].components,[]);
});
test('wrong logged-in bot blocks actual formal policy reads after root readiness',async t=>{
 const f=fixture(t);await f.ready();Object.defineProperty(f.client,'user',{value:{id:O}});assert.equal(f.app.ready,false);
 const i=f.button();f.emit(i);await until(()=>i.replies.length===1);assert.equal(f.state.policyReads,0);assert.equal(i.edits.length,0);
});
