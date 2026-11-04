// Detached/default-off CI composition candidate. No SDK, pool, listener or provisioning.
import {isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
const denied=outcome=>Object.freeze({outcome});
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const fail=()=>Error('Detached custody composition unavailable');
async function loadModules(){const [s,j,c,a]=await Promise.all([import('./custody-state.mjs'),import('./custody-storage.mjs'),import('./custody-controller.mjs'),import('./standalone-web-save-receipts-adapter.mjs')]);return {...s,...j,...c,...a};}
export function createDetachedCustodyComposition(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({enabled:false,ready:false,start:async()=>false,recordSave:async()=>denied('disabled'),recoverReceipt:async()=>denied('disabled'),stop:async()=>Object.freeze({complete:true,pending:0})});
 const {directory,expectedInstanceId,scope,waitMs=50,drainMs=50,maxQueued=20,stopMs=50}=config;
 if(config.mode!=='detached-custody-ci'||config.reviewOnly!==true||config.syntheticOnly!==true||config.disposableReview!==true||config.storageAttested!==true||!isAbsolute(directory??'')||!uuid(expectedInstanceId)||!scope||typeof scope!=='object'||!['actorId','contentRevision','courseKey','generation','guildId'].every(k=>Object.hasOwn(Object.getOwnPropertyDescriptors(scope)[k]??{},'value'))||Reflect.ownKeys(scope).length!==5||!Number.isInteger(stopMs)||stopMs<5||stopMs>1000||!Number.isInteger(waitMs)||waitMs<5||waitMs>1000||!Number.isInteger(drainMs)||drainMs<5||drainMs>1000||!Number.isInteger(maxQueued)||maxQueued<1||maxQueued>20||typeof ports.getResources!=='function'||typeof ports.isReady!=='function'||ports.loadModules!==undefined&&typeof ports.loadModules!=='function')throw fail();
 const capturedScope=Object.freeze(Object.fromEntries(['actorId','contentRevision','courseKey','generation','guildId'].map(k=>[k,scope[k]]))),loader=ports.loadModules??loadModules,getResources=ports.getResources,isReady=ports.isReady;
 let retired=false,started=false,starting=false,startPromise,adapter,storage,controller,cleaning;
 function externalReady(){try{const r=isReady.call(ports);r?.catch?.(()=>{});return r===true;}catch{return false;}}
 const ready=()=>started&&!retired&&externalReady();
 function cleanup(){if(cleaning)return cleaning;cleaning=(async()=>{if(controller){const r=await controller.close();if(r?.complete!==true)return Object.freeze({complete:false,pending:Math.max(1,r?.pending??1)});controller=null;storage=null;}else if(storage){await storage.close();storage=null;}if(adapter){adapter.dispose();adapter=null;}return Object.freeze({complete:true,pending:0});})().catch(()=>Object.freeze({complete:false,pending:1})).finally(()=>{cleaning=null;});return cleaning;}
 function start(){if(retired)return Promise.resolve(false);if(startPromise)return startPromise;if(!externalReady())return Promise.resolve(false);starting=true;startPromise=(async()=>{try{
  const m=await loader.call(ports);if(retired)return false;
  const validated=m.createState(capturedScope).scope;
  adapter=m.createWebReceiptStore({...validated,enabled:true,reviewOnly:true,syntheticOnly:true,disposableReview:true,databaseName:'ng_web_review_ci',expectedRole:'web_receipt_ci_worker'},{getResources:()=>getResources.call(ports),isReady:()=>!retired&&externalReady()});
  storage=await m.openStorage({directory,storageAttested:true,scopeKey:createHash('sha256').update(JSON.stringify(validated)).digest('hex'),expectedInstanceId});
  if(retired){await cleanup();return false;}
  controller=await m.openController({scope:validated,waitMs,drainMs,maxQueued},{storage,adapter});
  if(retired){await cleanup();return false;}started=true;return true;
 }catch{await cleanup();return false;}finally{starting=false;}})();return startPromise;}
 async function call(name,ctx,command){if(!ready()||!controller)return denied('unavailable');try{return await controller[name](ctx,command);}catch{return denied('unavailable');}}
 async function stop(){retired=true;started=false;if(starting)return Object.freeze({complete:false,pending:1});let timer;try{return await Promise.race([cleanup(),new Promise(resolve=>{timer=setTimeout(()=>resolve(Object.freeze({complete:false,pending:1})),stopMs);})]);}finally{clearTimeout(timer);}}
 return Object.freeze({enabled:true,get ready(){return ready();},start,recordSave:(ctx,c)=>call('recordSave',ctx,c),recoverReceipt:(ctx,c)=>call('recoverReceipt',ctx,c),stop});
}
