import assert from 'node:assert/strict';
import {createDetachedIntakeJourney} from '../synthetic-workspace/detached-intake-journey.mjs';
export async function exerciseLifecycleComposition({t,fresh,journeys,config}) {
 await t.test('disposed actual storage denies both assembly routes',async()=>{
  const f=await fresh();await f.submit();const before={edits:f.edits.length,reads:f.reads,creates:f.creates,submits:f.submits};
  f.api.dispose();assert.equal(f.api.ready,false);assert.equal(f.journey.ready,false);
  assert.equal(await f.handle('nmi:prepare'),true);assert.equal(await f.handle('nmr:list'),true);
  assert.equal(f.denials.length,2);assert.equal(f.edits.length,before.edits);assert.equal(f.reads,before.reads);assert.equal(f.creates,before.creates);assert.equal(f.submits,before.submits);assert.equal(await f.count(),1);
 });
 for(const [first,second]of [['nmi:prepare','nmr:list'],['nmr:list','nmi:prepare']])await t.test('shared clock regression across '+first+' to '+second,async()=>{
  const f=await fresh();assert.equal(await f.handle(first),true);assert.equal(f.denials.length,0);
  const before={edits:f.edits.length,reads:f.reads,creates:f.creates,submits:f.submits};f.now--;
  assert.equal(await f.handle(second),true);assert.equal(f.denials.length,1);assert.equal(f.edits.length,before.edits);assert.equal(f.reads,before.reads);assert.equal(f.creates,before.creates);assert.equal(f.submits,before.submits);assert.equal(await f.count(),0);
 });
 function facade(target,method,intercept){
  const value={};
  for(const key of Object.keys(target)){
   if(key==='ready'){Object.defineProperty(value,key,{enumerable:true,get:()=>target.ready});continue;}
   const member=target[key];value[key]=typeof member==='function'?(...args)=>key===method?intercept(...args):member.apply(target,args):member;
  }
  return value;
 }
 for(const route of ['nmi:prepare','nmr:list'])await t.test('dispose suppresses completed real-provider result awaiting release: '+route,{timeout:10000},async()=>{
  const f=await fresh();if(route==='nmr:list')await f.submit();
  f.journey.dispose();const baseline={edits:f.edits.length,denials:f.denials.length,reads:f.reads,submits:f.submits};
  let enter,release,pending,calls=0;
  const entered=new Promise(resolve=>{enter=resolve;});const released=new Promise(resolve=>{release=resolve;});
  const target=route==='nmi:prepare'?f.engine:f.api,method=route==='nmi:prepare'?'prepare':'discoverReceipts';
  const wrapped=facade(target,method,async(...args)=>{
   calls++;
   try{const result=await target[method].apply(target,args);enter({ok:true,result});await released;return result;}
   catch(error){enter({ok:false});throw error;}
  });
  const coordinator=route==='nmi:prepare'?wrapped:f.engine,storage=route==='nmr:list'?wrapped:f.api;
  f.journey=createDetachedIntakeJourney(config,{coordinator,storage,isReady:()=>f.parentReady,now:()=>f.now});journeys.push(f.journey);
  try{
   pending=f.handle(route);const state=await Promise.race([entered,pending.then(()=>({ok:false}))]);assert.equal(state.ok,true);assert.equal(calls,1);
   if(route==='nmi:prepare')assert.equal(state.result.ok,true);else{assert.equal(Array.isArray(state.result),true);assert.equal(state.result.length,1);}
   f.journey.dispose();assert.equal(f.journey.ready,false);release();await pending;
   assert.equal(f.edits.length,baseline.edits);assert.equal(f.denials.length,baseline.denials);assert.equal(f.api.ready,true);
   assert.equal(f.reads,baseline.reads);assert.equal(f.submits,baseline.submits);assert.equal(f.creates,1);assert.equal(await f.count(),route==='nmr:list'?1:0);
   assert.equal(await f.handle(route),false);
   if(route==='nmr:list')assert.deepEqual(await f.engine.recoverSubmission(f.ctx,f.requestId),f.ack);
   else assert.equal((await f.engine.prepare(f.ctx)).ok,true);
   assert.equal(f.creates,1);
  }finally{release();f.journey.dispose();if(pending)await pending;}
 });
}
