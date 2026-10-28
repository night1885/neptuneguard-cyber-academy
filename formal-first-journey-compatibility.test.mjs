import test from 'node:test';
import assert from 'node:assert/strict';
import {Client,Message,MessageComponentInteraction,ActionRowBuilder,ButtonBuilder,version} from 'discord.js';
import {AGE_DECLARATION_VERSION} from './certification-age-declaration.js';
import {createCertificationCourseLifecycle} from './certification-course-lifecycle.js';
import {createFormalCourseAuthorizer} from './formal-course-authorizer.mjs';
import {createFormalFirstJourneyNavigation} from './formal-first-journey-navigation.mjs';
import {createFormalDraftLessonLoader,FIRST_JOURNEY_PAGES} from './formal-first-journey-content.mjs';
const A='11111111111111111',G='22222222222222222',C='33333333333333333',APP='55555555555555555',O='99999999999999999',SOURCE='44444444444444444',PRIVATE='88888888888888888';
const user=id=>({id,username:'synthetic',discriminator:'0',avatar:null,global_name:null});
function fixture(t,{allowedCourse=true}={}){
 assert.equal(version,'14.27.0','Review a changed installed SDK explicitly');
 const f={now:1000000,queries:0,loads:0,calls:[],edits:[]};
 const at='2026-10-28T00:00:00.000Z';
 f.row={discord_user_id:A,student_id:'NAV-TEST-ONLY',status:'approved',approved_by:O,approved_at:at,signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'navigation-test',agreement_content_sha256:'a'.repeat(64),acknowledged_at:at,learner_confirmed_read_at:at,comprehension_passed_at:at,comprehension_check_version:'navigation-check',age_eligible:true,age_declared_at:at,age_declaration_version:AGE_DECLARATION_VERSION,application_closed_at:null,application_closed_by:null,application_closed_as:null,course_status:'active',authorized_course_key:'ethical-hacking'};
 const pool={async connect(){throw new Error('No transactions or database connections in offline test');},async query(sql,args){
  f.queries++;assert.match(sql,/^SELECT e\.\*,c\.status/);assert.deepEqual(args,[A,'ethical-hacking']);
  return{rows:f.row.status==='approved'?[{...f.row}]:[]};
 }};
 const service=createCertificationCourseLifecycle(pool,{enabled:true,ownerId:O,activeAgreementVersion:'navigation-test',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'navigation-check'}},{courseKeys:allowedCourse?['ethical-hacking']:['other-test-only']});
 const client=new Client({intents:[]});t.after(()=>client.destroy());
 client.guilds.cache.set(G,{id:G,members:{resolve:()=>null,fetch:async actor=>({id:actor})}});
 for(const verb of ['get','put','patch','delete','request'])Object.defineProperty(client.rest,verb,{configurable:true,value:async()=>{throw new Error('Unexpected REST call in offline test');}});
 Object.defineProperty(client.rest,'post',{configurable:true,value:async(path,options)=>{
  assert.match(path,/^\/interactions\/[0-9]{17,20}\/synthetic-token\/callback$/);assert.equal(options.auth,false);assert.ok([4,5,6].includes(options.body.type));
  if([4,5].includes(options.body.type))assert.equal(options.body.data.flags&64,64);f.calls.push(options.body);return{};
 }});
 const rawMessage=(id,privateFlag,actor=A)=>({id,channel_id:C,guild_id:G,type:0,author:{...user(APP),bot:true},content:'',embeds:[],components:[],attachments:[],reactions:[],mentions:[],mention_roles:[],mention_everyone:false,flags:privateFlag?64:0,pinned:false,tts:false,interaction_metadata:{id:'77777777777777777',type:2,user:user(actor),authorizing_integration_owners:{0:G}}});
 let serial=0;
 f.button=(customId,{actor=A,messageId=PRIVATE,privateFlag=true}={})=>{
  const i=new MessageComponentInteraction(client,{id:String(66666666666666666n+BigInt(serial++)),application_id:APP,token:'synthetic-token',type:3,version:1,guild_id:G,channel:{id:C,type:0},user:user(actor),locale:'en-US',guild_locale:'en-US',entitlements:[],authorizing_integration_owners:{0:G},app_permissions:'0',context:0,attachment_size_limit:1048576,data:{custom_id:customId,component_type:2},message:rawMessage(messageId,privateFlag,actor)});
  Object.defineProperty(i.webhook,'editMessage',{configurable:true,value:async(target,payload)=>{
   assert.equal(target,'@original');assert.deepEqual(payload.allowedMentions,{parse:[]});
   for(const row of payload.components||[]){const built=ActionRowBuilder.from(row).toJSON();assert.equal(built.type,1);assert.equal(built.components.length,row.components.length);for(const b of row.components){const button=ButtonBuilder.from(b).toJSON();assert.equal(button.custom_id,b.custom_id);assert.equal(button.label,b.label);assert.equal(button.style,b.style);}}
   f.edits.push(payload);return new Message(client,rawMessage(PRIVATE,true));
  }});return i;
 };
 const ports={isReady:()=>true,now:()=>f.now,authorizeCourse:createFormalCourseAuthorizer(service),loadPage:async({cursor})=>{f.loads++;return{content:'OFFLINE SDK '+cursor};}};
 f.ports=ports;
 f.navigation=createFormalFirstJourneyNavigation({enabled:true,allowDraftPreview:true,guildId:G,entryChannelId:C,courseKey:'ethical-hacking',sessionTtlMs:1000,maxSessions:2,providerTimeoutMs:1000},ports);t.after(()=>f.navigation.dispose());
 f.open=()=>f.button('fnv:open',{messageId:SOURCE,privateFlag:false});
 f.control=label=>f.edits.at(-1).components.flatMap(row=>row.components).find(b=>b.label===label).custom_id;
 f.failCallbacks=()=>Object.defineProperty(client.rest,'post',{configurable:true,value:async()=>{throw new Error('Scripted callback loss');}});
 return f;
}
test('installed SDK opens privately and updates same message through actual service adapter',async t=>{
 const f=fixture(t),entry=f.open();assert.equal(await f.navigation.handle(entry),true);assert.equal(entry.ephemeral,true);assert.equal(f.calls[0].type,5);assert.equal(f.edits.at(-1).content,'OFFLINE SDK overview');assert.ok(f.queries>=2);
 const next=f.button(f.control('Help'));assert.equal(next.message.id,PRIVATE);await f.navigation.handle(next);assert.equal(f.calls.at(-1).type,6);assert.equal(f.edits.at(-1).content,'OFFLINE SDK help');assert.equal(JSON.stringify(f.edits).includes('NAV-TEST-ONLY'),false);
});
test('installed SDK foreign actor gets private denial without editing owner view',async t=>{const f=fixture(t);await f.navigation.handle(f.open());const before=f.edits.length;await f.navigation.handle(f.button(f.control('Help'),{actor:O}));assert.equal(f.edits.length,before);assert.equal(f.calls.at(-1).type,4);assert.equal(f.calls.at(-1).data.flags&64,64);});
test('actual service revocation denies before a new protected view',async t=>{const f=fixture(t);await f.navigation.handle(f.open());const control=f.control('Help'),before=f.edits.length,loads=f.loads;f.row.status='revoked';await f.navigation.handle(f.button(control));assert.equal(f.edits.length,before);assert.equal(f.loads,loads);assert.equal(f.calls.at(-1).type,4);});
test('actual service revocation during load suppresses new content',async t=>{const f=fixture(t);let loaded=false;f.ports.loadPage=async()=>{loaded=true;f.row.status='revoked';return{content:'DO NOT DELIVER'};};await f.navigation.handle(f.open());assert.equal(loaded,true);assert.equal(JSON.stringify(f.edits).includes('DO NOT DELIVER'),false);assert.deepEqual(f.edits.at(-1).components,[]);});
test('actual service rejects a course outside its supplied allowlist without querying',async t=>{const f=fixture(t,{allowedCourse:false});await f.navigation.handle(f.open());assert.equal(f.queries,0);assert.equal(f.loads,0);assert.equal(f.edits.length,0);assert.equal(f.calls.at(-1).type,4);});
test('actual account acknowledgment failure denies draft rendering',async t=>{const f=fixture(t);f.row.age_eligible=false;await f.navigation.handle(f.open());assert.ok(f.queries>0);assert.equal(f.loads,0);assert.equal(f.edits.length,0);});
test('actual agreement mismatch denies draft rendering',async t=>{const f=fixture(t);f.row.agreement_content_sha256='b'.repeat(64);await f.navigation.handle(f.open());assert.equal(f.loads,0);assert.equal(f.edits.length,0);});
test('installed SDK expired controls require fresh private entry',async t=>{const f=fixture(t);await f.navigation.handle(f.open());const old=f.control('Help'),before=f.edits.length;f.now+=1000;await f.navigation.handle(f.button(old));assert.equal(f.edits.length,before);assert.equal(f.calls.at(-1).type,4);await f.navigation.handle(f.open());assert.equal(f.edits.length,before+1);assert.notEqual(f.control('Help'),old);});
test('installed SDK callback failure never publishes draft content',async t=>{const f=fixture(t),entry=f.open();f.failCallbacks();assert.equal(await f.navigation.handle(entry),true);assert.equal(f.edits.length,0);assert.equal(entry.deferred,false);});

test('actual allowlisted lesson files traverse SDK-shaped private controls with real service code',async t=>{
 const f=fixture(t);f.ports.loadPage=createFormalDraftLessonLoader({allowDraftContent:true});
 await f.navigation.handle(f.open());assert.match(f.edits.at(-1).content,/first-practical draft/);
 let control=f.control('Start first practical');
 for(let n=0;n<FIRST_JOURNEY_PAGES.length;n++){
  const interaction=f.button(control);await f.navigation.handle(interaction);
  const page=f.edits.at(-1);assert.equal(f.calls.at(-1).type,6);assert.equal(page.content.startsWith(`${FIRST_JOURNEY_PAGES[n].title} — draft page 1/`),true);assert.match(page.content,/Draft review only\./);assert.ok(page.content.length<=1900);
  if(n+1<FIRST_JOURNEY_PAGES.length)control=f.control('Next lesson');
 }
 assert.equal(JSON.stringify(f.edits).includes('NAV-TEST-ONLY'),false);
});
