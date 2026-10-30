import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
import {createFictionalStagingResourceVerifier} from './fictional-intake-staging-resource-verifier.mjs';
import {createDetachedIntakeJourney} from '../synthetic-workspace/detached-intake-journey.mjs';
// Owns assembly and verification. Caller still owns SDK/pool startup and cleanup.
export function createFictionalIntakeStagingSession(config={},scope={},ports={}){
 const inspected=inspectFictionalIntakeStagingProfile(config);
 if(!inspected.ok)throw Error('Invalid fictional intake staging profile');
 if(!inspected.enabled)return Object.freeze({start:async()=>{},verifyIsolation:async()=>false,isReady:()=>false,handle:async()=>false,close:async()=>{}});
 const profile=inspected.profile;
 if(!['courseKey','exerciseKey'].every(k=>typeof scope[k]==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(scope[k])))throw Error('Explicit fictional exercise scope required');
 const courseKey=scope.courseKey,exerciseKey=scope.exerciseKey;
 const {coordinator,storage,now,isReady,startResources,verifyIsolation,closeResources,expectedRole}=ports;
 if(!coordinator||!storage||![now,isReady,startResources,verifyIsolation,closeResources].every(f=>typeof f==='function')||
  typeof expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole))throw Error('Explicit staging resource providers and role required');
 let started=false,verified=false,closed=false,journey,verifier,resources,startPromise,closePromise,verificationEpoch=0;
 const providersReady=()=>{
  try{
   if(!started||!verified||closed)return false;
   const value=isReady.call(ports),connected=resources.client.isReady();
   value?.catch?.(()=>{});connected?.catch?.(()=>{});
   if(value!==true||connected!==true||resources.client.user?.id!==profile.staging.botId){verified=false;return false;}
   return true;
  }catch{verified=false;return false;}
 };
 function start(){
  if(closed)return Promise.reject(Error('Staging session retired'));
  if(!startPromise)startPromise=(async()=>{
   const allocated=await startResources.call(ports,profile);if(closed)return;
   resources=Object.freeze({client:allocated?.client,pool:allocated?.pool});
   verifier=createFictionalStagingResourceVerifier(profile,resources,expectedRole);
   journey=createDetachedIntakeJourney({enabled:true,mode:'detached-rehearsal',guildId:profile.staging.guildId,productionGuildId:profile.production.guildId,entryChannelId:profile.staging.entryChannelId,courseKey,exerciseKey},
    {coordinator,storage,isReady:providersReady,now:()=>now.call(ports)});started=true;
  })();
  return startPromise;
 }
 return Object.freeze({start,
  async verifyIsolation(actualProfile){
   const epoch=++verificationEpoch;verified=false;
   try{
    if(!started||closed||JSON.stringify(actualProfile)!==JSON.stringify(profile))return false;
    if((await verifier.inspect()).ok!==true||closed||epoch!==verificationEpoch)return false;
    if(await verifyIsolation.call(ports,profile)!==true||closed||epoch!==verificationEpoch)return false;
    verified=true;return providersReady();
   }catch{return false;}
  },
  isReady:()=>providersReady()&&journey?.ready===true,
  async handle(i){if(!providersReady()||journey?.ready!==true)return false;return journey.handle(i);},
  close(){
   closed=true;verified=false;verificationEpoch++;verifier?.close();
   if(!closePromise)closePromise=(async()=>{
    try{if(startPromise)await startPromise;}catch{}
    try{journey?.dispose();}finally{await closeResources.call(ports);}
   })();
   return closePromise;
  }
 });
}
