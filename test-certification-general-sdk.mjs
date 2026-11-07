import test from 'node:test';
import assert from 'node:assert/strict';
import {ActionRowBuilder,EmbedBuilder} from 'discord.js';
import {loadCertificationConfig} from './certification-config.js';
import {createManualReviewSnapshot} from './certification-manual-review-data.mjs';
import {handleConsoleStudent} from './certification-console-student.js';
import {createOwnerRegistrationHandler} from './certification-owner-registration-ui.js';
import {createInitialConsoleHandler} from './certification-initial-console.js';
const O='100000000000000001',S='100000000000000002',G='100000000000000003',C='100000000000000004',V='100000000000000006',X='100000000000000007';
const GUIDE='SensitiveGuideFixture';
const data=v=>typeof v?.toJSON==='function'?v.toJSON():v;
const entries=p=>(p.components||[]).flatMap(r=>data(r).components).filter(b=>b.custom_id?.startsWith('cert:review:open:'));
function fixture({recordPatch={},configPatch={}}={}){
 const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_ENABLED:'true',CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'true',CERTIFICATION_COURSES_ENABLED:'true',CERTIFICATION_REGISTRATION_PILOT:'false',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSE_REQUESTS_ENABLED:'true',CERTIFICATION_REGISTRATION_SCOPE:'guild-members',ACADEMY_OWNER_ID:O,ACADEMY_ADMIN_CHANNEL_ID:C,GUILD_ID:G,VERIFIED_ROLE_ID:V,CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'general-v1',agreementSha256:'a'.repeat(64),comprehensionCheck:{version:'check-v1',questions:[{prompt:'Synthetic question?'}],correctAnswers:[GUIDE]}})};
 const config={...loadCertificationConfig(env),...configPatch},at=new Date();
 const record={discord_user_id:S,student_id:null,status:'pending',signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'general-v1',agreement_content_sha256:'a'.repeat(64),acknowledged_at:at,learner_confirmed_read_at:at,comprehension_check_version:'check-v1',comprehension_submitted_at:at,comprehension_passed_at:null,comprehension_review_snapshot:createManualReviewSnapshot(config,['Synthetic response']),age_eligible:true,age_declared_at:at,age_declaration_version:'adult-18-v1',approved_by:null,approved_at:null,created_at:at,updated_at:at,...recordPatch};
 const queries=[],pool={connect(){assert.fail('UI inspection must not open a write connection');},async query(sql){queries.push(sql);assert.ok(sql.startsWith('SELECT'));if(sql.includes('COUNT(*)'))return{rows:[{total:0}]};if(sql.startsWith('SELECT comprehension_submitted_at'))return{rows:[{comprehension_submitted_at:record.comprehension_submitted_at,comprehension_review_snapshot:record.comprehension_review_snapshot}]};return{rows:[{...record}]};}};
 return{env,config,record,pool,queries};
}
function request({actor=O,server=G,channel=C,id='cert:students:detail:'+S,modal=false}={}){
 const messages=[],i={customId:id,user:{id:actor,bot:false},guildId:server,channelId:channel,deferred:false,replied:false,isButton:()=>!modal,isModalSubmit:()=>modal,isStringSelectMenu:()=>false,message:{flags:{has:n=>n===64},interactionMetadata:{user:{id:actor}}},async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async reply(p){messages.push(p);this.replied=true;},async followUp(p){messages.push(p);},async editReply(p){messages.push(p);}};
 return{i,messages};
}
test('general owner review entry works with no test-target list',async()=>{
 const f=fixture(),r=request(),before=structuredClone(f.record);assert.equal(f.env.CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS,undefined);assert.deepEqual(f.config.manualReviewDecisionStudentIds,[]);assert.ok(Object.isFrozen(f.config.scopedRegistration));
 await handleConsoleStudent(r.i,f.pool,f.config,G);const p=r.messages[0];assert.equal(entries(p).length,1);assert.equal(entries(p)[0].custom_id,'cert:review:open:'+S);assert.ok(p.components.length<=5);for(const row of p.components)assert.doesNotThrow(()=>new ActionRowBuilder(data(row)).toJSON());for(const e of p.embeds)assert.doesNotThrow(()=>new EmbedBuilder(data(e)).toJSON());assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(f.record,before);
});
for(const patch of [{status:'approved'},{status:'denied'},{status:'suspended'},{status:'revoked'},{age_eligible:false},{approved_by:O},{agreement_content_sha256:'b'.repeat(64)},{student_id:''}])test('general mode preserves application proof '+JSON.stringify(patch),async()=>{const f=fixture({recordPatch:patch}),r=request();await handleConsoleStudent(r.i,f.pool,f.config,G);assert.equal(entries(r.messages[0]).length,0);});
for(const patch of [{guildId:X},{ownerId:X},{adminChannelId:X},{verifiedRoleId:''}])test('mismatched general UI scope is rejected '+JSON.stringify(patch),async()=>{const f=fixture();f.config.scopedRegistration=Object.freeze({...f.config.scopedRegistration,...patch});const r=request();await handleConsoleStudent(r.i,f.pool,f.config,G);assert.equal(entries(r.messages[0]).length,0);});
test('learner and foreign guild cannot read owner review responses',async()=>{for(const options of [{actor:S},{server:X}]){const f=fixture(),r=request(options);await handleConsoleStudent(r.i,f.pool,f.config,G);assert.equal(f.queries.length,0);assert.equal(r.messages[0].flags,64);assert.ok(!JSON.stringify(r.messages).includes(GUIDE));}});
function invitationFixture(){
 const f=fixture(),counts={fetches:0,writes:0};let verified=true;
 const guild={id:G,members:{async fetch(options){counts.fetches++;assert.deepEqual(options,{user:S,force:true});return{id:S,guild:{id:G},user:{id:S,bot:false},pending:false,roles:{cache:new Set(verified?[V]:[])}};}}};
 const handler=createOwnerRegistrationHandler({},f.config,G,{createRegistrationService:()=>({async register(actor,target){counts.writes++;assert.equal(actor,O);assert.equal(target,S);return{created:true,record:{status:'awaiting_acknowledgment'}};}})});
 const form=()=>{const r=request({id:'cert:register:submit',modal:true});r.i.guild=guild;r.i.fields={getTextInputValue:()=>S};return r;};
 const click=id=>{const r=request({id});r.i.guild=guild;return r;};
 return{handler,counts,form,click,removeVerified(){verified=false;}};
}
const confirmation=r=>data(r.messages[0].components[0]).components.find(b=>b.custom_id.startsWith('cert:register:confirm:')).custom_id;
test('owner invitation fetches membership at prepare and confirmation',async()=>{const f=invitationFixture(),r=f.form();await f.handler(r.i);assert.equal(f.counts.fetches,1);assert.equal(f.counts.writes,0);await f.handler(f.click(confirmation(r)).i);assert.equal(f.counts.fetches,2);assert.equal(f.counts.writes,1);});
test('verification lost before confirmation blocks registration write',async()=>{const f=invitationFixture(),r=f.form();await f.handler(r.i);f.removeVerified();await assert.rejects(()=>f.handler(f.click(confirmation(r)).i));assert.equal(f.counts.fetches,2);assert.equal(f.counts.writes,0);});
test('unverified target gets no invitation confirmation',async()=>{const f=invitationFixture();f.removeVerified();const r=f.form();await assert.rejects(()=>f.handler(r.i));assert.equal(r.messages.length,0);assert.equal(f.counts.writes,0);});
for(const status of [null,'pending'])test('learner home stays private and does not enable self-enrollment: '+status,async()=>{
 const f=fixture(),queries=[],pool={connect(){assert.fail('No writes from learner home');},async query(sql){queries.push(sql);assert.ok(sql.startsWith('SELECT'));return{rows:status?[{...f.record,status}]:[]};}},r=request({actor:S,id:'cert:initial:home'});
 await createInitialConsoleHandler(pool,f.config,G)(r.i);assert.equal(r.i.deferred,true);const p=r.messages[0];assert.ok(p.embeds?.length);assert.ok(!JSON.stringify(p).includes(GUIDE));assert.deepEqual(p.allowedMentions,{parse:[]});
 if(status===null)assert.match(p.embeds[0].description,/Ask the academy owner/);else assert.match(p.embeds[0].description,/awaiting an admin approval or denial/);
 const controls=p.components.flatMap(row=>data(row).components);assert.ok(controls.filter(b=>/cert:(submit|invite):/.test(b.custom_id||'')).every(b=>b.disabled===true));assert.ok(queries.length>0);
});
