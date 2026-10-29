import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoModalIntakeBoundary as create} from './no-modal-intake-boundary.mjs';
// Scripted boundary doubles only: no live SDK, provider or database.
const G='100000000000000001', C='100000000000000002', A='100000000000000003';
function fixture(options={}) {
  const f={now:1000,ready:true,calls:0,edits:[],denials:[],serial:0};
  const coordinator={prepare:async()=>{f.calls++;return {ok:true,channelId:C};},preview:async()=>{f.calls++;return {ok:false};},submit:async()=>{f.calls++;return {ok:false};},dispose(){}};
  f.coordinator=coordinator;
  f.boundary=create({enabled:true,guildId:G,entryChannelId:C,readNow:()=>f.now,isReady:()=>f.ready,coordinator,...options});
  f.message={id:'100000000000000004',flags:{has:n=>n===64}};
  f.interaction=(customId='nmi:prepare',patch={})=>({customId,guildId:G,channelId:C,user:{id:A},message:f.message,isButton:()=>true,
    deferReply:async()=>{},deferUpdate:async()=>{},reply:async p=>f.denials.push(p),editReply:async p=>{f.edits.push(p);return f.message;},...patch});
  return f;
}
for(const ready of [false,undefined,1,'true']) test(`readiness requires literal true: ${String(ready)}`,async()=>{
  const f=fixture();f.ready=ready;await f.boundary.handle(f.interaction());assert.equal(f.calls,0);assert.equal(f.denials.length,1);
});
for(const [name,isReady] of [['throw',()=>{throw Error('private');}],['reject',()=>Promise.reject(Error('private'))]]) test(`readiness ${name} fails closed`,async()=>{
  const f=fixture({isReady});await f.boundary.handle(f.interaction());await new Promise(r=>setImmediate(r));assert.equal(f.calls,0);assert.equal(f.denials.length,1);
});
for(const now of [NaN,Infinity,1.5,-1]) test(`invalid clock ${now} blocks provider use`,async()=>{
  const f=fixture();f.now=now;await f.boundary.handle(f.interaction());assert.equal(f.calls,0);assert.equal(f.denials.length,1);
});
test('clock regression blocks reuse',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());f.now=999;await f.boundary.handle(f.interaction('nmi:preview'));assert.equal(f.calls,1);assert.equal(f.denials.length,1);
});
for(const patch of [{deferred:true},{replied:true}]) test(`already acknowledged ${Object.keys(patch)[0]} is not acknowledged twice`,async()=>{
  const f=fixture();await f.boundary.handle(f.interaction('nmi:prepare',patch));assert.equal(f.calls,0);assert.equal(f.denials.length,0);assert.equal(f.edits.length,0);
});
test('public message cannot reuse private ownership binding',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());await f.boundary.handle(f.interaction('nmi:preview',{message:{...f.message,flags:{has:()=>false}}}));assert.equal(f.calls,1);assert.equal(f.denials.length,1);
});
test('unknown bound route never calls preview or submit',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());await f.boundary.handle(f.interaction('nmi:unknown'));assert.equal(f.calls,1);assert.deepEqual(f.edits.at(-1).components,[]);
});
test('provider failure contains exception and publishes no success',async()=>{
  const f=fixture();f.coordinator.prepare=async()=>{throw Error('PRIVATE_FAILURE');};assert.equal(await f.boundary.handle(f.interaction()),true);assert.equal(f.edits.length,0);assert.ok(!JSON.stringify(f.denials).includes('PRIVATE_FAILURE'));
});
for(const mode of ['dispose','not-ready']) test(`late preparation suppressed after ${mode}`,async()=>{
  const f=fixture();let release;f.coordinator.prepare=()=>new Promise(r=>{release=r;});const pending=f.boundary.handle(f.interaction());
  while(!release) await new Promise(r=>setImmediate(r));
  if(mode==='dispose') f.boundary.dispose();else f.ready=false;
  release({ok:true,channelId:C});await pending;assert.equal(f.edits.length,0);
});
test('invalid preview metadata yields no confirm button or provider body',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());f.coordinator.preview=async()=>({ok:true,channelId:C,sourceMessageId:f.message.id,token:'bad',digest:'bad',body:'PRIVATE_BODY'});
  await f.boundary.handle(f.interaction('nmi:preview'));assert.deepEqual(f.edits.at(-1).components,[]);assert.ok(!JSON.stringify(f.edits).includes('PRIVATE_BODY'));
});
test('100 settled control bindings cap admission and expiry frees capacity',async()=>{
  const f=fixture();for(let n=0;n<100;n++){f.message={id:String(100000000000000100n+BigInt(n)),flags:{has:k=>k===64}};await f.boundary.handle(f.interaction());}
  await f.boundary.handle(f.interaction());assert.equal(f.calls,100);assert.equal(f.denials.length,1);
  f.now+=300000;await f.boundary.handle(f.interaction());assert.equal(f.calls,101);
});
