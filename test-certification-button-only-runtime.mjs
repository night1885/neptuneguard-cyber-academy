import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseRuntimeRouter } from './certification-course-runtime.js';
import { createProtectedCourseNavigation } from './certification-course-navigation.js';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';

const U='100000000000000001', O='100000000000000002', G='100000000000000003', R='100000000000000004', B='100000000000000005';
const flatten=items=>items.flatMap(item=>[item,...(item.components?flatten(item.components):[])]);
function fixture(){
  const f={active:true,role:true,queries:[],options:null};
  const pool={async query(sql,args){
    assert.match(sql,/^SELECT /);assert.match(sql,/JOIN certification_course_enrollments/);f.queries.push({sql,args});
    if(!f.active||args[0]!==U)return {rows:[]};
    const stamp=new Date();
    return {rows:[{discord_user_id:U,status:'approved',student_id:'private-fixture-id',approved_by:O,approved_at:stamp,signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'fixture',agreement_content_sha256:'a'.repeat(64),acknowledged_at:stamp,learner_confirmed_read_at:stamp,comprehension_passed_at:stamp,comprehension_check_version:'fixture',age_eligible:true,age_declared_at:stamp,age_declaration_version:'adult-18-v1',application_closed_at:null,application_closed_by:null,application_closed_as:null,course_status:'active',authorized_course_key:args[1]}]};
  }};
  f.route=createCourseRuntimeRouter(pool,{enabled:true,ownerId:O},G,{verifiedRoleId:R,createBaseRouter:()=>async()=>false,async createNavigation(p,c,g,options){
    f.options=options;
    return createProtectedCourseNavigation(p,c,g,{...options,renderPage:renderStudentCoursePage});
  }});
  f.interaction=(customId,{card=false,actor=U}={})=>({
    customId,user:{id:actor,bot:false},guildId:G,guild:{id:G,members:{async fetch(id){return {id,roles:{cache:new Set(f.role?[R]:[])}};}}},client:{user:{id:B}},
    message:{author:{id:B},interactionMetadata:{user:{id:U}},flags:{has:flag=>flag===64||(card&&flag===32768)}},
    deferred:false,replied:false,calls:[],outputs:[],isButton:()=>true,isModalSubmit:()=>false,
    get fields(){assert.fail('No student-ID fields in button-only runtime');},
    async showModal(){assert.fail('No modal in button-only runtime');},
    async deferReply(p){assert.equal(p.flags,64);this.calls.push('deferReply');this.deferred=true;},
    async deferUpdate(){this.calls.push('deferUpdate');this.deferred=true;},
    async reply(p){assert.equal(p.flags&64,64);this.calls.push('reply');this.replied=true;this.outputs.push(p);},
    async editReply(p){this.calls.push('editReply');this.outputs.push(p);}
  });
  return f;
}
const output=i=>i.outputs.at(-1);
function checkCard(i){const p=output(i);assert.equal(p.flags,32768);assert.ok(!('content'in p)&&!('embeds'in p));assert.deepEqual(p.allowedMentions,{parse:[]});assert.equal(JSON.stringify(p).includes('private-fixture-id'),false);return flatten(p.components);}
async function open(f){
  const catalog=f.interaction('cert:course:catalog:0');await f.route(catalog);
  const controls=checkCard(catalog);assert.match(JSON.stringify(output(catalog)),/no student-ID form is required here/);assert.doesNotMatch(JSON.stringify(output(catalog)),/requires your permanent ID/);
  assert.equal(f.queries.length,0);
  const entry=controls.find(c=>c.type===2&&c.custom_id.startsWith('cert:course:open:'));assert.ok(entry);
  const i=f.interaction(entry.custom_id,{card:true});await f.route(i);return i;
}
test('runtime selects button-only navigation and real lesson controls update the private card',async()=>{
  const f=fixture();await f.route.initialize();try{
    assert.equal(f.options.buttonOnlyEntry,true);assert.equal(f.options.verifiedRoleId,R);
    const entry=await open(f);assert.deepEqual(entry.calls,['deferReply','editReply']);
    const controls=checkCard(entry),next=controls.find(c=>c.type===2&&c.custom_id.startsWith('cert:course:page:'));assert.ok(next);
    assert.equal(f.queries.length,3);
    const page=f.interaction(next.custom_id,{card:true});await f.route(page);assert.deepEqual(page.calls,['deferUpdate','editReply']);checkCard(page);
    assert.equal(f.queries.length,5);assert.ok(f.queries.every(q=>q.args[0]===U));
  }finally{f.route.dispose();}
});
for(const loss of ['role','assignment','copied'])test('runtime card withholds course content after '+loss,async()=>{
  const f=fixture();await f.route.initialize();try{
    const entry=await open(f),next=checkCard(entry).find(c=>c.type===2&&c.custom_id.startsWith('cert:course:page:'));assert.ok(next);
    if(loss==='role')f.role=false;if(loss==='assignment')f.active=false;
    const page=f.interaction(next.custom_id,{card:true,actor:loss==='copied'?O:U});await f.route(page);
    assert.match(JSON.stringify(output(page)),/unavailable/);assert.equal(flatten(output(page).components).some(c=>c.type===2),false);
  }finally{f.route.dispose();}
});
