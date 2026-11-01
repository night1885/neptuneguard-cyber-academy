import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingOperationGate} from './staging-operation-gate.mjs';
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:value=>resolve(value)};};
test('retention waits for provisioning completion',async()=>{
 const gate=createStagingOperationGate(),started=deferred(),release=deferred(),order=[];
 const provisioning=gate.run(async()=>{order.push('provision-start');started.resolve();await release.promise;order.push('provision-end');});
 await started.promise;
 const retention=gate.run(async()=>{order.push('retention');});
 await new Promise(r=>setImmediate(r));assert.deepEqual(order,['provision-start']);
 release.resolve();await Promise.all([provisioning,retention]);
 assert.deepEqual(order,['provision-start','provision-end','retention']);gate.stop();
});
test('timeout blocks queued work even when provider finishes late',async()=>{
 let unhealthy=0,ran=false;const release=deferred();
 const gate=createStagingOperationGate({timeoutMs:20,onUnhealthy(){unhealthy++;}});
 const first=assert.rejects(gate.run(()=>release.promise));
 const next=assert.rejects(gate.run(()=>{ran=true;}));
 await Promise.all([first,next]);assert.equal(gate.failed,true);assert.equal(ran,false);assert.equal(unhealthy,1);
 release.resolve();await new Promise(r=>setImmediate(r));assert.equal(gate.ready,false);assert.equal(ran,false);gate.stop();
});
test('stop rejects active and queued work',async()=>{
 const gate=createStagingOperationGate(),started=deferred(),release=deferred();let ran=false;
 const first=assert.rejects(gate.run(async()=>{started.resolve();await release.promise;}));await started.promise;
 const next=assert.rejects(gate.run(()=>{ran=true;}));gate.stop();await Promise.all([first,next]);release.resolve();assert.equal(ran,false);assert.equal(gate.ready,false);
});
test('operation failure quarantines subsequent work',async()=>{
 const gate=createStagingOperationGate();await assert.rejects(gate.run(()=>{throw Error('fixture');}));
 assert.equal(gate.failed,true);await assert.rejects(gate.run(()=>true));gate.stop();
});
