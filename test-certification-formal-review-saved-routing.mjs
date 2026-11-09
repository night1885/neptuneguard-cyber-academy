import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewInteractions} from './formal-review-interactions.mjs';
const guildId='100000000000000001',applicationId='100000000000000002',botId='100000000000000003',actorId='100000000000000004',channelId='100000000000000005';
const workId='11111111-1111-4111-8111-111111111111',reportId='22222222-2222-4222-8222-222222222222',previewId='33333333-3333-4333-8333-333333333333';
function fixture(withCore=true){
 const state={reads:0,confirms:0,output:[],ready:true,receipt:{ok:true,workId,reportId,revision:1,expiresAtMs:2000}};
 const core={enabled:true,async read(ctx,r){state.reads++;assert.deepEqual(ctx,{actorId,guildId});assert.deepEqual(r,{workId,reportId});return {ok:true,reportId,revision:1,body:'Fictional saved report.',expiresAtMs:2000,review:{decision:'review-recorded',feedback:'Fictional feedback.'}};}};
 const intake={enabled:true,preview:async()=>({ok:false}),cancel:async()=>({ok:false}),async confirm(){state.confirms++;return state.receipt;}};
 const handler=createFormalReviewInteractions({enabled:true,guildId,applicationId,botId,intake,isReady:()=>state.ready,now:()=>1000,...(withCore?{core}:{})});
 function interaction(customId){return {id:'100000000000000006',customId,applicationId,guildId,channelId,channel:{id:channelId,guildId,type:0},user:{id:actorId},message:{author:{id:botId},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,async deferReply(){this.deferred=true;this.ephemeral=true;},async editReply(p){state.output.push(p);},async reply(p){state.output.push(p);}};}
 return {state,handler,interaction};
}
for(const mode of ['report','feedback'])test('learner factory routes saved '+mode+' without submission',async()=>{const f=fixture();try{await f.handler.handle(f.interaction('frv:'+mode+':'+workId+':'+reportId));assert.equal(f.state.reads,1);assert.equal(f.state.confirms,0);assert.equal(f.state.output.at(-1).embeds.length,1);}finally{f.handler.dispose();await f.handler.drain();}});
for(const enabled of [false,true])test('saved buttons require explicit core: '+enabled,async()=>{const f=fixture(enabled);try{await f.handler.handle(f.interaction('frv:confirm:'+previewId));const ids=f.state.output.at(-1).components.flatMap(r=>r.components.map(b=>b.custom_id));assert.equal(ids.includes('frv:report:'+workId+':'+reportId),enabled);assert.equal(ids.includes('frv:feedback:'+workId+':'+reportId),enabled);assert.ok(ids.includes('frv:confirm:'+previewId));}finally{f.handler.dispose();await f.handler.drain();}});
test('missing receipt work identity retains recovery and emits no saved buttons',async()=>{const f=fixture();try{delete f.state.receipt.workId;await f.handler.handle(f.interaction('frv:confirm:'+previewId));const p=f.state.output.at(-1);assert.ok(p.content.includes('delivery is unconfirmed'));assert.equal(p.components.length,1);}finally{f.handler.dispose();await f.handler.drain();}});
test('saved routing remains off without explicit core',async()=>{const f=fixture(false);try{await f.handler.handle(f.interaction('frv:report:'+workId+':'+reportId));assert.equal(f.state.reads,0);assert.deepEqual(f.state.output.at(-1).embeds,[]);}finally{f.handler.dispose();await f.handler.drain();}});
