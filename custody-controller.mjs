// Detached controller. No implicit provisioning, mutation retry, or runtime wiring.
import {inspectState,transition,inspectCommand} from './custody-state.mjs';import {createHash} from 'node:crypto';
const fail=()=>Error('Custody controller unavailable'),answer=(outcome,operationId)=>Object.freeze({outcome,...(operationId?{operationId}:{})}),same=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>a[k]===b[k]);
export async function openController({scope,waitMs=50,drainMs=50,maxQueued=20}={},ports={}){
 const {storage,adapter}=ports;if(!Number.isInteger(maxQueued)||maxQueued<1||maxQueued>20||!Number.isInteger(waitMs)||waitMs<5||waitMs>1000||!Number.isInteger(drainMs)||drainMs<5||drainMs>1000||!['snapshot','compareAndSet','close'].every(k=>typeof storage?.[k]==='function')||!['recordSave','readReceipt'].every(k=>typeof adapter?.[k]==='function'))throw fail();
 let state,storageSequence,closed=false,healthy=true,queue=Promise.resolve(),storageClosed=false,admitted=0;const active=new Set(),context=Object.freeze({actorId:scope.actorId,guildId:scope.guildId});
 const initial=await storage.snapshot();state=inspectState(JSON.parse(initial.payload));storageSequence=initial.sequence;if(!same(state.scope,scope)||state.sequence!==storageSequence||initial.scopeKey!==createHash('sha256').update(JSON.stringify(state.scope)).digest('hex'))throw fail();
 async function persist(type,payload){const next=transition(state,type,payload);if(next.sequence===state.sequence)return false;try{const r=await storage.compareAndSet(storageSequence,JSON.stringify(next));if(r.outcome!=='persisted'||r.sequence!==next.sequence||r.payload!==JSON.stringify(next))throw fail();state=next;storageSequence=r.sequence;return true;}catch{healthy=false;throw fail();}}
 await persist('restart',null);
 function serialize(work){const p=queue.then(async()=>{if(!healthy)throw fail();return work();});queue=p.catch(()=>{});return p;}
 function bound(p,ms,onTimeout){let timer;return Promise.race([p,new Promise(resolve=>{timer=setTimeout(()=>resolve(onTimeout()),ms);})]).finally(()=>clearTimeout(timer));}
 function captured(ctx,c){const cd=Object.getOwnPropertyDescriptors(ctx??{});if(Reflect.ownKeys(cd).length!==2||['actorId','guildId'].some(k=>!cd[k]||!Object.hasOwn(cd[k],'value')||cd[k].value!==context[k]))throw fail();const ds=Object.getOwnPropertyDescriptors(c??{}),keys=['expectedRevision','operationId','pageKey'];if(Reflect.ownKeys(ds).length!==3||keys.some(k=>!ds[k]||!Object.hasOwn(ds[k],'value')))throw fail();return inspectCommand(Object.fromEntries(keys.map(k=>[k,ds[k].value])));}
 function start(method,c){const work=Promise.resolve().then(()=>adapter[method](context,c)).then(r=>serialize(async()=>{
  if(!same(state.command,c)||!['pending','uncertain'].includes(state.phase))return answer('recovery-required',c.operationId);
  if(r?.outcome==='receipt'&&Reflect.ownKeys(r).length===2){try{const checked=transition(state,'receipt',r.receipt);if(checked.phase==='resolved'){await persist('receipt',r.receipt);return closed?answer('acknowledgement-unavailable',c.operationId):Object.freeze({outcome:'receipt',receipt:state.receipt});}}catch{if(!healthy)throw fail();}}
  await persist('uncertain',c);return answer('recovery-required',c.operationId);
 }),()=>serialize(async()=>{if(same(state.command,c)&&state.phase==='pending')await persist('uncertain',c);return answer('recovery-required',c.operationId);}));
 active.add(work);void work.then(()=>active.delete(work),()=>active.delete(work));return work;
 }
 async function runCall(ctx,input,recovery){let c;try{c=captured(ctx,input);}catch{return answer('unavailable');}if(closed)return answer('unavailable');
 const ticket=await serialize(async()=>{
  if(closed)return {denied:true};
  if(recovery){if(state.phase!=='uncertain'||!same(state.command,c)||active.size)return {denied:true};return {work:start('readReceipt',c)};}
  if(state.phase==='resolved'&&c.operationId===state.command.operationId)return {denied:true,outcome:same(state.command,c)?'receipt-already-resolved':'operation-binding-conflict'};
  if(!['idle','resolved'].includes(state.phase)||active.size)return {denied:true};
  await persist('prepare',c);await persist('dispatch',c);if(closed){await persist('uncertain',c);return {denied:true};}return {work:start('recordSave',c)};
 });
 if(ticket.denied)return answer(ticket.outcome??'recovery-required',state.command?.operationId);
 const marker=Symbol('timeout'),r=await bound(ticket.work,waitMs,()=>marker);if(r!==marker)return r;
 await serialize(async()=>{if(same(state.command,c)&&state.phase==='pending')await persist('uncertain',c);});return answer('recovery-required',c.operationId);
 }
 async function call(ctx,input,recovery){let c;try{c=captured(ctx,input);}catch{return answer('unavailable');}if(closed||!healthy||admitted>=maxQueued)return answer('unavailable');admitted++;try{return await runCall(ctx,c,recovery);}finally{admitted--;}}
 function snapshot(){if(closed&&storageClosed||!healthy||admitted>=maxQueued)return Promise.reject(fail());admitted++;return serialize(async()=>state).finally(()=>{admitted--;});}
 return Object.freeze({recordSave:(ctx,c)=>call(ctx,c,false),recoverReceipt:(ctx,c)=>call(ctx,c,true),snapshot,
 async close(){closed=true;const drained=await bound(Promise.allSettled([...active]).then(()=>true),drainMs,()=>false);await queue;if(!drained||active.size)return Object.freeze({complete:false,pending:active.size});if(!storageClosed){await storage.close();storageClosed=true;}return Object.freeze({complete:true,pending:0});}});
}
