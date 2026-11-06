import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombinedRegistrationRouter} from './certification-combined-registration-router.mjs';
const S='100000000000000002',G='100000000000000003',C='100000000000000004',T='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
for(const [id,allowed]of [['cert:course:submit:'+T,true],['cert:course:submit:bad',false],['cert:course:unsafe:'+T,false]])test('course modal admission: '+id,async()=>{
 const base=Object.assign(async i=>{await i.showModal({custom_id:id});return true;},{initialize:async()=>{},dispose:async()=>{}});
 const decisions=Object.assign(async()=>true,{ready:true,initialize:async()=>({ready:true}),dispose:async()=>{}});
 const policy={classify:()=>null,allowsStudent:()=>false,allowsButton:()=>false,allowsModal:()=>false};
 const route=createCombinedRegistrationRouter({settings:{enabled:true,combined:true,ownerId:'100000000000000001',guildId:G,adminChannelId:C,studentIds:[S]},policy,base,ownerDecisions:decisions,registration:async()=>true,learner:async()=>true});
 await route.initialize();const i={customId:'cert:course:open:fixture',user:{id:S},guildId:G,guild:{id:G},channelId:C,isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,async showModal(p){this.modal=p;}};
 try{if(allowed){assert.equal(await route(i),true);assert.equal(i.modal.custom_id,id);}else await assert.rejects(route(i),/Modal not admitted/);}finally{await route.dispose();}
});

