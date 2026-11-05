import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseRequestInteractions } from './certification-course-request-interactions.js';
const owner='1223123544301633567', learner='1565767429764943916', guildId='1565762875799240906', channel='1339276399390887956', bot='1565771923407904799', role='1339276399390887957';
const requestId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
function fixture({studentAccessEnabled=true}={}) {
 let stamp=1000; const writes=[], reads=[];
 const service={async requestCourse(...args){writes.push(['request',...args]);return {alreadyPending:false};},async reviewRequest(...args){writes.push(['review',...args]);return {alreadyReviewed:false};}};
 const record={request_id:requestId,discord_user_id:learner,course_key:'one',status:'pending'};
 const reader={async listMine(actor){reads.push(actor);return [{...record,discord_user_id:actor}];},async listPending(actor){reads.push(actor);return [record];},async getRequest(actor){reads.push(actor);return record;}};
 const router=createCourseRequestInteractions({service,reader,config:{enabled:true,ownerId:owner,adminChannelId:channel,studentAccessEnabled},guildId,verifiedRoleId:role,catalog:[{key:'one',title:'One'}],now:()=>stamp});
 function interaction(actor,id) {return {customId:id,user:{id:actor},guildId,channelId:channel,client:{user:{id:bot}},guild:{id:guildId,members:{async fetch(id){return {id,roles:{cache:new Set([role])}};}}},message:{id:'1339276399390887958',author:{id:bot},flags:{has:n=>n===64},interactionMetadata:{user:{id:actor}}},isButton:()=>true,async deferUpdate(){this.deferred=true;},async editReply(payload){this.output=payload;},async reply(payload){this.replied=true;this.output=payload;}};}
 const token=i=>i.output.components[0].components[0].custom_id.split(':').at(-1);
 return {router,interaction,writes,reads,token,advance:()=>{stamp+=300000;}};
}
test('learner request uses in-place confirmation and cannot be replayed',async()=>{const f=fixture();const i=f.interaction(learner,'cert:cr:choose:one');await f.router.handle(i);assert.equal(f.writes.length,0);assert.equal(i.deferred,true);const token=f.token(i);i.customId=`cert:cr:confirm:${token}`;await f.router.handle(i);assert.deepEqual(f.writes,[['request',learner,'one']]);await f.router.handle(i);assert.equal(f.writes.length,1);});
test('student release hold blocks learner but permits owner inspection',async()=>{const f=fixture({studentAccessEnabled:false});await f.router.handle(f.interaction(learner,'cert:cr:mine:0'));assert.equal(f.reads.length,0);await f.router.handle(f.interaction(owner,'cert:cr:queue:0'));assert.deepEqual(f.reads,[owner]);});
test('foreign origin, public messages and non-owner review are denied before reads',async()=>{const f=fixture();for(const mutation of [i=>{i.message.interactionMetadata.user.id=owner;},i=>{i.message.flags.has=()=>false;},i=>{i.message.author.id=owner;}]){const i=f.interaction(learner,'cert:cr:mine:0');mutation(i);await f.router.handle(i);}await f.router.handle(f.interaction(learner,`cert:cr:approve:${requestId}`));assert.equal(f.reads.length,0);assert.equal(f.writes.length,0);});
test('owner approval is bound to the reviewed request and requires confirmation',async()=>{const f=fixture();const i=f.interaction(owner,`cert:cr:approve:${requestId}`);await f.router.handle(i);assert.equal(f.writes.length,0);i.customId=`cert:cr:confirm:${f.token(i)}`;await f.router.handle(i);assert.deepEqual(f.writes,[['review',owner,learner,requestId,'approved']]);});
test('expired and wrong-message confirmations make no writes',async()=>{for(const mode of ['expired','message']){const f=fixture();const i=f.interaction(learner,'cert:cr:choose:one');await f.router.handle(i);i.customId=`cert:cr:confirm:${f.token(i)}`;if(mode==='expired')f.advance();else i.message.id='1339276399390887959';await f.router.handle(i);assert.equal(f.writes.length,0);}});
test('cancel and disposal do not submit requests',async()=>{const f=fixture();const i=f.interaction(learner,'cert:cr:choose:one');await f.router.handle(i);i.customId=`cert:cr:cancel:${f.token(i)}`;await f.router.handle(i);assert.equal(f.writes.length,0);f.router.dispose();i.customId='cert:cr:choose:one';await f.router.handle(i);assert.equal(f.writes.length,0);});

