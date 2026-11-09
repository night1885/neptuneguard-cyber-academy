import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombinedRegistrationRouter } from './certification-combined-registration-router.mjs';
import { createGeneralRegistrationPolicy } from './certification-general-registration.mjs';
import { createCourseRuntimeRouter } from './certification-course-runtime.js';
import { createProtectedCourseNavigation } from './certification-course-navigation.js';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';
import { FORMAL_READING_PROGRAMME } from './formal-programme-reading.mjs';
const O='100000000000000001',A='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',R='100000000000000006',key=FORMAL_READING_PROGRAMME.key;
const flat=xs=>xs.flatMap(x=>[x,...(x.components?flat(x.components):[])]);
const control=(i,prefix)=>flat(i.outputs.at(-1).components).find(x=>x.type===2&&x.custom_id?.startsWith(prefix)).custom_id;
async function fixture(){
 const state={active:true,role:true,clock:1000,renders:0,queries:[]};
 const pool={async query(sql,args){state.queries.push(sql);assert.ok(sql.startsWith('SELECT'));assert.match(sql,/JOIN certification_course_enrollments/);assert.deepEqual(args,[A,key]);if(!state.active)return {rows:[]};const d=new Date();return {rows:[{discord_user_id:A,status:'approved',student_id:'NG-fixture',approved_by:O,approved_at:d,signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'fixture',agreement_content_sha256:'a'.repeat(64),acknowledged_at:d,learner_confirmed_read_at:d,comprehension_passed_at:d,comprehension_check_version:'fixture',age_eligible:true,age_declared_at:d,age_declaration_version:'adult-18-v1',application_closed_at:null,application_closed_by:null,application_closed_as:null,course_status:'active',authorized_course_key:key}]};}};
 const config={enabled:true,ownerId:O},settings=Object.freeze({enabled:true,combined:true,generalMembers:true,ownerId:O,guildId:G,adminChannelId:C,verifiedRoleId:R,studentIds:Object.freeze([])});
 const base=createCourseRuntimeRouter(pool,config,G,{verifiedRoleId:R,now:()=>state.clock,createBaseRouter:()=>async()=>false,async createNavigation(){return createProtectedCourseNavigation(pool,config,G,{verifiedRoleId:R,now:()=>state.clock,async renderPage(request){state.renders++;return renderStudentCoursePage(request);}});}});
 const noMutation=async()=>assert.fail('No enrollment, registration or decision write expected');
 const decisions=Object.assign(noMutation,{ready:true,initialize:async()=>({ready:true}),dispose:async()=>{}});
 const route=createCombinedRegistrationRouter({settings,policy:createGeneralRegistrationPolicy(settings,{ownerDecisionsEnabled:true}),base,registration:noMutation,learner:noMutation,ownerDecisions:decisions});
 function frame(customId,{modal=false,card=false}={}){const member={id:A,guild:{id:G},user:{id:A,bot:false},pending:false,roles:{cache:new Set(state.role?[R]:[])}};return {customId,user:{id:A,bot:false},guildId:G,guild:{id:G,members:{async fetch(id){assert.equal(id,A);return member;}}},channelId:C,member,client:{user:{id:B}},message:{author:{id:B},interactionMetadata:{user:{id:A}},flags:{has:n=>n===64||(card&&n===32768)}},outputs:[],deferred:false,replied:false,isButton:()=>!modal,isModalSubmit:()=>modal,isStringSelectMenu:()=>false,fields:{getTextInputValue:()=> 'NG-fixture'},async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},async editReply(p){this.outputs.push(p);},async reply(p){assert.equal(p.flags&64,64);this.replied=true;this.outputs.push(p);},async followUp(p){this.outputs.push(p);},async showModal(p){this.modal=typeof p.toJSON==='function'?p.toJSON():p;}};}
 await route.initialize();return {route,state,frame};
}
async function enter(f){const open=f.frame(`cert:course:open:${key}`);await f.route(open);assert.match(open.modal.custom_id,/^cert:course:submit:/);const submit=f.frame(open.modal.custom_id,{modal:true});await f.route(submit);return submit;}
test('programme journey composes catalogue, modal, assignment checks, reading and private cards',async()=>{
 const f=await fixture();try{const catalog=f.frame('cert:course:catalog:0');await f.route(catalog);assert.equal(control(catalog,`cert:course:open:${key}`),`cert:course:open:${key}`);assert.equal(f.state.renders,0);
 const entered=await enter(f);assert.equal(entered.outputs.at(-1).flags,32768);const module=f.frame(control(entered,'cert:course:page:'),{card:true});await f.route(module);const lesson=f.frame(control(module,'cert:course:page:'),{card:true});await f.route(lesson);const p=lesson.outputs.at(-1);assert.equal(p.flags,32768);assert.match(JSON.stringify(p),/Reading only/);assert.deepEqual(p.allowedMentions,{parse:[]});assert.equal(f.state.renders,3);assert.ok(f.state.queries.length>=5);
 }finally{await f.route.dispose();}
});
for(const denial of ['assignment','role','expiry','foreign-origin','disposal'])test('programme session denied after '+denial,async()=>{
 const f=await fixture();try{const entered=await enter(f),id=control(entered,'cert:course:page:'),before=f.state.renders;if(denial==='assignment')f.state.active=false;if(denial==='role')f.state.role=false;if(denial==='expiry')f.state.clock+=300000;if(denial==='disposal')await f.route.dispose();const i=f.frame(id,{card:true});if(denial==='foreign-origin')i.message.interactionMetadata.user.id=O;await f.route(i);assert.equal(f.state.renders,before);assert.match(JSON.stringify(i.outputs.at(-1)),/unavailable|No operation was admitted/);
 }finally{await f.route.dispose();}
});
test('unassigned learner never receives programme text',async()=>{const f=await fixture();try{f.state.active=false;const submitted=await enter(f);assert.equal(f.state.renders,0);assert.match(JSON.stringify(submitted.outputs.at(-1)),/could not be verified|unavailable/);}finally{await f.route.dispose();}});