import {createCourseRequestViews} from './certification-course-request-views.js';
import {createCourseRequestInteractions} from './certification-course-request-interactions.js';
const controlOwner='100000000000000001',controlLearner='100000000000000002',controlGuild='100000000000000003',controlChannel='100000000000000004',controlBot='100000000000000005',controlRole='100000000000000006';
const controlCatalog=Array.from({length:12},(_,n)=>({key:'control-'+n,title:'Control '+n}));
const controlViews=createCourseRequestViews(controlCatalog);
function controlRows(n){return Array.from({length:n},(_,i)=>({request_id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),discord_user_id:controlLearner,course_key:'control-0',status:'pending'}));}
function validControlPayload(p){
 const ids=[];assert.ok(p.components.length<=5);assert.deepEqual(p.allowedMentions,{parse:[]});
 for(const row of p.components){assert.equal(row.type,1);assert.ok(row.components.length>0&&row.components.length<=5);for(const b of row.components){assert.equal(b.type,2);assert.equal(typeof b.custom_id,'string');assert.ok(b.custom_id.length>0&&b.custom_id.length<=100);assert.ok(b.label.length<=80);assert.equal(b.url,undefined);ids.push(b.custom_id);}}
 assert.equal(new Set(ids).size,ids.length,'Interactive custom IDs must be unique across the whole message');
 return ids;
}
for(const page of [0,1,2])test('course catalog has globally unique controls at page '+page,()=>validControlPayload(controlViews.catalog(page)));
for(const page of [0,1,2])for(const count of [0,1,4,5])test('owner queue controls are unique at page '+page+' count '+count,()=>{
 const p=controlViews.requests(controlRows(count),page,true),ids=validControlPayload(p);
 assert.ok(ids.includes('cert:cr:queue:'+page));assert.ok(ids.includes('cert:cr:queue:0'));
 if(count>4)assert.ok(ids.includes('cert:cr:queue:'+(page+1)));
});
for(const page of [0,1,2])for(const count of [0,1,5,6])test('own-request controls are unique at page '+page+' count '+count,()=>validControlPayload(controlViews.requests(controlRows(count),page)));
for(const owner of [false,true])test('result controls are unique for owner='+owner,()=>validControlPayload(controlViews.result('Synthetic status',owner)));
for(const action of ['request','approved','denied'])test('confirmation IDs stay distinct for '+action,()=>validControlPayload(controlViews.confirmation(action,'control-0','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',controlLearner)));
function controlsFixture({students=false,failRead=false}={}){
 const state={reads:0,writes:0,rejected:0};
 const read=async()=>{state.reads++;if(failRead)throw Error('PRIVATE_READ_FAILURE');return[];};
 const service={async requestCourse(){state.writes++;assert.fail('No request write during inspection');},async reviewRequest(){state.writes++;assert.fail('No review write during inspection');}};
 const reader={listMine:read,listPending:read,async getRequest(){assert.fail('No request-detail read during queue inspection');}};
 const handle=createCourseRequestInteractions({service,reader,config:{enabled:true,ownerId:controlOwner,adminChannelId:controlChannel,studentAccessEnabled:students},guildId:controlGuild,verifiedRoleId:controlRole,catalog:controlCatalog,now:()=>1000});
 function interaction(id,actor=controlOwner){return{customId:id,user:{id:actor},guildId:controlGuild,channelId:controlChannel,client:{user:{id:controlBot}},guild:{id:controlGuild,members:{async fetch(id){return{id,roles:{cache:new Set([controlRole])}};}}},message:{id:'100000000000000007',author:{id:controlBot},flags:{has:n=>n===64},interactionMetadata:{user:{id:actor}}},isButton:()=>true,async deferUpdate(){this.deferred=true;},async editReply(p){
  try{validControlPayload(p);}catch{state.rejected++;throw Object.assign(Error('Synthetic duplicate-ID transport rejection'),{code:50035});}
  this.output=p;
 },async reply(p){assert.equal(p.flags,64);this.replied=true;this.output=p;}};}
 return{state,handle,interaction};
}
test('empty owner queue reaches the expected private view without transport rejection or writes',async()=>{
 const f=controlsFixture(),i=f.interaction('cert:cr:queue:0');await f.handle.handle(i);
 assert.equal(i.output.embeds[0].title,'Pending course requests');assert.equal(i.output.embeds[0].description,'No requests on this page.');assert.equal(f.state.rejected,0);assert.equal(f.state.reads,1);assert.equal(f.state.writes,0);f.handle.dispose();
});
test('owner read failure retains owner queue navigation and no writes',async()=>{
 const f=controlsFixture({failRead:true}),i=f.interaction('cert:cr:queue:0');await f.handle.handle(i);
 assert.match(i.output.embeds[0].description,/outcome could not be confirmed/);const ids=validControlPayload(i.output);assert.ok(ids.includes('cert:cr:queue:0'));assert.ok(!ids.includes('cert:cr:mine:0'));assert.equal(f.state.writes,0);f.handle.dispose();
});
test('learner read failure does not expose owner controls',async()=>{
 const f=controlsFixture({students:true,failRead:true}),i=f.interaction('cert:cr:mine:0',controlLearner);await f.handle.handle(i);
 const ids=validControlPayload(i.output);assert.ok(ids.includes('cert:cr:mine:0'));assert.ok(!ids.some(id=>/^cert:cr:(queue|approve|deny):/.test(id)));assert.equal(f.state.writes,0);f.handle.dispose();
});
test('learner request hold still denies reads and writes',async()=>{
 const f=controlsFixture(),i=f.interaction('cert:cr:mine:0',controlLearner);await f.handle.handle(i);assert.equal(f.state.reads,0);assert.equal(f.state.writes,0);f.handle.dispose();
});
test('a learner cannot inspect the owner queue',async()=>{
 const f=controlsFixture({students:true}),i=f.interaction('cert:cr:queue:0',controlLearner);await f.handle.handle(i);assert.equal(f.state.reads,0);assert.equal(f.state.writes,0);f.handle.dispose();
});
test('owner queue in another channel is denied before reads',async()=>{
 const f=controlsFixture(),i=f.interaction('cert:cr:queue:0');i.channelId='100000000000000008';await f.handle.handle(i);assert.equal(f.state.reads,0);assert.equal(f.state.writes,0);f.handle.dispose();
});
test('queue source from another actor is denied before reads',async()=>{
 const f=controlsFixture(),i=f.interaction('cert:cr:queue:0');i.message.interactionMetadata.user.id=controlLearner;await f.handle.handle(i);assert.equal(f.state.reads,0);assert.equal(f.state.writes,0);f.handle.dispose();
});
