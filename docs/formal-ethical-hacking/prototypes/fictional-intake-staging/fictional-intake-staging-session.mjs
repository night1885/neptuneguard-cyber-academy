import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
import {createDetachedIntakeJourney} from '../synthetic-workspace/detached-intake-journey.mjs';
// Owns the assembly only. Resource start/verify/close remain explicit trusted ports.
export function createFictionalIntakeStagingSession(config={},scope={},ports={}){
 const inspected=inspectFictionalIntakeStagingProfile(config);
 if(!inspected.ok)throw Error('Invalid fictional intake staging profile');
 if(!inspected.enabled)return Object.freeze({start:async()=>{},verifyIsolation:async()=>false,isReady:()=>false,handle:async()=>false,close:async()=>{}});
 const profile=inspected.profile;
 if(!['courseKey','exerciseKey'].every(k=>typeof scope[k]==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(scope[k])))throw Error('Explicit fictional exercise scope required');
 const courseKey=scope.courseKey,exerciseKey=scope.exerciseKey;
 const {coordinator,storage,now,isReady,startResources,verifyIsolation,closeResources}=ports;
 if(!coordinator||!storage||![now,isReady,startResources,verifyIsolation,closeResources].every(f=>typeof f==='function'))throw Error('Explicit staging resource providers required');
 let started=false,verified=false,closed=false,journey,startPromise,closePromise;
 const providersReady=()=>{try{const value=isReady.call(ports);if(value?.catch)value.catch(()=>{});return started&&verified&&!closed&&value===true;}catch{return false;}};
 function start(){
  if(closed)return Promise.reject(Error('Staging session retired'));
  if(!startPromise)startPromise=(async()=>{
   await startResources.call(ports,profile);if(closed)return;
   journey=createDetachedIntakeJourney({enabled:true,mode:'detached-rehearsal',guildId:profile.staging.guildId,productionGuildId:profile.production.guildId,entryChannelId:profile.staging.entryChannelId,courseKey,exerciseKey},
    {coordinator,storage,isReady:providersReady,now:()=>now.call(ports)});started=true;
  })();
  return startPromise;
 }
 return Object.freeze({start,
  async verifyIsolation(actualProfile){
   verified=false;if(!started||closed||JSON.stringify(actualProfile)!==JSON.stringify(profile))return false;
   const result=await verifyIsolation.call(ports,profile);if(closed)return false;verified=result===true;return verified;
  },
  isReady:()=>providersReady()&&journey?.ready===true,
  async handle(i){if(!providersReady()||journey?.ready!==true)return false;return journey.handle(i);},
  close(){
   closed=true;verified=false;
   if(!closePromise)closePromise=(async()=>{try{journey?.dispose();}finally{await closeResources.call(ports);}})();
   return closePromise;
  }
 });
}
