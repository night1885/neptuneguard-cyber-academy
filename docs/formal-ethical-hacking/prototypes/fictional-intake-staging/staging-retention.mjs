export function createStagingRetention({store,channels,now=Date.now,operationTimeoutMs=5000,onUnhealthy=()=>{}}){
 if(!Number.isInteger(operationTimeoutMs)||operationTimeoutMs<10||operationTimeoutMs>60000||typeof onUnhealthy!=='function')throw Error('Invalid staging retention controls');
 let stopped=false,failed=false,healthy=false,pending;
 const controller=new AbortController(),signal=controller.signal;
 const cancelled=()=>stopped||failed;
 const notify=()=>{healthy=false;try{const r=onUnhealthy();r?.catch?.(()=>{});}catch{}};
 async function wait(work){
  if(cancelled())throw Error('Staging retention unavailable');let timer,onAbort;
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(Error('Staging retention retired'));signal.addEventListener('abort',onAbort,{once:true});});
  try{return await Promise.race([Promise.resolve().then(()=>{if(cancelled())throw Error();return work();}),aborted,
   new Promise((_,reject)=>{timer=setTimeout(()=>{failed=true;notify();reject(Error('Staging retention outcome unknown'));},operationTimeoutMs);})]);}
  finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);}
 }
 async function pass(){
  if(cancelled())return {complete:false,deleted:0,pending:0};if(pending)return pending;
  pending=(async()=>{let deleted=0,unknown=0;
   try{
    await wait(()=>store.due());const scan=await wait(()=>channels.scanDraftMetadata({isCancelled:cancelled}));
    if(cancelled()||scan.complete!==true){if(!stopped)notify();return {complete:false,deleted:0,pending:0};}
    const due=await wait(()=>store.due());
    for(const item of due){if(cancelled()||!Number.isSafeInteger(item.deadlineMs)||now()<item.deadlineMs){unknown++;continue;}
     try{if(await wait(()=>store.claim(item))!==true){unknown++;continue;}const r=await wait(()=>channels.deleteDueSource(item,{isCancelled:cancelled}));
      if(r?.deleted!==true){unknown++;continue;}await wait(()=>store.eraseConfirmed(item));deleted++;
     }catch{unknown++;}
    }
    const complete=!cancelled()&&unknown===0&&due.length<20;healthy=complete;if(!complete&&!stopped)notify();return {complete,deleted,pending:unknown};
   }catch{if(!stopped)notify();return {complete:false,deleted,pending:Math.max(1,unknown)};}
  })();try{return await pending;}finally{pending=undefined;}
 }
 return Object.freeze({pass,get admissionReady(){return healthy&&!stopped&&!failed;},get failed(){return failed;},
  async stop(){stopped=true;healthy=false;controller.abort();if(pending)await pending;}});
}
