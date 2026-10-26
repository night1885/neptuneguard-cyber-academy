import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import { loadCertificationConfig } from './certification-config.js';
import { readReadOnlyPreviewFlag, createReadOnlyPreviewPool, createReadOnlyPreviewRouter } from './certification-read-only-preview.js';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { GENERAL_CHAT_UI_TARGET as TARGET, createGeneralChatUiReviewOptions, isGeneralChatUiReviewOptions } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/general-chat-ui-review.mjs';
const OWNER='222222222222222222',STUDENT='111111111111111111',MEMBER='666666666666666666',ADMIN='444444444444444444',PRIVATE='777777777777777777';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(t,{formalReview=createGeneralChatUiReviewOptions({enabled:true}),guildId=TARGET.guildId,failDecision=false,failSchema=false}={}) {
  const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'true',
    CERTIFICATION_REGISTRATION_PILOT:'true',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSES_ENABLED:'false',ACADEMY_OWNER_ID:OWNER,ACADEMY_ADMIN_CHANNEL_ID:ADMIN,
    GUILD_ID:guildId,CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS:STUDENT,
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'synthetic-ui-pilot-v1',agreementSha256:'a'.repeat(64),
      comprehensionCheck:{version:'synthetic-check',questions:[{prompt:'Synthetic fixture only'}],correctAnswers:['synthetic']}})};
  const state={decisions:0,initializes:0,disposes:0,ends:0,sql:[],members:0,present:true,registrations:0,learners:0,trace:[]};
  const client=new EventEmitter(),bot={},everyone={};client.isReady=()=>false;
  client.guilds={async fetch(id){assert.equal(id,guildId);return {id:guildId,available:true,roles:{everyone},members:{
    async fetch(request){if(typeof request==='string'){assert.equal(request,OWNER);return {id:OWNER};}
      assert.equal(request.force,true);assert.equal(request.cache,false);state.members++;
      return state.present?{id:request.user,guild:{id:guildId}}:null;},async fetchMe(){return bot;}}};}};
  client.channels={async fetch(id){assert.equal(id,ADMIN);return {guildId,isTextBased:()=>true,send(){assert.fail('No publication');},permissionsFor:member=>({has:()=>member===bot})};}};
  const backing={async connect(){return {async query(sql){state.sql.push(sql);return {rows:[]};},release(){}};},async end(){state.ends++;}};
  const base=async i=>{await i.reply({content:'Synthetic read view'});return true;};
  base.initialize=async()=>{state.trace.push('base');};base.dispose=()=>{};
  const createDecisionHandler=()=>{
    const handler=async i=>{state.decisions++;await i.reply({content:'Synthetic owner decision route'});return true;};handler.ready=false;
    handler.initialize=async()=>{state.initializes++;state.trace.push('decisions');if(failDecision)throw new Error('Synthetic decision failure');handler.ready=true;return {ready:true};};
    handler.dispose=async()=>{state.disposes++;handler.ready=false;};return handler;
  };
  const context={Events:{InteractionCreate:'interactionCreate',ClientReady:'clientReady'},PermissionFlagsBits:{ViewChannel:1,SendMessages:2,EmbedLinks:4},
    console:{log(){},error(){}},loadCertificationConfig,readReadOnlyPreviewFlag,createReadOnlyPreviewPool,createReadOnlyPreviewRouter,
    readRegistrationPilotOptions,createRegistrationPilotPolicy,createRegistrationPilotRouter,isGeneralChatUiReviewOptions,
    readApplicationClosureFlag:()=>false,readCourseRuntimeOptions:()=>({enabled:false}),
    loadCertificationDatabaseConnection:()=>({connectionString:'synthetic-primary'}),createCertificationDatabasePool:()=>backing,
    createCertificationRouter:()=>base,createClosureRuntimeRouter(){assert.fail();},createCourseRuntimeRouter(){assert.fail();},
    createCertificationService:()=>({getCourseAuthorization(){assert.fail('Pilot course access stays blocked');}}),
    validateCertificationSchema:async db=>{state.trace.push('schema');if(failSchema)throw new Error('Synthetic schema failure');await db.query('SELECT 1');},
    validateActiveEnrollmentAgreement:async db=>{state.trace.push('agreement');await db.query('SELECT 1');},
    createRegistrationPilotHandlers:()=>({registration:async()=>{state.registrations++;return true;},learner:async()=>{state.learners++;return true;}}),
    createOwnerRegistrationHandler(){},createInvitationInteractionHandler(){},replyRetentionHold:i=>i.reply({content:'Synthetic hold',flags:64})};
  const source=await readFile(new URL('./certification-runtime.js',import.meta.url),'utf8');
  runInNewContext(source.replace(/^import [^\n]*\n/gm,'').replace(/^export /gm,'')+';globalThis.attach=attachCertificationRuntime;',context);
  const runtime=context.attach(client,undefined,guildId,env,{createDecisionHandler,formalReview});
  t.after(()=>runtime.detach());
  return {runtime,client,state,async start(expected=true){client.emit('clientReady');for(let n=0;n<100&&!runtime.ready;n++)await tick();assert.equal(runtime.ready,expected);},
    async dispatch(i){client.emit('interactionCreate',i);for(let n=0;n<100&&!i.messages.length;n++)await tick();assert.ok(i.messages.length);}};
}
function interaction(customId='fws:open',actor=MEMBER,channelId=TARGET.channelId){
  return {customId,guildId:TARGET.guildId,channelId,user:{id:actor},deferred:false,replied:false,ephemeral:false,messages:[],
    isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,
    message:{id:PRIVATE,flags:{has:flag=>flag===64},interactionMetadata:{user:{id:actor}}},
    async deferReply(payload){assert.equal(payload.flags,64);this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},
    async reply(payload){this.messages.push(payload);this.replied=true;},async followUp(payload){this.messages.push(payload);},
    async editReply(payload){this.messages.push(payload);this.replied=true;return {id:PRIVATE,flags:{has:flag=>flag===64}};}};
}
test('only exact frozen issued options for the fixed guild receive compatibility',()=>{
  const issued=createGeneralChatUiReviewOptions({enabled:true});assert.ok(Object.isFrozen(issued));assert.equal(isGeneralChatUiReviewOptions(issued,TARGET.guildId),true);
  for(const item of [undefined,null,true,{},createGeneralChatUiReviewOptions(),{...issued},Object.create(issued),new Proxy(issued,{})])assert.equal(isGeneralChatUiReviewOptions(item,TARGET.guildId),false);
  assert.equal(isGeneralChatUiReviewOptions(issued,'333333333333333333'),false);
});
test('generic and copied formal routes remain incompatible with the pilot',async t=>{
  const issued=createGeneralChatUiReviewOptions({enabled:true});
  for(const formalReview of [{...issued},{enabled:true,reviewOnly:true,mode:'review',createRoute(){assert.fail('Untrusted factory must not run');}}])
    await assert.rejects(fixture(t,{formalReview}),/Formal review requires isolated/);
});
test('fixed UI options cannot authorize pilot coexistence in another guild',async t=>{
  await assert.rejects(fixture(t,{guildId:'333333333333333333'}),/Formal review requires isolated/);
});
test('UI coexistence preserves enabled pilot and owner-decision readiness',async t=>{
  const f=await fixture(t);await f.start();assert.equal(f.runtime.registrationPilot,true);assert.equal(f.runtime.manualReviewDecisionsReady,true);assert.equal(f.runtime.formalReviewReady,true);
  assert.ok(f.state.trace.indexOf('decisions')>f.state.trace.indexOf('agreement'));assert.ok(f.state.trace.indexOf('decisions')>f.state.trace.indexOf('base'));
  await f.dispatch(interaction(`cert:review:open:${STUDENT}`,OWNER,ADMIN));assert.equal(f.state.decisions,1);assert.equal(await f.runtime.getCourseAuthorization(STUDENT),null);
});
test('non-pilot guild member gets only synthetic UI without DB or pilot operations',async t=>{
  const f=await fixture(t);await f.start();const queries=f.state.sql.length,i=interaction();await f.dispatch(i);
  assert.equal(i.ephemeral,true);assert.match(i.messages.at(-1).content,/UI preview 1\/3/);assert.equal(f.state.sql.length,queries);
  assert.equal(f.state.decisions,0);assert.equal(f.state.registrations,0);assert.equal(f.state.learners,0);assert.ok(f.state.members>0);
  const denied=interaction(`cert:review:open:${STUDENT}`,MEMBER,ADMIN);await f.dispatch(denied);assert.equal(f.state.decisions,0);assert.equal(denied.messages[0].flags,64);
});
for(const failure of [{failSchema:true},{failDecision:true}])test(`startup failure also blocks UI: ${JSON.stringify(failure)}`,async t=>{
  const f=await fixture(t,failure);await f.start(false);const i=interaction();await f.dispatch(i);assert.equal(i.messages[0].flags,64);
  assert.equal(JSON.stringify(i.messages).includes('UI preview'),false);assert.equal(f.state.members,0);assert.equal(f.runtime.formalReviewReady,false);
});
test('membership loss retires UI without granting pilot access',async t=>{
  const f=await fixture(t);await f.start();const opened=interaction();await f.dispatch(opened);
  const next=opened.messages.at(-1).components[0].components.find(b=>b.label==='Next').custom_id;f.state.present=false;
  const i=interaction(next);await f.dispatch(i);assert.equal(i.messages.at(-1).components.length,0);assert.equal(JSON.stringify(i.messages).includes('UI preview'),false);assert.equal(f.state.decisions,0);
});
test('detach disposes decisions and UI, closes once, and ignores late events',async t=>{
  const f=await fixture(t);await f.start();await f.runtime.detach();assert.equal(f.runtime.formalReviewReady,false);assert.equal(f.runtime.manualReviewDecisionsReady,false);
  assert.equal(f.state.disposes,1);assert.equal(f.state.ends,1);const i=interaction();f.client.emit('interactionCreate',i);await tick();assert.equal(i.messages.length,0);
});
