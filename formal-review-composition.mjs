import {discordId} from './formal-review-policy.mjs';
import {createFormalReviewCore} from './formal-review-core.mjs';
import {createFormalReviewIntake} from './formal-review-intake.mjs';
import {createFormalReviewInteractions} from './formal-review-interactions.mjs';
import {createFormalReviewBrowser} from './formal-review-browser.mjs';
import {createFormalReviewDiscovery} from './formal-review-discovery.mjs';
import {createFormalReviewOwnerFlow} from './formal-review-owner-flow.mjs';
import {createFormalReviewOwnerInteractions} from './formal-review-owner-interactions.mjs';
import {createFormalReviewOwnerBrowser} from './formal-review-owner-browser.mjs';
import {createFormalReviewRuntimeBridge} from './formal-review-runtime-bridge.mjs';
const fail=()=>{throw Error('Formal review composition unavailable');};
export function createFormalReviewComposition(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,ready:false,initialize:async()=>false,attach:()=>false,handle:async()=>false,detach:async()=>({drained:true})});
 const {guildId,ownerId,reviewerChannelId,applicationId,botId,exerciseKeys,client,store,courseAuthorization,source,metadataPool,authorizeExercise,authorizeReviewer,isReady,verifyResources,now=Date.now,onDiagnostic=()=>{}}=options;
 const methods=(x,names)=>x?.enabled===true&&names.every(k=>typeof x[k]==='function');
 if(![guildId,ownerId,reviewerChannelId,applicationId,botId].every(discordId)||ownerId===botId||!['on','off'].every(k=>typeof client?.[k]==='function')||!methods(store,['initialize','transaction','dispose','drain'])||!methods(courseAuthorization,['initialize','authorizeCourse','dispose','drain'])||!methods(source,['readSource','dispose','drain'])||new Set([store,courseAuthorization,source]).size!==3||typeof metadataPool?.query!=='function'||![authorizeExercise,authorizeReviewer,isReady,verifyResources,now,onDiagnostic].every(f=>typeof f==='function'))fail();
 let stopped=false,up=false;const built=[];
 const ready=()=>{try{return !stopped&&up&&store.ready===true&&courseAuthorization.ready===true&&isReady()===true;}catch{return false;}};
 const add=x=>{built.push(x);return x;};
 try{
  const core=add(createFormalReviewCore({enabled:true,guildId,ownerId,courseKey:'ethical-hacking-reading',exerciseKeys},{transaction:f=>store.transaction(f),authorizeCourse:s=>courseAuthorization.authorizeCourse(s),authorizeExercise,authorizeReviewer,readSource:(s,id)=>source.readSource(s,id),now,isReady:ready}));
  const intake=add(createFormalReviewIntake({enabled:true,core,isReady:ready,now}));
  const learnerHandler=add(createFormalReviewInteractions({enabled:true,guildId,applicationId,botId,core,intake,isReady:ready,now}));
  const learnerDiscovery=add(createFormalReviewDiscovery({enabled:true,guildId,ownerId,readPool:metadataPool,core,isReady:ready,now}));
  const learner=add(createFormalReviewBrowser({enabled:true,guildId,applicationId,botId,learner:learnerHandler,discovery:learnerDiscovery,isReady:ready,now}));
  const flow=add(createFormalReviewOwnerFlow({enabled:true,guildId,ownerId,channelId:reviewerChannelId,core,isReady:ready,now}));
  const reviewerHandler=add(createFormalReviewOwnerInteractions({enabled:true,guildId,ownerId,channelId:reviewerChannelId,applicationId,botId,flow,isReady:ready,now}));
  const reviewerDiscovery=add(createFormalReviewDiscovery({enabled:true,guildId,ownerId,readPool:metadataPool,core,isReady:ready,now}));
  const reviewer=add(createFormalReviewOwnerBrowser({enabled:true,guildId,ownerId,channelId:reviewerChannelId,applicationId,botId,reviewer:reviewerHandler,discovery:reviewerDiscovery,isReady:ready,now}));
  function checkInitialization(){if(stopped||isReady()!==true)fail();}
  async function initializeResources(){up=false;checkInitialization();if(await verifyResources(Object.freeze({guildId,ownerId,reviewerChannelId,applicationId,botId}))!==true)fail();checkInitialization();if((await store.initialize())?.ready!==true||store.ready!==true)fail();checkInitialization();if((await courseAuthorization.initialize())?.ready!==true||courseAuthorization.ready!==true)fail();checkInitialization();up=true;if(!ready()){up=false;fail();}return true;}
  function stopResources(){if(stopped)return;stopped=true;up=false;let failed=false;for(const x of [source,core,intake,flow,courseAuthorization,store])try{x.dispose();}catch{failed=true;}if(failed)fail();}
  async function closeResources(){const results=await Promise.allSettled([source,courseAuthorization,store,intake,flow].map(x=>Promise.resolve().then(()=>x.drain())));if(results.some(r=>r.status==='rejected'))fail();}
  const bridge=createFormalReviewRuntimeBridge({enabled:true,client,guildId,applicationId,learner,reviewer,isReady:ready,initializeResources,stopResources,closeResources,onDiagnostic});
  return Object.freeze({enabled:true,get ready(){return bridge.ready;},async initialize(){try{return await bridge.initialize();}catch{up=false;fail();}},attach(){try{return bridge.attach();}catch{fail();}},handle:i=>bridge.handle(i),detach:()=>bridge.detach()});
 }catch{for(const x of built.reverse())try{x.dispose();}catch{}fail();}
}
