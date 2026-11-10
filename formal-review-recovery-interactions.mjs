import {discordId,operationId,reviewClock} from './formal-review-policy.mjs';
const unavailable='Receipt inspection unavailable or unconfirmed. This is not proof of rollback or permission to repeat a submission or review.';
export function formalReviewRecoveryControl(mode,workId){
 if(!['learner','reviewer'].includes(mode)||!operationId(workId))throw Error('Recovery control unavailable');
 return Object.freeze({type:2,custom_id:(mode==='learner'?'frv':'frr')+':recover:'+workId,label:'Inspect latest recorded '+(mode==='learner'?'submission':'review'),style:2});
}
export function createFormalReviewRecoveryInteractions(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {mode,guildId,ownerId,channelId,applicationId,botId,recovery,delegate,isReady,now=Date.now}=options;
 if(!['learner','reviewer'].includes(mode)||![guildId,ownerId,applicationId,botId].every(discordId)||ownerId===botId||(mode==='reviewer'&&!discordId(channelId))||recovery?.enabled!==true||typeof recovery.inspectLatest!=='function'||delegate?.enabled!==true||!['handle','dispose','drain'].every(k=>typeof delegate[k]==='function')||typeof isReady!=='function'||typeof now!=='function')throw Error('Recovery controls unavailable');
 const prefix=mode==='learner'?'frv:':'frr:';let stopped=false,last=-1;const active=new Set(),ids=new Set();
 function origin(i){return i.inGuild?.()===true&&i.guildId===guildId&&i.applicationId===applicationId&&i.isButton?.()===true&&discordId(i.user?.id)&&i.user.bot!==true&&i.user.system!==true&&(mode==='reviewer'?i.user.id===ownerId:i.user.id!==ownerId)&&discordId(i.channelId)&&i.channel?.id===i.channelId&&i.channel.guildId===guildId&&i.channel.type===0&&(mode!=='reviewer'||i.channelId===channelId)&&i.message?.author?.id===botId&&i.message.flags?.has?.(64)===true;}
 function check(i,actorId){if(stopped||isReady()!==true||!origin(i)||(actorId!==undefined&&i.user.id!==actorId))throw Error();const stamp=reviewClock(now());if(stamp<last)throw Error();last=stamp;return stamp;}
 function handle(i){
  const id=i?.customId;if(stopped)return Promise.resolve(typeof id==='string'&&id.startsWith(prefix));
  if(typeof id!=='string'||!id.startsWith(prefix+'recover:'))return delegate.handle(i);
  if(i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);
  const interactionId=i.id;ids.add(interactionId);
  const task=Promise.resolve().then(async()=>{let acknowledged=false,actorId;
   try{
    check(i);const workId=id.slice((prefix+'recover:').length);if(!operationId(workId)||typeof i.deferUpdate!=='function')throw Error();actorId=i.user.id;
    await i.deferUpdate();acknowledged=true;check(i,actorId);
    const value=await recovery.inspectLatest(Object.freeze({actorId,guildId}),Object.freeze({workId}));
    const stamp=check(i,actorId);if(value?.ok!==true||value.kind!=='latest-recorded-operation'||value.workId!==workId||!operationId(value.reportId)||!operationId(value.operationId)||value.action!==(mode==='learner'?'submit':'review')||!Number.isSafeInteger(value.revision)||value.revision<1||stamp>=reviewClock(value.expiresAtMs))throw Error();
    const route=mode==='learner'?'frv:report:':'frr:open:',feedback=prefix+'feedback:',pair=workId+':'+value.reportId;
    const controls=[{type:1,components:[{type:2,custom_id:route+pair,label:'Read saved report',style:2},{type:2,custom_id:feedback+pair,label:'Read feedback',style:2},formalReviewRecoveryControl(mode,workId)]}];
    if(check(i,actorId)>=value.expiresAtMs)throw Error();
    await i.editReply({content:'Latest recorded '+(mode==='learner'?'submission':'review')+' for this work. Report ID: '+value.reportId+'. Operation revision: '+value.revision+'. Original access deadline: '+new Date(value.expiresAtMs).toISOString()+'. This does not establish the outcome of a particular lost confirmation. No write was retried. Access expiry is not deletion.',components:controls,embeds:[],allowedMentions:{parse:[]}});
   }catch{
    if(!stopped&&acknowledged)try{if(origin(i)&&i.user.id===actorId)await i.editReply({content:unavailable,components:[],embeds:[],allowedMentions:{parse:[]}});}catch{}
   }
   return true;
  });active.add(task);void task.then(()=>{active.delete(task);ids.delete(interactionId);},()=>{active.delete(task);ids.delete(interactionId);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){if(stopped)return;stopped=true;delegate.dispose();},async drain(){await Promise.all([...active,Promise.resolve().then(()=>delegate.drain())]);}});
}
