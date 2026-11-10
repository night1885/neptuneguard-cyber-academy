import {createCurrentAdministratorVerifier} from './certification-current-admin.js';
import {discordId,operationId,exactFields} from './formal-review-policy.mjs';
const fields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
export function createFormalReviewAdministratorAuthorization({client,guildId,isReady,verifyAdministrator,timeoutMs=2000}={}){
 if(!discordId(guildId)||typeof isReady!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<20||timeoutMs>5000)throw Error('Review administrator configuration unavailable');
 const verify=verifyAdministrator??createCurrentAdministratorVerifier(client,guildId);
 if(typeof verify!=='function')throw Error('Review administrator verifier required');
 let stopped=false;const pending=new Set();
 function alive(){return !stopped&&isReady()===true;}
 async function authorizeReviewer(scope){
  let timer;
  try{
   if(!alive()||!exactFields(scope,fields)||scope.guildId!==guildId||!discordId(scope.actorId)||!discordId(scope.learnerId)||scope.actorId===scope.learnerId||!operationId(scope.workId)||!discordId(scope.sourceChannelId)||scope.courseKey!=='ethical-hacking-reading'||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||typeof scope.exerciseKey!=='string'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey)||pending.size>=8)return false;
   const actorId=scope.actorId,task=Promise.resolve().then(()=>alive()?verify(actorId):false);
   pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));
   const result=await Promise.race([task,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);})]);
   return result===true&&alive();
  }catch{return false;}finally{clearTimeout(timer);}
 }
 return Object.freeze({authorizeReviewer,dispose(){stopped=true;},async drain(){await Promise.allSettled([...pending]);}});
}
// Authority only: does not establish private-channel access, consent, assignment
// eligibility or runtime integration. Those checks must remain independent.
