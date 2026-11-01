import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingOperationGate} from './staging-operation-gate.mjs';
import {createStagingCoordinatedPrepare} from './staging-coordinated-prepare.mjs';
import {createNoModalIntakeBoundary} from '../synthetic-workspace/no-modal-intake-boundary.mjs';
const G='100000000000000001',C='100000000000000002',A='100000000000000003',M='100000000000000004';
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};};
function fixture(outcome,{timeoutMs=1000}={}){
 const entered=deferred(),release=deferred(),edits=[],order=[];let fatal=false,disposed=false;
 const gate=createStagingOperationGate({timeoutMs,onUnhealthy(){fatal=true;}});
 const isReady=()=>!fatal&&!disposed;
 const prepare=createStagingCoordinatedPrepare({gate,isReady,prepare:async()=>{order.push('prepare-start');entered.resolve();await release.promise;order.push('prepare-end');return outcome;}});
 const coordinator={prepare,async preview(){},async submit(){},dispose(){disposed=true;}};
 const boundary=createNoModalIntakeBoundary({enabled:true,guildId:G,entryChannelId:C,isReady,readNow:()=>1000,coordinator});
 const i={customId:'nmi:prepare',guildId:G,channelId:C,user:{id:A},isButton:()=>true,message:{id:M},deferred:false,replied:false,async deferReply(){order.push('deferred');this.deferred=true;},async editReply(p){edits.push(p);return {id:M,flags:{has:()=>true}};},async reply(p){edits.push(p);this.replied=true;}};
 return {entered,release,edits,order,gate,boundary,i,get fatal(){return fatal;},stop(){boundary.dispose();gate.stop();}};
}
test('uncertain preparation blocks retention and produces safe unavailable reply',async()=>{
 const f=fixture({ok:false,reason:'reconcile-required'});let scanned=false;
 const interaction=f.boundary.handle(f.i);await f.entered.promise;
 assert.equal(f.order[0],'deferred');const scan=assert.rejects(f.gate.run(()=>{scanned=true;}));
 f.release.resolve();await interaction;await scan;
 assert.equal(f.fatal,true);assert.equal(scanned,false);assert.equal(f.edits.length,1);assert.equal(f.edits[0].content,'Evidence intake is unavailable.');assert.deepEqual(f.edits[0].components,[]);f.stop();
});
test('successful preparation serializes retention and preserves preview button',async()=>{
 const f=fixture({ok:true,channelId:C});const interaction=f.boundary.handle(f.i);await f.entered.promise;
 const scan=f.gate.run(()=>f.order.push('retention'));f.release.resolve();await interaction;await scan;
 assert.ok(f.order.indexOf('retention')>f.order.indexOf('prepare-end'));assert.equal(f.fatal,false);assert.equal(f.edits.length,1);assert.equal(f.edits[0].components[0].components[0].custom_id,'nmi:preview');f.stop();
});
test('outer timeout returns unavailable and blocks queued retention',async()=>{
 const f=fixture({ok:true,channelId:C},{timeoutMs:20});let scanned=false;
 const interaction=f.boundary.handle(f.i);await f.entered.promise;const scan=assert.rejects(f.gate.run(()=>{scanned=true;}));
 await interaction;await scan;assert.equal(f.edits.length,1);assert.equal(f.edits[0].content,'Evidence intake is unavailable.');assert.equal(scanned,false);assert.equal(f.fatal,true);
 f.release.resolve();await new Promise(r=>setImmediate(r));assert.equal(f.edits.length,1);f.stop();
});
test('shutdown suppresses late Discord response and queued retention',async()=>{
 const f=fixture({ok:true,channelId:C});let scanned=false;
 const interaction=f.boundary.handle(f.i);await f.entered.promise;const scan=assert.rejects(f.gate.run(()=>{scanned=true;}));f.stop();await interaction;await scan;f.release.resolve();assert.equal(f.edits.length,0);assert.equal(scanned,false);
});
