import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';
import {createStagingOperationGate} from './staging-operation-gate.mjs';
import {createStagingCoordinatedPrepare} from './staging-coordinated-prepare.mjs';

test('longer prepare budget preserves serialization and default gate timeout',async()=>{
 const gate=createStagingOperationGate({timeoutMs:20});
 const order=[];
 const prepare=createStagingCoordinatedPrepare({gate,timeoutMs:1000,isReady:()=>true,prepare:async()=>{order.push('prepare-start');await sleep(60);order.push('prepare-end');return {ok:true};}});
 try{
  const first=prepare();
  const second=gate.run(async()=>{order.push('retention');return true;});
  assert.deepEqual(await first,{ok:true});
  assert.equal(await second,true);
  assert.deepEqual(order,['prepare-start','prepare-end','retention']);
  await assert.rejects(gate.run(()=>new Promise(()=>{})));
  assert.equal(gate.failed,true);
 }finally{gate.stop();}
});
test('invalid operation budgets do not start work',async()=>{
 const gate=createStagingOperationGate();let calls=0;
 try{
  for(const budget of [null,0,9,60001,NaN,Infinity,'100']){
   await assert.rejects(gate.run(()=>{calls++;},budget));
   assert.throws(()=>createStagingCoordinatedPrepare({gate,prepare:async()=>({ok:true}),isReady:()=>true,timeoutMs:budget}));
  }
  assert.equal(calls,0);assert.equal(gate.ready,true);
 }finally{gate.stop();}
});
test('reconciliation still quarantines the gate with an explicit prepare budget',async()=>{
 const gate=createStagingOperationGate();
 const prepare=createStagingCoordinatedPrepare({gate,timeoutMs:1000,isReady:()=>true,prepare:async()=>({ok:false,reason:'reconcile-required'})});
 try{assert.deepEqual(await prepare(),{ok:false,reason:'unavailable'});assert.equal(gate.failed,true);}finally{gate.stop();}
});
