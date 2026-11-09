import {discordId} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal review runtime unavailable');};
export function createFormalReviewRuntimeBridge(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,initialize:async()=>false,attach:()=>false,handle:async()=>false,detach:async()=>({drained:true})});
 const {client,guildId,applicationId,learner,reviewer,isReady,initializeResources,stopResources,closeResources,onDiagnostic=()=>{}}=options;
 if(!discordId(guildId)||!discordId(applicationId)||!['on','off'].every(k=>typeof client?.[k]==='function')||![learner,reviewer].every(h=>h?.enabled===true&&['handle','dispose','drain'].every(k=>typeof h[k]==='function'))||![isReady,initializeResources,stopResources,closeResources,onDiagnostic].every(f=>typeof f==='function'))fail();
 let stopped=false,initialized=false,attached=false,initializing=null,closing=null;const active=new Set(),ids=new Set();
 const available=()=>{try{return initialized&&!stopped&&isReady()===true;}catch{return false;}};
 async function initialize(){if(stopped)fail();if(initialized)return true;if(initializing)return initializing;
  initializing=Promise.resolve().then(async()=>{try{if(await initializeResources()!==true||stopped)fail();initialized=true;return true;}catch{initialized=false;fail();}finally{initializing=null;}});return initializing;
 }
 function handle(i){
  const id=i?.customId,route=typeof id==='string'&&id.startsWith('frv:')?'learner':typeof id==='string'&&id.startsWith('frr:')?'reviewer':null;
  if(!route||i.applicationId!==applicationId||i.guildId!==guildId||!discordId(i.id)||(i.isButton?.()!==true&&i.isModalSubmit?.()!==true))return Promise.resolve(false);
  if(!available()||ids.has(i.id)||active.size>=8)return Promise.resolve(true);
  ids.add(i.id);const task=(async()=>{try{if(await (route==='learner'?learner:reviewer).handle(i)!==true)throw Error();}catch{try{onDiagnostic(Object.freeze({event:'formal_review_route_failure',route}));}catch{}}return true;})();
  active.add(task);void task.then(()=>{active.delete(task);ids.delete(i.id);},()=>{active.delete(task);ids.delete(i.id);});return task;
 }
 const diagnostic=()=>{try{onDiagnostic(Object.freeze({event:'formal_review_dispatch_failure'}));}catch{}};
 const listener=i=>{try{void handle(i).catch(diagnostic);}catch{diagnostic();}};
 function attach(){if(!available())fail();if(!attached){client.on('interactionCreate',listener);attached=true;}return true;}
 function detach(){if(closing)return closing;stopped=true;initialized=false;let removalFailed=false;if(attached){try{client.off('interactionCreate',listener);}catch{removalFailed=true;}attached=false;}
  const disposal=[];for(const fn of [stopResources,()=>learner.dispose(),()=>reviewer.dispose()]){try{disposal.push(Promise.resolve(fn()));}catch{disposal.push(Promise.reject(Error('Formal review shutdown incomplete')));}}
  closing=(async()=>{const first=await Promise.allSettled([...disposal,...active,...(initializing?[initializing]:[])]);const drains=await Promise.allSettled([Promise.resolve().then(()=>learner.drain()),Promise.resolve().then(()=>reviewer.drain())]);
   if(removalFailed||[...first,...drains].some(r=>r.status==='rejected'))throw Error('Formal review shutdown incomplete; resources not closed');
   try{await closeResources();}catch{throw Error('Formal review resource closure unconfirmed');}return Object.freeze({drained:true});})();return closing;
 }
 return Object.freeze({enabled:true,get ready(){return available();},initialize,attach,handle,detach});
}
