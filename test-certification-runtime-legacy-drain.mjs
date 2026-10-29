import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('./certification-runtime.js',import.meta.url),'utf8');
const marker='        closing = (async () => {',start=source.indexOf(marker),end=source.indexOf('\n        })();',start);
assert.ok(start>=0&&end>start,'Expected bounded root shutdown assignment');
assert.equal(source.indexOf(marker,start+marker.length),-1,'Ambiguous shutdown assignment');
const assignment=source.slice(start,end+'\n        })();'.length);
function fixture({prefix='fws:',formal=null,timers=false,failedDrain=false,poolFailure=false,holdWork,holdEnd}={}){
 const state={closeRequests:0,closed:0};
 const context={active:new Set(holdWork?[holdWork]:[]),initializing:null,disposal:Promise.resolve(),formalDisposal:failedDrain?Promise.reject(new Error('SCRIPTED DRAIN FAILURE')):Promise.resolve(),formal,formalPrefix:prefix,formalDrainMs:10,closing:null,
  database:{async end(){state.closeRequests++;if(poolFailure)throw new Error('SCRIPTED POOL FAILURE');if(holdEnd)await holdEnd;state.closed++;}}};
 if(timers)Object.assign(context,{setTimeout,clearTimeout});
 runInNewContext('globalThis.close=()=>{'+assignment+';return closing;};',context);
 return{state,close:()=>context.close(),hasTimers:runInNewContext('typeof clearTimeout',context)};
}
function held(){let resolve;return{promise:new Promise(r=>resolve=r),release:()=>resolve()};}
test('ordinary root shutdown does not require timers in the legacy VM',async()=>{const f=fixture();assert.equal(f.hasTimers,'undefined');await f.close();assert.equal(f.state.closed,1);});
test('legacy fws formal shutdown still works without VM timer globals',async()=>{const f=fixture({formal:{enabled:true}});assert.equal(f.hasTimers,'undefined');await f.close();assert.equal(f.state.closed,1);});
test('legacy formal drain failure preserves old error and close ordering',async()=>{const f=fixture({formal:{enabled:true},failedDrain:true});await assert.rejects(f.close(),/Formal review shutdown requires attention/);assert.equal(f.state.closeRequests,1);});
test('legacy pool close error is not replaced by a timer ReferenceError',async()=>{const f=fixture({poolFailure:true});await assert.rejects(f.close(),/SCRIPTED POOL FAILURE/);assert.equal(f.state.closed,0);});
test('fnv successful shutdown closes with real timer APIs',async()=>{const f=fixture({prefix:'fnv:',formal:{enabled:true},timers:true});await f.close();assert.equal(f.state.closed,1);});
test('fnv unconfirmed drain never blindly closes pool',async()=>{const f=fixture({prefix:'fnv:',formal:{enabled:true},timers:true,failedDrain:true});await assert.rejects(f.close(),/drain incomplete/);assert.equal(f.state.closeRequests,0);});
test('fnv unsettled admitted work remains a bounded incomplete shutdown',async t=>{const gate=held();t.after(()=>gate.release());const f=fixture({prefix:'fnv:',formal:{enabled:true},timers:true,holdWork:gate.promise});await assert.rejects(f.close(),/shutdown incomplete/);assert.equal(f.state.closeRequests,0);});
test('fnv unsettled pool close is not reported complete',async t=>{const gate=held();t.after(()=>gate.release());const f=fixture({prefix:'fnv:',formal:{enabled:true},timers:true,holdEnd:gate.promise});await assert.rejects(f.close(),/shutdown incomplete/);assert.equal(f.state.closeRequests,1);assert.equal(f.state.closed,0);});
