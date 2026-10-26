import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrustedFormalReviewRoute } from './trusted-route.mjs';
import { FORMAL_REVIEW_COURSE as COURSE } from './formal-course.mjs';
import { isFormalRead } from './formal-read-policy.mjs';
const A='100000000000000001',B='100000000000000002',G='100000000000000003',R='100000000000000004',C='100000000000000005',M='100000000000000006';
const K=COURSE.key,T='2026-01-01T00:00:00.000Z';
function approved(){return {discord_user_id:A,status:'approved',student_id:'SYNTHETIC-STUDENT',approved_by:B,approved_at:T,
  signature_method:'discord_account',acknowledgment_name:null,signature_reference:null,agreement_version:'SYNTHETIC-v1',agreement_content_sha256:'a'.repeat(64),
  acknowledged_at:T,learner_confirmed_read_at:T,comprehension_passed_at:T,comprehension_check_version:'SYNTHETIC-check-v1',age_eligible:true,age_declared_at:T,age_declaration_version:'adult-18-v1',
  course_status:'active',authorized_course_key:K,application_closed_at:null,application_closed_by:null,application_closed_as:null};}
function harness(t,patch={}) {
  const state={ready:true,role:true,rows:[approved()],queries:[],fetches:[],beforeQuery:null,dbError:false};
  const config={enabled:true,activeAgreementVersion:'SYNTHETIC-v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'SYNTHETIC-check-v1'}};
  const readPool={async query(sql,args){assert.ok(isFormalRead(sql,args));state.queries.push([...args]);if(state.beforeQuery)await state.beforeQuery();if(state.dbError)throw new Error('PRIVATE DB');return {rows:structuredClone(state.rows)};}};
  const client={guilds:{async fetch(id){state.fetches.push(['guild',id]);return {id:G,available:true,members:{async fetch(options){
    state.fetches.push(['member',options]);return {id:A,guild:{id:G},roles:{cache:{has:id=>id===R&&state.role}}};}}};}}};
  const bundle={schemaVersion:1,mode:'draft-review-only',courseId:K,runtimeIntegration:false,publishable:false,
    pages:[{id:'first',audience:'learner',kind:'reading',title:'First reading',text:'SYNTHETIC PAGE ONE'},
      {id:'second',audience:'learner',kind:'reading',title:'Second reading',text:'SYNTHETIC PAGE TWO'}]};
  const route=createTrustedFormalReviewRoute({enabled:true,reviewOnly:true,mode:'review',guildId:G,entryChannelId:C,verifiedRoleId:R,
    client,readPool,config,bundle,isReady:()=>state.ready,...patch});t.after(()=>route.dispose());
  function button(customId,extra={}) {
    return {customId,guildId:G,channelId:C,user:{id:A},isButton:()=>true,deferred:false,replied:false,ephemeral:false,
      message:{id:M,flags:{has:bit=>bit===64}},edits:[],replies:[],
      async deferReply(options){assert.equal(options.flags,64);this.deferred=true;this.ephemeral=true;},
      async deferUpdate(){this.deferred=true;},
      async editReply(payload){this.edits.push(payload);this.replied=true;return {id:M,flags:{has:bit=>bit===64}};},
      async reply(payload){this.replies.push(payload);this.replied=true;},...extra};
  }
  const next=i=>i.edits.at(-1).components[0].components.find(b=>b.label==='Next').custom_id;
  return {state,route,button,next};
}
test('default-off composed route constructs no readers or policy',async()=>{
  const route=createTrustedFormalReviewRoute();assert.equal(route.enabled,false);assert.equal(await route.handle({customId:'fws:open'}),false);assert.deepEqual(await route.dispose(),{drained:true});
});
test('real policy readers access and workspace compose into private entry and Next',async t=>{
  const h=harness(t),entry=h.button('fws:open');assert.equal(await h.route.handle(entry),true);assert.equal(entry.edits.length,1);
  assert.match(entry.edits[0].content,/SYNTHETIC PAGE ONE/);assert.ok(h.state.queries.length>0);assert.ok(h.state.queries.every(args=>args[0]===A&&args[1]===K));
  assert.ok(h.state.fetches.filter(v=>v[0]==='member').every(v=>v[1].user===A&&v[1].force===true&&v[1].cache===false));
  const next=h.button(h.next(entry));await h.route.handle(next);assert.match(next.edits[0].content,/SYNTHETIC PAGE TWO/);
  assert.equal(JSON.stringify([...entry.edits,...next.edits]).includes('SYNTHETIC-STUDENT'),false);assert.deepEqual(next.edits[0].allowedMentions,{parse:[]});
});
test('parent not ready makes no member or database reads',async t=>{
  const h=harness(t);h.state.ready=false;const i=h.button('fws:open');await h.route.handle(i);assert.equal(h.state.fetches.length,0);assert.equal(h.state.queries.length,0);assert.equal(i.edits.length,0);assert.equal(i.replies[0].flags,64);
});
test('revoked enrollment clears bound page through actual lifecycle policy',async t=>{
  const h=harness(t),entry=h.button('fws:open');await h.route.handle(entry);h.state.rows[0].status='revoked';
  const i=h.button(h.next(entry));await h.route.handle(i);assert.deepEqual(i.edits.at(-1).components,[]);assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC PAGE TWO'),false);
});
test('Verified role removal stops before another grant lookup',async t=>{
  const h=harness(t),entry=h.button('fws:open');await h.route.handle(entry);const before=h.state.queries.length;h.state.role=false;
  const i=h.button(h.next(entry));await h.route.handle(i);assert.equal(h.state.queries.length,before);assert.deepEqual(i.edits.at(-1).components,[]);
});
test('membership changes during real policy query deny protected entry',async t=>{
  const h=harness(t);h.state.beforeQuery=async()=>{h.state.role=false;};const i=h.button('fws:open');await h.route.handle(i);
  assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC PAGE ONE'),false);assert.deepEqual(i.edits.at(-1).components,[]);
});
test('readiness loss during policy read cannot publish a late page',async t=>{
  const h=harness(t);h.state.beforeQuery=async()=>{h.state.ready=false;};const i=h.button('fws:open');await h.route.handle(i);
  assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC PAGE ONE'),false);assert.deepEqual(i.edits.at(-1).components,[]);
});
test('foreign subject duplicate rows and stale agreement fail the actual facade',async t=>{
  for(const rows of [[{...approved(),discord_user_id:B}],[approved(),approved()],[{...approved(),agreement_version:'old'}]]){
    const h=harness(t);h.state.rows=rows;const i=h.button('fws:open');await h.route.handle(i);assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC PAGE ONE'),false);}
});
test('manual-review guide data stays backend-only through composition',async t=>{
  const h=harness(t);Object.assign(h.state.rows[0],{comprehension_submitted_at:T,comprehension_passed_at:null,
    comprehension_review_snapshot:{formatVersion:'manual-review-v1',checkVersion:'SYNTHETIC-check-v1',items:[{question:'SYNTHETIC QUESTION',response:'SYNTHETIC RESPONSE',expectedAnswer:'SYNTHETIC GUIDE'}]}});
  const i=h.button('fws:open');await h.route.handle(i);assert.match(i.edits[0].content,/SYNTHETIC PAGE ONE/);assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC GUIDE'),false);
});
test('database failure denies neutrally without backend diagnostics',async t=>{
  const h=harness(t);h.state.dbError=true;const i=h.button('fws:open');await h.route.handle(i);assert.equal(JSON.stringify(i.edits).includes('PRIVATE DB'),false);assert.equal(JSON.stringify(i.edits).includes('SYNTHETIC PAGE ONE'),false);
});
test('disposal retires composed readers without destroying shared resources',async t=>{
  const h=harness(t),entry=h.button('fws:open');await h.route.handle(entry);const count=h.state.queries.length+h.state.fetches.length;
  assert.deepEqual(await h.route.dispose(),{drained:true});await h.route.handle(h.button(h.next(entry)));assert.equal(h.state.queries.length+h.state.fetches.length,count);
});
test('unrelated namespaces never trigger composed authority reads',async t=>{
  const h=harness(t);assert.equal(await h.route.handle(h.button('cert:initial:home')),false);assert.equal(h.state.queries.length+h.state.fetches.length,0);
});
