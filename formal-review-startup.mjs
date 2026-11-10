import {Events} from 'discord.js';
import {discordId} from './formal-review-policy.mjs';
import {loadCertificationConfig} from './certification-config.js';
import {createFormalDiscordSource} from './formal-review-discord-source.mjs';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
import {createFormalReviewPrivateCourseAuthorization} from './formal-review-private-course-authorization.mjs';
import {createFormalReviewComposition} from './formal-review-composition.mjs';
const fail=()=>{throw Error('Formal review startup unavailable');};
export function createFormalReviewStartupAttachment(options={}){
 if(options.enabled!==true)return undefined;
 const {guildId,ownerId,reviewerChannelId,applicationId,botId,createResources,fetchImpl=globalThis.fetch,now=Date.now,onDiagnostic=()=>{},pollMs=25,startupTimeoutMs=10000}=options;
 const exerciseKeys=Array.isArray(options.exerciseKeys)?Object.freeze([...options.exerciseKeys]):null;
 if(![guildId,ownerId,reviewerChannelId,applicationId,botId].every(discordId)||new Set([guildId,ownerId,botId]).size!==3||![createResources,fetchImpl,now,onDiagnostic].every(f=>typeof f==='function')||!exerciseKeys?.length||exerciseKeys.length>100||new Set(exerciseKeys).size!==exerciseKeys.length||!exerciseKeys.every(k=>typeof k==='string'&&/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(k))||!Number.isSafeInteger(pollMs)||pollMs<10||pollMs>1000||!Number.isSafeInteger(startupTimeoutMs)||startupTimeoutMs<100||startupTimeoutMs>30000)fail();
 let claimed=false;
 return function attachReview(client,actualGuild,env,lifecycle){
  if(claimed||actualGuild!==guildId||!['on','off','isReady'].every(k=>typeof client?.[k]==='function')||typeof lifecycle?.isCertificationReady!=='function'||typeof env?.DISCORD_TOKEN!=='string'||!/^[A-Za-z0-9._-]{20,256}$/.test(env.DISCORD_TOKEN))fail();
  const config=loadCertificationConfig(env);if(config.enabled!==true||config.ownerId!==ownerId||!config.activeAgreementVersion)fail();claimed=true;
  const token=env.DISCORD_TOKEN;let stopped=false,failed=false,started=false,initializing=null,closing=null,cleanupTask=null,timer=null,resources=null,source=null,course=null,gate=null,composition=null;
  const deadline=performance.now()+startupTimeoutMs;
  const diagnostic=event=>{try{onDiagnostic(Object.freeze({event}));}catch{}};
  const available=()=>{try{return !stopped&&!failed&&client.isReady()===true&&lifecycle.isCertificationReady()===true;}catch{return false;}};
  const remove=()=>{clearInterval(timer);timer=null;client.off(Events.ClientReady,wake);};
  function cleanup(){
   if(cleanupTask)return cleanupTask;
   cleanupTask=(async()=>{
    if(composition){if((await composition.detach())?.drained!==true)fail();}
    else{const owned=[source,gate??course,resources?.store].filter(Boolean),results=[];for(const x of owned){try{x.dispose();}catch{results.push({status:'rejected'});}}results.push(...await Promise.allSettled(owned.map(x=>Promise.resolve().then(()=>x.drain()))));if(results.some(r=>r.status==='rejected'))fail();}
    if(resources){if(typeof resources.closeResources!=='function')fail();await resources.closeResources();}
    return Object.freeze({drained:true});
   })();return cleanupTask;
  }
  function initialize(){
   if(stopped||failed)return Promise.resolve(false);if(initializing)return initializing;if(started)return Promise.resolve(available()&&composition?.ready===true);if(!available())return Promise.resolve(false);
   started=true;
   initializing=Promise.resolve().then(async()=>{try{
    if(!available())fail();
    resources=await createResources(Object.freeze({guildId,ownerId,reviewerChannelId,applicationId,botId,exerciseKeys,config,isReady:available}));
    if(!resources||typeof resources.closeResources!=='function'||!available()||!['verifyAdministrator','authorizeReviewer','authorizeExercise','verifyResources'].every(k=>typeof resources[k]==='function'))fail();
    source=createFormalDiscordSource({enabled:true,guildId,ownerId,botId,token,isReady:available,now,fetchImpl,privacyMode:'administrator-and-learner',verifyAdministrator:resources.verifyAdministrator});
    course=createFormalReviewCourseAuthorization({...resources.courseOptions,enabled:true,guildId,ownerId,config,isReady:available,reviewerMode:'current-administrator',authorizeReviewer:resources.authorizeReviewer});
    gate=createFormalReviewPrivateCourseAuthorization({enabled:true,courseAuthorization:course,source,isReady:available});
    composition=createFormalReviewComposition({enabled:true,guildId,ownerId,reviewerChannelId,applicationId,botId,exerciseKeys,client,store:resources.store,courseAuthorization:gate,source,metadataPool:resources.metadataPool,receiptPool:resources.receiptPool,recoveryEnabled:resources.recoveryEnabled===true,authorizeExercise:resources.authorizeExercise,authorizeReviewer:resources.authorizeReviewer,verifyAdministrator:resources.verifyAdministrator,reviewerMode:'current-administrator',verifyResources:resources.verifyResources,isReady:available,now,onDiagnostic});
    if(await composition.initialize()!==true||!available()||composition.ready!==true)fail();
    composition.attach();remove();return true;
   }catch{failed=true;try{remove();}catch{}diagnostic('formal_review_startup_failure');try{await cleanup();}catch{diagnostic('formal_review_startup_cleanup_failure');}return false;}finally{initializing=null;}});return initializing;
  }
  function detach(){
   if(closing)return closing;stopped=true;let removalFailed=false;try{remove();}catch{removalFailed=true;}
   const stop=composition?Promise.resolve().then(()=>composition.detach()):Promise.resolve();void stop.catch(()=>{});
   closing=(async()=>{const results=await Promise.allSettled([stop,...(initializing?[initializing]:[])]);const result=await cleanup();if(removalFailed||results.some(r=>r.status==='rejected'))fail();return result;})();return closing;
  }
  function wake(){if(stopped||failed)return;if(performance.now()>=deadline){failed=true;diagnostic('formal_review_startup_timeout');void detach().catch(()=>diagnostic('formal_review_startup_cleanup_failure'));return;}void initialize().catch(()=>diagnostic('formal_review_startup_failure'));}
  try{client.on(Events.ClientReady,wake);timer=setInterval(wake,pollMs);timer.unref?.();wake();}catch{void detach().catch(()=>diagnostic('formal_review_startup_cleanup_failure'));fail();}
  return Object.freeze({enabled:true,get ready(){return available()&&composition?.ready===true;},initialize,detach});
 };
}
