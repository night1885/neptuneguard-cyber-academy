import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewSavedInteractions} from './formal-review-saved-interactions.mjs';
const guildId='100000000000000001',applicationId='100000000000000002',botId='100000000000000003',actorId='100000000000000004';
const workId='11111111-1111-4111-8111-111111111111',reportId='22222222-2222-4222-8222-222222222222';
function fixture(){
 const state={updates:0,reads:0,output:[],clock:1000,allowed:true};
 const handler=createFormalReviewSavedInteractions({enabled:true,guildId,applicationId,botId,isReady:()=>true,now:()=>state.clock,core:{enabled:true,async read(){state.reads++;if(state.hook)state.hook();return state.allowed?{ok:true,reportId,revision:1,body:'Fictional saved text.',expiresAtMs:2000,review:{decision:'review-recorded',feedback:'Fictional feedback.'}}:{ok:false};}}});
 let serial=100000000000000100n;
 function interaction(mode='report'){return {id:(serial++).toString(),customId:'frv:'+mode+':'+workId+':'+reportId,guildId,applicationId,user:{id:actorId},message:{author:{id:botId},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,async deferUpdate(){state.updates++;this.deferred=true;},async deferReply(){assert.fail('In-place navigation must not open a reply');},async reply(){assert.fail('Valid in-place navigation must not open a reply');},async editReply(p){state.output.push(p);}};}
 return {state,handler,interaction};
}
test('report and feedback update the original private message and retain navigation',async()=>{const f=fixture();try{for(const mode of ['report','feedback']){await f.handler.handle(f.interaction(mode));const p=f.state.output.at(-1);assert.equal(p.embeds[0].description,mode==='report'?'Fictional saved text.':'Fictional feedback.');assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(p.components[0].components.map(b=>b.custom_id),['frv:report:'+workId+':'+reportId,'frv:feedback:'+workId+':'+reportId]);}assert.equal(f.state.updates,2);assert.equal(f.state.reads,2);}finally{f.handler.dispose();await f.handler.drain();}});
for(const mode of ['denied','expires-during-read'])test('in-place navigation clears sensitive content on '+mode,async()=>{const f=fixture();try{if(mode==='denied')f.state.allowed=false;else f.state.hook=()=>{f.state.clock=2000;};await f.handler.handle(f.interaction());assert.equal(f.state.updates,1);assert.equal(f.state.output.at(-1).content,'Saved report unavailable or expired.');assert.deepEqual(f.state.output.at(-1).embeds,[]);assert.deepEqual(f.state.output.at(-1).components,[]);}finally{f.handler.dispose();await f.handler.drain();}});