import { createCourseRequestReader } from './certification-course-request-reader.js';
test('own-request query is actor scoped and parameterized',async()=>{const calls=[];const reader=createCourseRequestReader({async query(sql,args){calls.push({sql,args});return {rows:[]};}},{enabled:true,ownerId:owner});await reader.listMine(learner,2);assert.match(calls[0].sql,/WHERE discord_user_id=\$1/);assert.deepEqual(calls[0].args,[learner,10]);assert.match(calls[0].sql,/LIMIT 6/);});
test('owner queue uses four visible rows and one next-page sentinel',async()=>{const calls=[];const reader=createCourseRequestReader({async query(sql,args){calls.push({sql,args});return {rows:[]};}},{enabled:true,ownerId:owner});await reader.listPending(owner,2);assert.match(calls[0].sql,/LIMIT 5/);assert.deepEqual(calls[0].args,[8]);});
test('unauthorized or malformed reads do not reach the database',async()=>{let calls=0;const reader=createCourseRequestReader({async query(){calls++;return {rows:[]};}},{enabled:true,ownerId:owner});await assert.rejects(reader.listPending(learner,0),/Owner/);await assert.rejects(reader.getRequest(learner,'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),/Owner/);await assert.rejects(reader.listMine(learner,-1),/page/);await assert.rejects(reader.getRequest(owner,'invalid'),/request ID/);assert.equal(calls,0);});

import { createCourseRequestViews } from './certification-course-request-views.js';
const uuid = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const catalog = Array.from({length: 12}, (_, i) => ({key: `course-${i}`, title: `Course ${i}`}));
const views = createCourseRequestViews(catalog);
function bounds(payload) {
  assert.ok(payload.components.length <= 5);
  for (const row of payload.components) {
    assert.ok(row.components.length >= 1 && row.components.length <= 5);
    for (const b of row.components) { assert.equal(b.type, 2); assert.ok(b.custom_id.length <= 100); assert.ok(b.label.length <= 80); assert.equal(b.url, undefined); }
  }
  assert.deepEqual(payload.allowedMentions, {parse: []});
}
test('catalog uses only bounded card buttons with one course per choice', () => {
  for (const page of [0,1,2]) bounds(views.catalog(page));
  assert.equal(views.catalog(0).components[0].components.length, 5);
  assert.equal(views.catalog(2).components[0].components.length, 2);
  assert.throws(() => views.catalog(3)); assert.throws(() => views.catalog(-1));
});
test('catalog input is copied and unknown courses rejected', () => {
  const source = [{key:'one',title:'Original'}]; const copied = createCourseRequestViews(source);
  source[0].title = 'Changed'; assert.equal(copied.catalog(0).components[0].components[0].label, 'Original');
  assert.throws(() => copied.confirmation('request','unknown',uuid,owner));
});
test('learner requests do not display other learner identifiers', () => {
  const records = [{request_id:uuid,discord_user_id:owner,course_key:'course-0',status:'pending'}];
  const card = views.requests(records,0); bounds(card);
  assert.equal(card.embeds[0].description.includes(owner),false);
});
test('owner queue accepts four pending requests and rejects terminal records', () => {
  const records = Array.from({length:4}, () => ({request_id:uuid,discord_user_id:owner,course_key:'course-0',status:'pending'}));
  const card = views.requests(records,0,true); bounds(card); assert.equal(card.components.length,5);
  const more = views.requests([...records,records[0]],0,true); bounds(more); assert.ok(more.components.at(-1).components.some(b => b.label === 'Next'));
  assert.throws(() => views.requests([{...records[0],status:'approved'}],0,true));
});
test('confirmation buttons are session-bound and have no modal controls', () => {
  for (const action of ['request','approved','denied']) { const card=views.confirmation(action,'course-0',uuid,owner); bounds(card); assert.equal(card.components[0].components[0].custom_id,`cert:cr:confirm:${uuid}`); }
  assert.throws(() => views.confirmation('other','course-0',uuid,owner));
});
test('all learner status pages and results remain bounded', () => {
  for (const count of [0,1,5,6]) bounds(views.requests(Array.from({length:count},()=>({request_id:uuid,discord_user_id:owner,course_key:'course-0',status:'denied'})),0));
  bounds(views.result('Request remains pending.')); bounds(views.result('Decision recorded.',true));
});
