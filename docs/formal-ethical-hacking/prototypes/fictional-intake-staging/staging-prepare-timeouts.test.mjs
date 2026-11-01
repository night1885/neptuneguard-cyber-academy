import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingPrepareTimeouts} from './staging-prepare-timeouts.mjs';

test('staging preparation defaults are bounded and immutable',()=>{
 const policy=stagingPrepareTimeouts();
 assert.deepEqual(policy,{providerTimeoutMs:5000,prepareTimeoutMs:60000});
 assert.equal(Object.isFrozen(policy),true);
});
test('explicit short budgets support offline tests',()=>{
 assert.deepEqual(stagingPrepareTimeouts({providerTimeoutMs:20,prepareTimeoutMs:100}),{providerTimeoutMs:20,prepareTimeoutMs:100});
});
test('invalid provider and total budgets fail closed',()=>{
 for(const providerTimeoutMs of [0,4,10001,1.5,NaN,Infinity,'5000',null])
  assert.throws(()=>stagingPrepareTimeouts({providerTimeoutMs}));
 for(const prepareTimeoutMs of [0,9,60001,1.5,NaN,Infinity,'60000',null])
  assert.throws(()=>stagingPrepareTimeouts({prepareTimeoutMs}));
 assert.throws(()=>stagingPrepareTimeouts({providerTimeoutMs:5000,prepareTimeoutMs:5000}));
 assert.throws(()=>stagingPrepareTimeouts({providerTimeoutMs:5000,prepareTimeoutMs:4000}));
});
