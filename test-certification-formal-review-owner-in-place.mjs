import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewOwnerInteractions} from './formal-review-owner-interactions.mjs';
const guildId='100000000000000001',ownerId='100000000000000002',channelId='100000000000000003',applicationId='100000000000000004',botId='100000000000000005';
const workId='11111111-1111-4111-8111-111111111111',reportId='22222222-2222-4222-8222-222222222222';
function fixture(){
 const state={updates:0,output:[],clock:1000,allowed:true};
 const read=async()=>{if(state.hook)state.hook();return state.allowed?{ok:true,reportId,revision:1,body:'Fictional owner report.',expiresAtMs:2000,reviewToken:null,review:{decision:'review-recorded',feedback:'Fictional owner feedback.'}}:{ok:false};};
 const fail=()=>assert.fail('Read navigation must not invoke a review mutation');
 const handler=createFormalReviewOwnerInteractions({enabled:true,guildId,ownerId,channelId,applicationId,botId,isReady:()=>true,now:()=>state.clock,flow:{enabled:true,read,open:read,canPrepare:fail,prepare:fail,confirm:fail,cancel:fail}});
 let serial=100000000000000100n;
 function interaction(mode){return {id:(serial++).toString(),customId:'frr:'+mode+':'+workId+':'+reportId,guildId,applicationId,channelId,channel:{id:channelId,guildId,type:0},user:{id:ownerId},message:{author:{id:botId},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,async deferUpdate(){state.updates++;this.deferred=true;},async deferReply(){assert.fail('Read navigation must stay in place');},async reply(){assert.fail('Valid read navigation must stay in place');},async editReply(p){state.output.push(p);}};}
 return {state,handler,interaction};
}
test('reviewer switches between existing report and feedback in place',async()=>{const f=fixture();try{for(const mode of ['open','feedback']){await f.handler.handle(f.interaction(mode));const p=f.state.output.at(-1);assert.equal(p.embeds[0].description,mode==='open'?'Fictional owner report.':'Fictional owner feedback.');assert.deepEqual(p.allowedMentions,{parse:[]});assert.equal(p.components[0].components[0].custom_id,'frr:'+(mode==='open'?'feedback':'open')+':'+workId+':'+reportId);}assert.equal(f.state.updates,2);}finally{f.handler.dispose();await f.handler.drain();}});
for(const mode of ['denied','expired'])test('reviewer in-place read clears content on '+mode,async()=>{const f=fixture();try{if(mode==='denied')f.state.allowed=false;else f.state.hook=()=>{f.state.clock=2000;};await f.handler.handle(f.interaction('open'));assert.equal(f.state.updates,1);assert.deepEqual(f.state.output.at(-1).embeds,[]);assert.deepEqual(f.state.output.at(-1).components,[]);}finally{f.handler.dispose();await f.handler.drain();}});
