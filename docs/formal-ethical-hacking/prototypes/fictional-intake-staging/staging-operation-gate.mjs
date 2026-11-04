export function createStagingOperationGate({timeoutMs=5000,onUnhealthy=()=>{}}={}) {
 if(!Number.isInteger(timeoutMs)||timeoutMs<10||timeoutMs>60000||typeof onUnhealthy!=='function')throw Error('Invalid staging gate controls');
 let closed=false,failed=false,pending=0,tail=Promise.resolve();
 const controller=new AbortController();
 const unavailable=()=>Error('Staging operation unavailable');
 function quarantine(){if(failed)return;failed=true;try{const r=onUnhealthy();r?.catch?.(()=>{});}catch{}}
 function run(work,runTimeoutMs=timeoutMs){
  if(typeof work!=='function'||!Number.isInteger(runTimeoutMs)||runTimeoutMs<10||runTimeoutMs>60000||closed||failed||pending>=20)return Promise.reject(unavailable());
  pending++;
  const operation=tail.then(async()=>{
   if(closed||failed)throw unavailable();
   let timer,abort;
   const retired=new Promise((_,reject)=>{abort=()=>reject(unavailable());controller.signal.addEventListener('abort',abort,{once:true});});
   const actual=Promise.resolve().then(()=>{if(closed||failed)throw unavailable();return work();});
   try{return await Promise.race([actual,retired,new Promise((_,reject)=>{timer=setTimeout(()=>{quarantine();reject(unavailable());},runTimeoutMs);})]);}
   catch(error){if(!closed)quarantine();throw error;}
   finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);}
  });
  tail=operation.then(()=>undefined,()=>undefined);
  return operation.finally(()=>{pending--;});
 }
 return Object.freeze({run,get ready(){return !closed&&!failed;},get failed(){return failed;},stop(){closed=true;controller.abort();}});
}
