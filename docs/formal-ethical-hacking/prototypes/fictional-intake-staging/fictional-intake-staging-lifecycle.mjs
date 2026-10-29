import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
// Trusted factory lifecycle only. No SDK client, pool, login or listener is supplied here.
export function createFictionalIntakeStagingLifecycle(config={},factories={}){
 const inspected=inspectFictionalIntakeStagingProfile(config);
 if(!inspected.ok)throw Error('Invalid fictional intake staging profile');
 if(!inspected.enabled)return Object.freeze({enabled:false,ready:false,operationalReady:false,state:'disabled',start:async()=>false,handle:async()=>false,stop:async()=>{}});
 const createSession=factories.createSession;
 if(typeof createSession!=='function')throw Error('Explicit staging session factory required');
 const profile=inspected.profile;let state='idle',stopped=false,session,startPromise,closePromise,stopPromise;
 const ready=()=>{
  try{if(stopped||state!=='ready')return false;const value=session.isReady();if(value?.catch)value.catch(()=>{});return value===true;}catch{return false;}
 };
 const close=()=>{
  if(!closePromise)closePromise=(async()=>{
   try{if(session){if(typeof session.close!=='function')throw Error();await session.close();}state='stopped';}
   catch{state='cleanup-failed';throw Error('Staging cleanup requires attention');}
  })();
  return closePromise;
 };
 function start(){
  if(stopped)return Promise.resolve(false);
  if(!startPromise)startPromise=(async()=>{
   state='starting';
   try{
    session=await createSession.call(factories,profile);
    if(!session||!['start','verifyIsolation','isReady','handle','close'].every(k=>typeof session[k]==='function'))throw Error();
    if(stopped){await close();return false;}
    await session.start();if(stopped){await close();return false;}
    if(await session.verifyIsolation(profile)!==true)throw Error();
    if(stopped){await close();return false;}
    state='ready';if(!ready())throw Error();return true;
   }catch{
    stopped=true;
    try{await close();}catch{throw Error('Staging cleanup requires attention');}
    throw Error('Staging startup failed');
   }
  })();
  return startPromise;
 }
 function stop(){
  stopped=true;if(state!=='stopped'&&state!=='cleanup-failed')state='stopping';
  if(!stopPromise)stopPromise=(async()=>{try{if(startPromise)await startPromise;}catch{}await close();})();
  return stopPromise;
 }
 return Object.freeze({enabled:true,operationalReady:false,get state(){return state;},get ready(){return ready();},start,stop,
  async handle(i){
   try{
    if(!ready()||typeof i?.customId!=='string'||!['nmi:','nmr:'].some(p=>i.customId.startsWith(p))||
     i.guildId!==profile.staging.guildId||i.channelId!==profile.staging.entryChannelId||i.user?.id!==profile.staging.operatorId||i.user?.bot===true)return false;
    return await session.handle(i)===true;
   }catch{return false;}
  }
 });
}
