import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceiptRecoveryBoundary as create} from './receipt-recovery-boundary.mjs';
const G='100000000000000001',P='100000000000000002',A='100000000000000003',C='100000000000000004',M='100000000000000005';
const R='11111111-1111-1111-1111-111111111111',Q='22222222-2222-2222-2222-222222222222',S='33333333-3333-3333-3333-333333333333';
for(const [name,deadlines,expected]of [['short',[1001000],1000],['mixed',[1001000,1020000],1000],['long',[1400000],300000]])test('session timer uses earliest bound: '+name,async()=>{
 const timers=[],edits=[];let now=1000000,reads=0;const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false,unref(){}};timers.push(timer);return timer;};globalThis.clearTimeout=t=>{if(t)t.cleared=true;};
 const ports={now:()=>now,isReady:()=>true,resolve:async()=>({recordId:R,learnerId:A,courseKey:'course',exerciseKey:'exercise',revision:1}),authorize:async()=>true,
 discoverReceipts:async()=>deadlines.map((d,n)=>({requestId:n?S:Q,reportId:S,revision:1,expiresAtMs:d})),recoverSubmission:async()=>{reads++;return {ok:false};}};
 const boundary=create({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:P,entryChannelId:C,courseKey:'course',exerciseKey:'exercise'},ports);
 const interaction=customId=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags:{has:()=>true}},isButton:()=>true,deferred:false,
 async deferReply(){this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(){},async editReply(p){edits.push(p);return {id:M,flags:{has:()=>true}};}});
 try{
  await boundary.handle(interaction('nmr:list'));const token=edits[0].components[0].components[0].custom_id;
  const active=timers.filter(t=>!t.cleared);assert.equal(active.length,1);assert.equal(active[0].ms,expected);
  active[0].fn();await boundary.handle(interaction(token));assert.equal(reads,0);assert.equal(edits.length,1);
 }finally{boundary.dispose();globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
