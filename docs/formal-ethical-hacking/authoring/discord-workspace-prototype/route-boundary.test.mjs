import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormalReviewRoute } from './route-boundary.mjs';
const G='22222222222222222',C='33333333333333333';
const input=extra=>({customId:'fws:open',guildId:G,channelId:C,isButton:()=>true,deferred:false,replied:false,
  replies:[],async reply(payload){this.replies.push(payload);this.replied=true;},...extra});
function setup(t,options={}) {
  let handles=0,disposals=0,ready=true;
  const workspace={handle:async()=>{handles++;return true;},dispose:()=>{disposals++;}};
  const route=createFormalReviewRoute({enabled:true,reviewOnly:true,mode:'review',guildId:G,entryChannelId:C,
    isReady:()=>ready,createWorkspace:()=>workspace,...options});
  t.after(()=>route.dispose());
  return {route,workspace,setReady:value=>{ready=value;},handles:()=>handles,disposals:()=>disposals};
}
test('default-off path creates no workspace or authority side effects',async()=>{
  let called=0;const route=createFormalReviewRoute({createWorkspace:()=>{called++;throw new Error();}});
  assert.equal(route.enabled,false);assert.equal(await route.handle(input()),false);assert.deepEqual(await route.dispose(),{drained:true});assert.equal(called,0);
});
test('non-review modes and invalid enabled dependencies are rejected',()=>{
  for(const mode of ['disabled','production','read-only-preview','registration-pilot','closure'])
    assert.throws(()=>createFormalReviewRoute({enabled:true,reviewOnly:true,mode}));
  assert.throws(()=>createFormalReviewRoute({enabled:'true'}));
  assert.throws(()=>createFormalReviewRoute({enabled:true,mode:'review',reviewOnly:false}));
});
test('unrelated certification and community interactions pass through untouched',async t=>{
  const f=setup(t);for(const customId of ['cert:initial:home','community:open','formal-demo:test','']){
    const i=input({customId});assert.equal(await f.route.handle(i),false);assert.deepEqual(i.replies,[]);}
  assert.equal(f.handles(),0);
});
test('ready matching button delegates exactly once to existing workspace',async t=>{
  const f=setup(t),i=input();assert.equal(await f.route.handle(i),true);assert.equal(f.handles(),1);assert.deepEqual(i.replies,[]);
});
test('readiness false and thrown readiness deny privately without delegation',async t=>{
  for(const isReady of [()=>false,()=>{throw new Error('private readiness detail');}]){
    const f=setup(t,{isReady}),i=input();await f.route.handle(i);assert.equal(f.handles(),0);assert.equal(i.replies[0].flags,64);
    assert.deepEqual(i.replies[0].allowedMentions,{parse:[]});assert.equal(JSON.stringify(i.replies).includes('private readiness detail'),false);}
});
test('async readiness is denied rather than awaited or accepted as truthy',async t=>{
  const f=setup(t,{isReady:async()=>true}),i=input();await f.route.handle(i);assert.equal(f.handles(),0);assert.equal(i.replies.length,1);
  const other=setup(t,{isReady:async()=>{throw new Error('private async detail');}});await other.route.handle(input());assert.equal(other.handles(),0);
});
test('wrong guild channel or interaction type never reaches workspace',async t=>{
  const f=setup(t);for(const extra of [{guildId:'99999999999999999'},{channelId:'99999999999999999'},{isButton:()=>false}]){
    const i=input(extra);await f.route.handle(i);assert.equal(i.replies[0].flags,64);}
  assert.equal(f.handles(),0);
});
test('existing workspace refusal or exception yields neutral private response',async t=>{
  for(const handle of [async()=>false,async()=>{throw new Error('private workspace detail');}]){
    const f=setup(t);f.workspace.handle=handle;const i=input();assert.equal(await f.route.handle(i),true);assert.equal(i.replies.length,1);
    assert.equal(JSON.stringify(i.replies).includes('private workspace detail'),false);}
});
test('boundary never overwrites an already acknowledged response on rejection',async t=>{
  const f=setup(t,{isReady:()=>false});for(const extra of [{deferred:true},{replied:true}]){
    const i=input({...extra,editReply:()=>{throw new Error('must not edit');}});await f.route.handle(i);assert.deepEqual(i.replies,[]);}
});
test('dispose stops formal admission without touching unrelated routes',async t=>{
  const f=setup(t);assert.deepEqual(await f.route.dispose(),{drained:true});const i=input();assert.equal(await f.route.handle(i),true);
  assert.deepEqual(i.replies,[]);assert.equal(f.handles(),0);assert.equal(await f.route.handle(input({customId:'cert:initial:home'})),false);
  assert.equal(f.disposals(),1);
});
test('dispose is idempotent and owns only its workspace',async t=>{
  const f=setup(t);const first=f.route.dispose(),second=f.route.dispose();assert.equal(first,second);await first;assert.equal(f.disposals(),1);
});
test('shutdown waits for tracked in-flight workspace completion',async t=>{
  const f=setup(t);let finish;f.workspace.handle=()=>new Promise(r=>finish=r);const operation=f.route.handle(input());
  let drained=false;const closing=f.route.dispose().then(value=>{drained=true;return value;});await Promise.resolve();assert.equal(drained,false);
  finish(true);await operation;assert.deepEqual(await closing,{drained:true});
});
test('bounded drain reports incomplete instead of falsely claiming cancellation',async t=>{
  const f=setup(t,{drainMs:10});let finish;f.workspace.handle=()=>new Promise(r=>finish=r);const pending=f.route.handle(input());
  assert.deepEqual(await f.route.dispose(),{drained:false});finish(true);await pending;assert.equal(f.disposals(),1);
});
test('disposal errors report incomplete drain and remain idempotent',async t=>{
  const f=setup(t);f.workspace.dispose=()=>{throw new Error('private disposal detail');};assert.deepEqual(await f.route.dispose(),{drained:false});
  assert.deepEqual(await f.route.dispose(),{drained:false});
});
test('readiness is re-read per action; no positive result is cached',async t=>{
  const f=setup(t);await f.route.handle(input());f.setReady(false);const i=input();await f.route.handle(i);assert.equal(f.handles(),1);assert.equal(i.replies.length,1);
});
test('malformed owned workspace construction fails without installing anything',()=>{
  let disposed=0;assert.throws(()=>createFormalReviewRoute({enabled:true,reviewOnly:true,mode:'review',guildId:G,entryChannelId:C,
    isReady:()=>true,createWorkspace:()=>({dispose(){disposed++;}})}));assert.equal(disposed,1);
});
test('async construction is rejected and its eventual owned workspace is retired',async()=>{
  let disposed=0;
  assert.throws(()=>createFormalReviewRoute({enabled:true,reviewOnly:true,mode:'review',guildId:G,entryChannelId:C,isReady:()=>true,
    createWorkspace:async()=>({handle:async()=>true,dispose(){disposed++;}})}));
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(disposed,1);
});
