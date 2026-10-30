import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
import {createFictionalStagingResourceOwner} from './fictional-intake-staging-resource-owner.mjs';
import {createFictionalIntakeStagingSession} from './fictional-intake-staging-session.mjs';
import {createFictionalIntakeStagingLifecycle} from './fictional-intake-staging-lifecycle.mjs';
import {createNoModalIntakeCoordinator} from '../synthetic-workspace/no-modal-intake.mjs';
import {createFictionalStagingSourceReader} from './fictional-intake-staging-source-reader.mjs';
import {createStagingStorage} from './staging-storage.mjs';
import {createStagingChannels} from './staging-channels.mjs';
import {createStagingRetention} from './staging-retention.mjs';
const unavailable=()=>Error('Fictional staging pilot unavailable');
export function createStagingPilot(manifest={},options={}){
 const inspected=inspectFictionalIntakeStagingProfile(manifest.profile??{});
 if(!inspected.ok)throw unavailable();
 if(!inspected.enabled)return Object.freeze({enabled:false,operationalReady:false,start:async()=>false,stop:async()=>{}});
 const {profile}=inspected,{scope,recordId,reviewerId,expectedRole,entryMessageId}=manifest;
 if(!/^[0-9]{17,20}$/.test(entryMessageId??''))throw unavailable();
 let resources,timer,closed=false,fatal=false,started=false,coordinator,reader,listener;const now=options.now??Date.now;
 const operationTimeoutMs=options.operationTimeoutMs??5000,pollIntervalMs=options.pollIntervalMs??1000,cleanupTimeoutMs=options.cleanupTimeoutMs??5000;
 if(typeof now!=='function'||![operationTimeoutMs,cleanupTimeoutMs,pollIntervalMs].every(n=>Number.isInteger(n)&&n>=10&&n<=60000))throw unavailable();
 async function bounded(work,ms,message){let t;try{return await Promise.race([work,new Promise((_,reject)=>{t=setTimeout(()=>reject(Error(message)),ms);})]);}finally{clearTimeout(t);}}
 const owner=createFictionalStagingResourceOwner(manifest.profile,{expectedRole,readCredentials:options.readCredentials??(async()=>{const env=process.env;if(env.FICTIONAL_STAGE_RUN!=='true')throw unavailable();return {discordToken:env.FICTIONAL_STAGE_TOKEN,databasePassword:env.FICTIONAL_STAGE_DB_PASSWORD,databaseCa:env.FICTIONAL_STAGE_DB_CA};}),
  loadPostgres:options.loadPostgres,loadDiscord:options.loadDiscord??(async()=>{const sdk=await import('discord.js');return {...sdk,Client:class extends sdk.Client{constructor(o){super({...o,intents:[...o.intents,sdk.GatewayIntentBits.GuildMembers],makeCache:sdk.Options.cacheWithLimits({MessageManager:0})});}}};})});
 const transportReady=()=>!closed&&owner.isReady()&&store.ready;
 const store=createStagingStorage({profile,scope,recordId,reviewerId,expectedRole,getResources:()=>resources});
 const channels=createStagingChannels({profile,reviewerId,store,getResources:()=>resources,isReady:transportReady,now});
 const retention=createStagingRetention({store,channels,now,operationTimeoutMs,onUnhealthy:()=>{fatal=true;}});
 const unsupported=async()=>{throw unavailable();};
 reader=createFictionalStagingSourceReader(manifest.profile,{getClient:()=>resources?.client,isReady:()=>transportReady()&&!fatal&&retention.admissionReady,resolve:store.resolve,authorize:store.authorize,journalRead:store.journalRead,verifyPrivate:channels.verifyPrivate,now});
 coordinator=createNoModalIntakeCoordinator({enabled:true,mode:'detached-rehearsal',guildId:profile.staging.guildId,productionGuildId:profile.production.guildId,ownerId:reviewerId,courseKey:scope.courseKey,policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:1000},
  {...store,...channels,latest:reader.latest,exact:reader.exact,now,readReport:unsupported,publishTrackedReview:unsupported,review:unsupported,claimDraft:unsupported,deleteDraft:unsupported,finishDraft:unsupported});
 const lifecycle=createFictionalIntakeStagingLifecycle(manifest.profile,{createSession:()=>createFictionalIntakeStagingSession(manifest.profile,scope,{coordinator,storage:store,now,expectedRole,isReady:()=>transportReady()&&!fatal&&retention.admissionReady,cancelStartup:owner.cancelStartup,
  async startResources(p){resources=await owner.startResources(p);await store.initialize();await channels.auditGuild();const r=await retention.pass();if(!r.complete)throw unavailable();return resources;},
  async verifyIsolation(){if(!store.ready||await channels.auditGuild()!==true)return false;const ctx={actorId:profile.staging.operatorId,guildId:profile.staging.guildId,action:'prepare'},b={...await store.resolve(ctx),...ctx},j=await store.journalRead(b);return j===null||j?.state==='available'&&await channels.verifyPrivate(b,j.channelId)===true;},
  closeResources:cleanup})});
 let stopPromise,cleanupPromise;
 function cleanup(){
  if(!cleanupPromise)cleanupPromise=(async()=>{const stopRetention=retention.stop();reader.dispose();coordinator.dispose();channels.dispose();store.dispose();
   const outcomes=await bounded(Promise.allSettled([stopRetention,owner.closeResources()]),cleanupTimeoutMs,'Staging cleanup requires attention');
   if(outcomes.some(r=>r.status==='rejected'))throw Error('Staging cleanup requires attention');})();
  return cleanupPromise;
 }
 function stop(){closed=true;fatal=true;started=false;clearTimeout(timer);if(listener)resources?.client.removeListener('interactionCreate',listener);owner.cancelStartup();
  if(!stopPromise)stopPromise=(async()=>{const outcomes=await bounded(Promise.allSettled([lifecycle.stop(),cleanup()]),cleanupTimeoutMs,'Staging cleanup requires attention');if(outcomes.some(r=>r.status==='rejected'))throw Error('Staging cleanup requires attention');})();return stopPromise;
 }
 function scheduleRetention(){if(closed||retention.failed)return;timer=setTimeout(()=>{void retention.pass().then(r=>{if(!r.complete)fatal=true;},()=>{fatal=true;}).finally(()=>{if(!closed&&!retention.failed)scheduleRetention();});},pollIntervalMs);timer.unref?.();}
 return Object.freeze({enabled:true,operationalReady:false,get ready(){return started&&!fatal&&!closed&&lifecycle.ready;},
  async start(){try{if(closed)return false;if(await lifecycle.start()!==true||closed)return false;await bounded((async()=>{
    const g=await resources.client.guilds.fetch({guild:profile.staging.guildId,force:true});if(closed||fatal)throw unavailable();
    const channel=await g.channels.fetch(profile.staging.entryChannelId,{force:true,cache:false});if(closed||fatal||channel?.guildId!==profile.staging.guildId)throw unavailable();
    const m=await channel.messages.fetch({message:entryMessageId,force:true,cache:false});if(closed||fatal)throw unavailable();
    const ids=m.components?.flatMap(r=>r.components.map(b=>b.customId));if(m.author?.id!==profile.staging.botId||!ids?.includes('nmi:prepare')||!ids.includes('nmr:list'))throw unavailable();
   })(),operationTimeoutMs,'Staging entry validation outcome unknown');
   listener=i=>{if(typeof i?.customId!=='string'||!['nmi:','nmr:'].some(p=>i.customId.startsWith(p)))return;void lifecycle.handle(i).then(async handled=>{if(!handled&&!i.deferred&&!i.replied)await i.reply({content:'Fictional intake is unavailable.',flags:64,allowedMentions:{parse:[]}});}).catch(()=>{fatal=true;});};
   if(closed||fatal)throw unavailable();resources.client.on('interactionCreate',listener);started=true;scheduleRetention();return true;
  }catch{await stop();throw unavailable();}},stop});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let pilot;try{const file=process.argv[2];if(!file){console.log('Fictional staging pilot disabled');}else{const manifest=JSON.parse(await readFile(file,'utf8'));pilot=createStagingPilot(manifest);if(pilot.enabled){if(process.env.FICTIONAL_STAGE_RUN!=='true')throw unavailable();await pilot.start();console.log('Fictional staging pilot started; operational readiness not certified');}else console.log('Fictional staging pilot disabled');}}
 catch{console.error('Fictional staging pilot failed; inspect approved deployment diagnostics');process.exitCode=1;}
 for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{void pilot?.stop().catch(()=>{console.error('Staging cleanup requires attention');process.exitCode=1;});});
}
