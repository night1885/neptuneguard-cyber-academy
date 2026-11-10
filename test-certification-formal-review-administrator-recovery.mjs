import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createFormalReviewReceiptRecovery} from './formal-review-receipt-recovery.mjs';
import {createFormalReviewRecoveryInteractions} from './formal-review-recovery-interactions.mjs';
const G='100000000000000001',O='100000000000000002',D='100000000000000003',A='100000000000000004',C='100000000000000005',B='100000000000000006';
function fixture(mode='reviewer'){
 const workId=randomUUID(),reportId=randomUUID(),operationId=randomUUID(),stamp=Date.now(),actorId=mode==='reviewer'?D:A,action=mode==='reviewer'?'review':'submit',events=[];let permitted=true,queries=0,reads=0,wrongActor=false;
 const verifyAdministrator=async id=>id===D&&permitted;
 const recovery=createFormalReviewReceiptRecovery({enabled:true,guildId:G,ownerId:O,reviewerMode:'current-administrator',verifyAdministrator,isReady:()=>true,now:()=>stamp,readPool:{async query(sql,args){queries++;assert.ok(sql.trim().startsWith('SELECT'));assert.deepEqual(args,[G,actorId,workId,action]);return {rows:[{guild_id:G,learner_id:A,work_id:workId,actor_id:wrongActor?O:actorId,operation_id:operationId,action,report_id:reportId,revision:action==='review'?2:1,expires_ms:String(stamp+60000)}]};}},core:{enabled:true,async read(ctx){reads++;assert.equal(ctx.actorId,actorId);return {ok:true,reportId,revision:1,expiresAtMs:stamp+60000,review:action==='review'?{decision:'review-recorded'}:null};}}});
 const delegate={enabled:true,handle:async()=>false,dispose(){},drain:async()=>{}};
 const controls=createFormalReviewRecoveryInteractions({enabled:true,mode,guildId:G,ownerId:O,channelId:C,applicationId:B,botId:B,recovery,delegate,isReady:()=>true,now:()=>stamp,reviewerMode:'current-administrator',verifyAdministrator});
 const ctx={actorId,guildId:G},request={workId,action};
 function interaction(origin=actorId){return {id:'100000000000000099',customId:(mode==='reviewer'?'frr':'frv')+':recover:'+workId,applicationId:B,guildId:G,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:actorId},message:{author:{id:B},flags:{has:n=>n===64},interactionMetadata:{user:{id:origin}}},inGuild:()=>true,isButton:()=>true,async deferUpdate(){this.deferred=true;},async editReply(p){events.push(p);}};}
 return {recovery,controls,ctx,request,interaction,events,get queries(){return queries;},get reads(){return reads;},revoke(){permitted=false;},wrongActor(){wrongActor=true;},async close(){controls.dispose();recovery.dispose();await Promise.all([controls.drain(),recovery.drain()]);}};
}
for(const mode of ['reviewer','learner'])test('receipt controls preserve '+mode+' actor and action',async()=>{const f=fixture(mode);try{const value=await f.recovery.inspectLatest(f.ctx,f.request);assert.equal(value.ok,true);assert.equal(value.action,f.request.action);await f.controls.handle(f.interaction());assert.ok(f.events.at(-1).components.length>0);assert.deepEqual(f.events.at(-1).embeds,[]);}finally{await f.close();}});
test('revoked Administrator denied before receipt query',async()=>{const f=fixture();try{f.revoke();assert.deepEqual(await f.recovery.inspectLatest(f.ctx,f.request),{ok:false});assert.equal(f.queries,0);}finally{await f.close();}});
test('foreign actor receipt cannot be inspected',async()=>{const f=fixture();try{f.wrongActor();assert.deepEqual(await f.recovery.inspectLatest(f.ctx,f.request),{ok:false});assert.equal(f.reads,0);}finally{await f.close();}});
test('foreign interaction origin rejected before querying receipts',async()=>{const f=fixture();try{await f.controls.handle(f.interaction(O));assert.equal(f.queries,0);}finally{await f.close();}});
test('Administrator mode requires explicit action to avoid owner-based inference',async()=>{const f=fixture();try{assert.deepEqual(await f.recovery.inspectLatest(f.ctx,{workId:f.request.workId}),{ok:false});assert.equal(f.queries,0);}finally{await f.close();}});
