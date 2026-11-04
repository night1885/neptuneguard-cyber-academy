export function createStagingCoordinatedPrepare({gate,prepare,isReady,timeoutMs}) {
 if(typeof gate?.run!=='function'||typeof prepare!=='function'||typeof isReady!=='function')throw Error('Explicit staging prepare providers required');
 if(timeoutMs!==undefined&&(!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>60000))throw Error('Invalid staging prepare timeout');
 const denied=()=>Object.freeze({ok:false,reason:'unavailable'});
 return async(...args)=>{
  try{return await gate.run(async()=>{
   if(isReady()!==true)throw Error('Staging prepare unavailable');
   const result=await prepare(...args);
   if(result?.reason==='reconcile-required')throw Error('Staging prepare outcome requires reconciliation');
   if(isReady()!==true)throw Error('Staging prepare unavailable');
   return result;
  },timeoutMs);}catch{return denied();}
 };
}
