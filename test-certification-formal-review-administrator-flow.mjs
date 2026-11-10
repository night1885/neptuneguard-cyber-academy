import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createFormalReviewOwnerFlow} from './formal-review-owner-flow.mjs';
const O='100000000000000001',D='100000000000000002',E='100000000000000003',G='100000000000000004',C='100000000000000005';
function fixture(mode='current-administrator'){
 const workId=randomUUID(),reportId=randomUUID(),stamp=Date.now(),expires=stamp+86400000,actors=[],operations=new Set();let permitted=true,reads=0,writes=0;
 const core={enabled:true,async read(ctx){reads++;actors.push(ctx.actorId);return {ok:true,reportId,revision:1,body:'Fictional report',expiresAtMs:expires,review:null};},async review(ctx,q){actors.push(ctx.actorId);if(!operations.has(q.operationId)){operations.add(q.operationId);writes++;}return {ok:true,workId,reportId,revision:2,expiresAtMs:expires};}};
 const flow=createFormalReviewOwnerFlow({enabled:true,ownerId:O,guildId:G,channelId:C,core,isReady:()=>true,now:()=>stamp,reviewerMode:mode,...(mode==='current-administrator'?{verifyAdministrator:async id=>permitted&&[D,E].includes(id)}:{})});
 return {flow,actors,request:{workId,reportId},ctx:id=>({actorId:id,guildId:G,channelId:C}),get reads(){return reads;},get writes(){return writes;},revoke(){permitted=false;},close(){flow.dispose();return flow.drain();}};
}
async function prepared(f){const opened=await f.flow.open(f.ctx(D),f.request);assert.equal(opened.ok,true);const q={reviewToken:opened.reviewToken,decision:'review-recorded',feedback:'Fictional feedback',ack:'REVIEWED'};assert.equal((await f.flow.prepare(f.ctx(D),q)).ok,true);return {reviewToken:q.reviewToken};}
test('Administrator actor survives read, preparation, confirmation and same-key retry',async()=>{
 const f=fixture();try{const token=await prepared(f);assert.equal(f.writes,0);const a=await f.flow.confirm(f.ctx(D),token);assert.equal(a.ok,true);assert.deepEqual(await f.flow.confirm(f.ctx(D),token),a);assert.equal(f.writes,1);assert.ok(f.actors.every(id=>id===D));}finally{await f.close();}
});
test('another current Administrator cannot reuse the first actor confirmation',async()=>{
 const f=fixture();try{const token=await prepared(f);assert.deepEqual(await f.flow.confirm(f.ctx(E),token),{ok:false});assert.equal(f.writes,0);assert.equal((await f.flow.confirm(f.ctx(D),token)).ok,true);}finally{await f.close();}
});
test('permission loss before confirmation prevents core review call',async()=>{
 const f=fixture();try{const token=await prepared(f);f.revoke();assert.deepEqual(await f.flow.confirm(f.ctx(D),token),{ok:false});assert.equal(f.writes,0);}finally{await f.close();}
});
test('unverified actor cannot read report content through flow',async()=>{
 const f=fixture();try{assert.deepEqual(await f.flow.read(f.ctx(O),f.request),{ok:false});assert.equal(f.reads,0);f.revoke();assert.deepEqual(await f.flow.open(f.ctx(D),f.request),{ok:false});assert.equal(f.reads,0);}finally{await f.close();}
});
test('owner-mode compatibility still denies a different Administrator actor',async()=>{
 const f=fixture('owner');try{assert.deepEqual(await f.flow.open(f.ctx(D),f.request),{ok:false});assert.equal((await f.flow.open(f.ctx(O),f.request)).ok,true);}finally{await f.close();}
});
