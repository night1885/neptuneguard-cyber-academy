export function createStagingCoordinatedPrepare({gate,prepare,isReady}) {
 if(typeof gate?.run!=='function'||typeof prepare!=='function'||typeof isReady!=='function')throw Error('Explicit staging prepare providers required');
 const denied=()=>Object.freeze({ok:false,reason:'unavailable'});
 return async(...args)=>{
  try{return await gate.run(async()=>{
   if(isReady()!==true)throw Error('Staging prepare unavailable');
   const result=await prepare(...args);
   if(result?.reason==='reconcile-required')throw Error('Staging prepare outcome requires reconciliation');
   if(isReady()!==true)throw Error('Staging prepare unavailable');
   return result;
  });}catch{return denied();}
 };
}
