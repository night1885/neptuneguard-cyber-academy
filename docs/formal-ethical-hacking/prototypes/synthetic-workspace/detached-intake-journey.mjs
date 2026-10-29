import {createNoModalIntakeBoundary} from './no-modal-intake-boundary.mjs';
import {createReceiptRecoveryBoundary} from './receipt-recovery-boundary.mjs';
// Detached assembly only. Shared coordinator/storage remain owned by the caller.
export function createDetachedIntakeJourney(config={},providers={}) {
 if(config.enabled!==true)return Object.freeze({enabled:false,ready:false,handle:async()=>false,dispose(){}});
 const {coordinator,storage,isReady,now}=providers;
 if(!coordinator||!storage||typeof isReady!=='function'||typeof now!=='function'||
  !['prepare','preview','submit','recoverSubmission'].every(k=>typeof coordinator[k]==='function')||
  !['resolve','authorize','discoverReceipts'].every(k=>typeof storage[k]==='function'))throw Error('Explicit borrowed journey providers required');
 let stopped=false,last=-1,intake,recovery;
 const ready=()=>{try{if(stopped)return false;const value=isReady();if(value?.catch)value.catch(()=>{});return value===true&&storage.ready===true;}catch{return false;}};
 const readNow=()=>{const n=now();if(!Number.isSafeInteger(n)||n<0||n>8640000000000000-300000||n<last)throw Error('Journey clock unavailable');last=n;return n;};
 const invoke=(target,name)=>(...args)=>target[name].call(target,...args);
 try{
  recovery=createReceiptRecoveryBoundary(config,{resolve:invoke(storage,'resolve'),authorize:invoke(storage,'authorize'),discoverReceipts:invoke(storage,'discoverReceipts'),recoverSubmission:invoke(coordinator,'recoverSubmission'),isReady:ready,now:readNow});
  intake=createNoModalIntakeBoundary({enabled:true,guildId:config.guildId,entryChannelId:config.entryChannelId,isReady:ready,readNow,
   coordinator:{prepare:invoke(coordinator,'prepare'),preview:invoke(coordinator,'preview'),submit:invoke(coordinator,'submit'),dispose(){}}});
 }catch(error){stopped=true;recovery?.dispose();intake?.dispose();throw error;}
 return Object.freeze({enabled:true,get ready(){return ready();},
  async handle(i){
   if(stopped||typeof i?.customId!=='string')return false;
   if(i.customId.startsWith('nmi:'))return intake.handle(i);
   if(i.customId.startsWith('nmr:'))return recovery.handle(i);
   return false;
  },
  dispose(){if(stopped)return;stopped=true;try{intake.dispose();}finally{recovery.dispose();}}
 });
}
