import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedWebRehearsal} from './standalone-web-rehearsal-lifecycle.mjs';
import {WEB_REHEARSAL_KEY as courseKey} from './standalone-web-rehearsal-core.mjs';
const actorId='11111111111111111';
const config={enabled:true,reviewOnly:true,syntheticOnly:true,providerMs:15,drainMs:25,maxOperations:2,maxInflight:2};
const request=(action='open',extra={}) => ({actorId,courseKey,action,...extra});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function providers(){return {authorize:async i=>({...i,allowed:true}),loadPage:async()=> 'fictional content',progress:{read:async()=>null,compareAndSet:async(_i,r)=>({outcome:'saved',revision:r+1})}};}
test('default off does not access ports',()=>{
  assert.deepEqual(createBoundedWebRehearsal({},new Proxy({},{get(){throw Error('access');}})),{enabled:false});
});
test('bounds and review gates reject invalid composition',()=>{
  for(const field of ['providerMs','drainMs','maxOperations','maxInflight']) assert.throws(()=>createBoundedWebRehearsal({...config,[field]:0},providers()));
  assert.throws(()=>createBoundedWebRehearsal({...config,syntheticOnly:false},providers()));
});
test('normal read succeeds and stop is idempotent',async()=>{
  const app=createBoundedWebRehearsal(config,providers());
  assert.equal((await app.run(request())).outcome,'page');
  const closing=app.stop();assert.strictEqual(app.stop(),closing);
  assert.deepEqual(await closing,{drained:true});
  assert.deepEqual(await app.run(request()),{outcome:'unavailable'});
});
test('hung authorization times out but remains undrained',async()=>{
  const d=deferred(),p=providers();p.authorize=()=>d.promise;
  const app=createBoundedWebRehearsal(config,p);
  assert.deepEqual(await app.run(request()),{outcome:'unavailable'});
  assert.deepEqual(await app.stop(),{drained:false});
  d.resolve({actorId,courseKey,allowed:true});
});
test('operation admission rejects excess work without another call',async()=>{
  const d=deferred(),entered=deferred(),p=providers();let calls=0;
  p.authorize=()=>{calls++;entered.resolve();return d.promise;};
  const app=createBoundedWebRehearsal({...config,maxOperations:1},p);
  const first=app.run(request());await entered.promise;
  assert.deepEqual(await app.run(request()),{outcome:'unavailable'});assert.equal(calls,1);
  d.resolve({actorId,courseKey,allowed:true});await first;await app.stop();
});
test('timed-out providers retain capacity until settlement',async()=>{
  const d=deferred(),p=providers();let calls=0;
  p.authorize=()=>{calls++;return d.promise;};
  const app=createBoundedWebRehearsal({...config,maxInflight:1},p);
  await app.run(request());await app.run(request());assert.equal(calls,1);
  d.resolve({actorId,courseKey,allowed:true});await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await app.run(request())).outcome,'page');await app.stop();
});
test('late save can commit after unavailable; no automatic retry',async()=>{
  const d=deferred(),entered=deferred(),p=providers();let row=null,writes=0;
  p.progress.compareAndSet=async(_i,r,pageKey)=>{writes++;entered.resolve();await d.promise;row={pageKey,revision:r+1};return {outcome:'saved',revision:r+1};};
  p.progress.read=async()=>row;
  const app=createBoundedWebRehearsal(config,p);
  const save=app.run(request('save',{pageKey:'http',expectedRevision:0}));await entered.promise;
  assert.deepEqual(await save,{outcome:'unavailable'});assert.equal(row,null);
  d.resolve();await new Promise(resolve=>setImmediate(resolve));
  const resumed=await app.run(request('resume'));assert.equal(resumed.pageKey,'http');assert.equal(resumed.revision,1);assert.equal(writes,1);
  await app.stop();
});
test('late provider rejection is handled',async()=>{
  const d=deferred(),p=providers();p.loadPage=()=>d.promise;
  const app=createBoundedWebRehearsal(config,p);await app.run(request());
  d.reject(Error('fictional private diagnostic'));await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(await app.stop(),{drained:true});
});
test('stop during loading suppresses content and waits for settlement',async()=>{
  const d=deferred(),entered=deferred(),p=providers();p.loadPage=()=>{entered.resolve();return d.promise;};
  const app=createBoundedWebRehearsal(config,p);const reading=app.run(request());await entered.promise;
  const closing=app.stop();d.resolve('fictional private');
  assert.deepEqual(await reading,{outcome:'unavailable'});assert.deepEqual(await closing,{drained:true});
});
test('stop does not claim cancellation of a running write',async()=>{
  const d=deferred(),entered=deferred(),p=providers();let committed=false;
  p.progress.compareAndSet=async()=>{entered.resolve();await d.promise;committed=true;return {outcome:'saved',revision:1};};
  const app=createBoundedWebRehearsal(config,p);const save=app.run(request('save',{pageKey:'entry',expectedRevision:0}));await entered.promise;
  const closing=app.stop();d.resolve();assert.deepEqual(await save,{outcome:'unavailable'});
  assert.deepEqual(await closing,{drained:true});assert.equal(committed,true);
});
