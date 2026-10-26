import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client, Message, MessageComponentInteraction, Events, version } from 'discord.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
import { AGE_DECLARATION_VERSION } from './certification-age-declaration.js';
import { createTrustedFormalReviewRoute } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/trusted-route.mjs';
import { FORMAL_REVIEW_COURSE as COURSE } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-course.mjs';
import { isFormalRead } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/formal-read-policy.mjs';
const OWNER='111111111111111111',ACTOR='222222222222222222',G='333333333333333333',ROLE='444444444444444444',C='555555555555555555';
const APP='666666666666666666',SOURCE='777777777777777777',PRIVATE='888888888888888888',T='2026-01-01T00:00:00.000Z';
const user=id=>({id,username:'synthetic',discriminator:'0',avatar:null,global_name:null});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(check){for(let n=0;n<100&&!check();n++)await tick();assert.ok(check(),'Expected scripted stack checkpoint');}
function fixture(t,{formal=true}={}) {
  assert.equal(version,'14.27.0');
  const client=new Client({intents:[]}),agreement='Disposable whole-stack agreement.',hash=createHash('sha256').update(agreement).digest('hex');
  const state={role:true,policyReads:[],memberReads:[],edits:[],callbacks:[],ended:0,dbError:false,beforeQuery:null,closing:null};
  state.row={discord_user_id:ACTOR,status:'approved',student_id:'SYNTHETIC-STUDENT',approved_by:OWNER,approved_at:T,
    signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'v1',agreement_content_sha256:hash,
    acknowledged_at:T,learner_confirmed_read_at:T,comprehension_passed_at:T,comprehension_check_version:'check1',age_eligible:true,age_declared_at:T,age_declaration_version:AGE_DECLARATION_VERSION,
    course_status:'active',authorized_course_key:COURSE.key,application_closed_at:null,application_closed_by:null,application_closed_as:null};
  const bot={},everyone={};
  const guild={id:G,available:true,roles:{everyone},members:{resolve:()=>null,
    async fetch(request){if(typeof request==='string'){assert.equal(request,OWNER);return {id:OWNER};}
      assert.deepEqual(request,{user:ACTOR,force:true,cache:false});state.memberReads.push({...request});
      return {id:ACTOR,guild:{id:G},roles:{cache:{has:id=>id===ROLE&&state.role}}};},async fetchMe(){return bot;}}};
  client.guilds.cache.set(G,guild);
  Object.defineProperty(client.guilds,'fetch',{configurable:true,value:async id=>{assert.equal(id,G);return guild;}});
  Object.defineProperty(client.channels,'fetch',{configurable:true,value:async id=>{assert.equal(id,C);return {guildId:G,isTextBased:()=>true,
    send(){assert.fail('No publication');},permissionsFor:member=>({has:()=>member===bot})};}});
  for(const verb of ['get','put','patch','delete']) Object.defineProperty(client.rest,verb,{configurable:true,value:async()=>{throw new Error('Unexpected REST call');}});
  Object.defineProperty(client.rest,'post',{configurable:true,value:async(path,options)=>{
    assert.match(path,/^\/interactions\/[0-9]{17,20}\/synthetic-token\/callback$/);assert.equal(options.auth,false);
    assert.ok([4,5,6].includes(options.body.type));if([4,5].includes(options.body.type))assert.equal(options.body.data.flags & 64,64);
    state.callbacks.push(options.body);return {};
  }});
  const pool={async query(sql,params){assert.match(sql.trim(),/^SELECT\b/);
    if(sql.includes("to_regclass('certification_agreements')"))return {rows:[{agreements:'agreements',enrollments:'enrollments',labs:'labs',audit:'audit'}]};
    if(sql.includes('FROM pg_attribute'))return {rows:requiredEnrollmentColumns.map(attname=>({attname}))};
    if(sql.includes('FROM pg_constraint'))return {rows:[{conname:'certification_account_acknowledgment_required',convalidated:true}]};
    if(sql.includes('FROM pg_trigger'))return {rows:(params[0]==='certification_enrollments'?['certification_student_id_immutable']:['certification_agreement_immutable','certification_agreement_no_truncate']).map(tgname=>({tgname,tgenabled:'O'}))};
    if(sql.startsWith('SELECT content'))return {rows:[{content:agreement,content_sha256:hash}]};
    assert.fail('Unexpected certification-pool query');
  },async end(){state.ended++;}};
  const readPool={async query(sql,params){assert.ok(isFormalRead(sql,params));assert.deepEqual(params,[ACTOR,COURSE.key]);state.policyReads.push([...params]);
    if(state.beforeQuery)await state.beforeQuery();if(state.dbError)throw new Error('PRIVATE SCRIPTED DB DETAIL');return {rows:[structuredClone(state.row)]};}};
  const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',ACADEMY_OWNER_ID:OWNER,ACADEMY_ADMIN_CHANNEL_ID:C,
    CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'v1',agreementSha256:hash,comprehensionCheck:{version:'check1',questions:[{prompt:'Type A.'}],correctAnswers:['A']}})};
  const bundle={schemaVersion:1,mode:'draft-review-only',courseId:COURSE.key,runtimeIntegration:false,publishable:false,
    pages:[{id:'first',audience:'learner',kind:'reading',title:'First reading',text:'SYNTHETIC STACK PAGE ONE'},
      {id:'second',audience:'learner',kind:'reading',title:'Second reading',text:'SYNTHETIC STACK PAGE TWO'}]};
  const runtime=attachCertificationRuntime(client,undefined,G,env,{createPool:()=>pool,createRouter:()=>async()=>true,
    ...(formal?{formalReview:{enabled:true,reviewOnly:true,mode:'review',createRoute:({client,guildId,config,isReady})=>createTrustedFormalReviewRoute({
      enabled:true,reviewOnly:true,mode:'review',client,guildId,config,isReady,entryChannelId:C,verifiedRoleId:ROLE,readPool,bundle})}}:{})});
  t.after(async()=>{try{await runtime.detach();}finally{await client.destroy();}});
  let serial=0;
  const raw=(id,privateFlag,actor=ACTOR)=>({id,channel_id:C,guild_id:G,type:0,author:{...user(APP),bot:true},content:'',embeds:[],components:[],attachments:[],reactions:[],mentions:[],mention_roles:[],mention_everyone:false,
    flags:privateFlag?64:0,pinned:false,tts:false,interaction_metadata:{id:'999999999999999999',type:2,user:user(actor),authorizing_integration_owners:{0:G}}});
  function button(customId,{actor=ACTOR,messageId=PRIVATE,privateFlag=true}={}){
    const i=new MessageComponentInteraction(client,{id:String(900000000000000000n+BigInt(serial++)),application_id:APP,token:'synthetic-token',type:3,version:1,
      guild_id:G,channel:{id:C,type:0},user:user(actor),locale:'en-US',guild_locale:'en-US',entitlements:[],authorizing_integration_owners:{0:G},app_permissions:'0',context:0,
      attachment_size_limit:1048576,data:{custom_id:customId,component_type:2},message:raw(messageId,privateFlag,actor)});
    Object.defineProperty(i.webhook,'editMessage',{configurable:true,value:async(target,payload)=>{assert.equal(target,'@original');state.edits.push(payload);return new Message(client,raw(PRIVATE,true));}});
    return i;
  }
  return {client,runtime,state,button,emit:i=>client.emit(Events.InteractionCreate,i),
    open:()=>button('fws:open',{messageId:SOURCE,privateFlag:false}),next:()=>state.edits.at(-1).components[0].components.find(b=>b.label==='Next').custom_id,
    async start(){client.emit(Events.ClientReady,client);await until(()=>runtime.ready);}};
}
test('normal startup still ignores formal SDK interactions without injection',async t=>{
  const f=fixture(t,{formal:false});await f.start();f.emit(f.open());await tick();assert.deepEqual(f.state.callbacks,[]);assert.deepEqual(f.state.policyReads,[]);assert.equal(f.runtime.formalReviewReady,false);
});
test('real SDK startup-pending action gets private unavailability without policy reads',async t=>{
  const f=fixture(t);f.emit(f.open());await until(()=>f.state.callbacks.length===1);assert.equal(f.state.callbacks[0].type,4);assert.deepEqual(f.state.policyReads,[]);assert.deepEqual(f.state.edits,[]);
});
test('runtime listener real policy and SDK methods compose private entry and Next',async t=>{
  const f=fixture(t);await f.start();const entry=f.open();f.emit(entry);await until(()=>f.state.edits.length===1);
  assert.match(f.state.edits[0].content,/SYNTHETIC STACK PAGE ONE/);assert.equal(entry.ephemeral,true);assert.equal(f.state.callbacks[0].type,5);
  const next=f.button(f.next());f.emit(next);await until(()=>f.state.edits.length===2);assert.match(f.state.edits[1].content,/SYNTHETIC STACK PAGE TWO/);
  assert.equal(next.message.id,PRIVATE);assert.equal(next.deferred,true);assert.equal(next.replied,true);assert.equal(f.state.callbacks[1].type,6);
  assert.ok(f.state.policyReads.length>0);assert.ok(f.state.memberReads.length>0);assert.equal(JSON.stringify(f.state.edits).includes('SYNTHETIC-STUDENT'),false);
});
test('real policy revocation clears original private view through root listener',async t=>{
  const f=fixture(t);await f.start();f.emit(f.open());await until(()=>f.state.edits.length===1);const control=f.next();f.state.row.status='revoked';
  f.emit(f.button(control));await until(()=>f.state.edits.length===2);assert.deepEqual(f.state.edits[1].components,[]);assert.equal(f.state.edits[1].content.includes('SYNTHETIC STACK PAGE TWO'),false);
});
test('role removal prevents another course-policy query in the real stack',async t=>{
  const f=fixture(t);await f.start();f.emit(f.open());await until(()=>f.state.edits.length===1);const control=f.next(),count=f.state.policyReads.length;f.state.role=false;
  f.emit(f.button(control));await until(()=>f.state.edits.length===2);assert.equal(f.state.policyReads.length,count);assert.deepEqual(f.state.edits[1].components,[]);
});
test('wrong actor gets private denial without editing owner workspace or querying policy',async t=>{
  const f=fixture(t);await f.start();f.emit(f.open());await until(()=>f.state.edits.length===1);const control=f.next(),count=f.state.policyReads.length;
  f.emit(f.button(control,{actor:OWNER}));await until(()=>f.state.callbacks.length===2);assert.equal(f.state.callbacks[1].type,4);assert.equal(f.state.edits.length,1);assert.equal(f.state.policyReads.length,count);
});
test('database failure remains neutral through actual policy and SDK transport',async t=>{
  const f=fixture(t);await f.start();f.state.dbError=true;f.emit(f.open());await until(()=>f.state.edits.length===1);
  assert.equal(JSON.stringify(f.state.edits).includes('PRIVATE SCRIPTED DB DETAIL'),false);assert.equal(JSON.stringify(f.state.edits).includes('SYNTHETIC STACK PAGE ONE'),false);assert.deepEqual(f.state.edits[0].components,[]);
});
test('shutdown during policy read suppresses late page and drains actual runtime',async t=>{
  const f=fixture(t);await f.start();f.state.beforeQuery=()=>{f.state.closing=f.runtime.detach();};f.emit(f.open());await until(()=>f.state.closing!==null);
  await f.state.closing;assert.equal(f.runtime.formalReviewReady,false);assert.equal(f.state.ended,1);assert.equal(JSON.stringify(f.state.edits).includes('SYNTHETIC STACK PAGE ONE'),false);
  const before=f.state.policyReads.length;f.emit(f.open());await tick();assert.equal(f.state.policyReads.length,before);
});
