import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewInteractions} from './formal-review-interactions.mjs';
const G='100000000000000001',B='100000000000000002',A='100000000000000003',C='100000000000000004',M='100000000000000005';
const W='11111111-1111-4111-8111-111111111111',P='22222222-2222-4222-8222-222222222222',R='33333333-3333-4333-8333-333333333333';
function fixture(phase,ephemeral,inPlace=false){
 const s={calls:[],output:[],updates:0};
 const intake={enabled:true,async preview(){s.calls.push('preview');s.hook?.();return {ok:true,previewId:P,body:'PRIVATE fictional source.',expiresAtMs:2000};},async confirm(){s.calls.push('confirm');s.hook?.();return {ok:true,workId:W,reportId:R,revision:1,expiresAtMs:2000};},async cancel(){s.calls.push('cancel');return {ok:true,cancelledPreview:true};}};
 const handler=createFormalReviewInteractions({enabled:true,guildId:G,botId:B,applicationId:B,intake,isReady:()=>true,now:()=>1000});
 const values=new Map([['source_message_id',M],['consent','PREVIEW']]);
 const i={id:'100000000000001000',customId:'frv:'+phase+':'+(['start','preview'].includes(phase)?W:P),applicationId:B,guildId:G,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:A},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>phase!=='preview',isModalSubmit:()=>phase==='preview',isFromMessage:()=>true,fields:{fields:values,getTextInputValue:k=>values.get(k)},async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;if(ephemeral!==undefined)this.ephemeral=ephemeral;},async editReply(p){s.output.push(p);},async reply(p){s.output.push(p);this.replied=true;}};
 if(inPlace)i.deferUpdate=async()=>{s.updates++;i.deferred=true;};
 return {s,i,handler,async close(){handler.dispose();await handler.drain();}};
}
for(const phase of ['start','preview','confirm','cancel'])for(const state of [false,undefined])test('fallback '+phase+' rejects non-private or unknown acknowledgement '+String(state),async()=>{
 const f=fixture(phase,state);try{await f.handler.handle(f.i);assert.deepEqual(f.s.calls,[]);assert.equal(f.s.output.some(p=>p.embeds?.length),false);assert.equal(JSON.stringify(f.s.output).includes('PRIVATE'),false);}finally{await f.close();}
});
for(const phase of ['start','preview','confirm','cancel'])test('explicit private fallback remains supported: '+phase,async()=>{
 const f=fixture(phase,true);try{await f.handler.handle(f.i);assert.equal(f.s.output.length,1);if(phase==='preview')assert.equal(f.s.output[0].embeds[0].description,'PRIVATE fictional source.');if(phase==='confirm')assert.match(f.s.output[0].content,/submission recorded/);}finally{await f.close();}
});
for(const phase of ['start','preview','confirm','cancel'])test('verified ephemeral origin supports in-place '+phase+' without reply ephemeral property',async()=>{
 const f=fixture(phase,undefined,true);try{await f.handler.handle(f.i);assert.equal(f.s.updates,1);assert.equal(f.s.output.length,1);if(phase==='preview')assert.equal(f.s.output[0].embeds[0].description,'PRIVATE fictional source.');}finally{await f.close();}
});
test('fallback privacy drift suppresses fetched preview and cancels unattempted metadata',async()=>{
 const f=fixture('preview',true);try{f.s.hook=()=>{f.i.ephemeral=false;};await f.handler.handle(f.i);assert.deepEqual(f.s.calls,['preview','cancel']);assert.equal(f.s.output.some(p=>p.embeds?.length),false);}finally{await f.close();}
});
test('fallback privacy drift after confirmation does not repeat mutation or disclose receipt',async()=>{
 const f=fixture('confirm',true);try{f.s.hook=()=>{f.i.ephemeral=false;};await f.handler.handle(f.i);assert.deepEqual(f.s.calls,['confirm']);assert.equal(f.s.output.some(p=>p.content.includes('submission recorded')),false);assert.equal(JSON.stringify(f.s.output).includes(R),false);}finally{await f.close();}
});
