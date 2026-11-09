import {discordId,operationId,boundedReviewText,reviewClock} from './formal-review-policy.mjs';
const denied='Saved report unavailable or expired.';
const escape=x=>x.replace(/[\\`*_~|<>@\[\]()]/g,c=>'\\'+c);
export function createFormalReviewSavedInteractions(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,applicationId,botId,core,isReady,now=Date.now}=options;
 if(![guildId,applicationId,botId].every(discordId)||core?.enabled!==true||typeof core.read!=='function'||typeof isReady!=='function'||typeof now!=='function')throw Error(denied);
 let stopped=false,last=-1;const active=new Set(),ids=new Set();
 const check=i=>{if(stopped||isReady()!==true||i.inGuild?.()!==true||i.applicationId!==applicationId||i.guildId!==guildId||!discordId(i.user?.id)||i.user.bot===true||i.user.system===true||i.isButton?.()!==true||i.message?.author?.id!==botId||i.message.flags?.has?.(64)!==true)throw Error(denied);const stamp=reviewClock(now());if(stamp<last)throw Error(denied);last=stamp;return stamp;};
 function handle(i){
  if(typeof i?.customId!=='string'||!/^frv:(report|feedback):/.test(i.customId))return Promise.resolve(false);
  if(stopped||i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);
  ids.add(i.id);const task=Promise.resolve().then(async()=>{let acknowledged=false;
   try{
    check(i);const actorId=i.user.id,parts=i.customId.split(':');
    if(parts.length!==4||!operationId(parts[2])||!operationId(parts[3]))throw Error(denied);
    const request=Object.freeze({workId:parts[2],reportId:parts[3]});
    await i.deferReply({flags:64});acknowledged=true;check(i);if(i.ephemeral!==true||i.user.id!==actorId)throw Error(denied);
    const value=await core.read(Object.freeze({actorId,guildId}),request);
    if(value?.ok!==true||value.reportId!==request.reportId||!Number.isSafeInteger(value.revision)||value.revision<1||check(i)>=reviewClock(value.expiresAtMs)||i.ephemeral!==true||i.user.id!==actorId)throw Error(denied);
    const feedback=parts[1]==='feedback';
    if(feedback&&!['changes-requested','review-recorded'].includes(value.review?.decision))throw Error(denied);
    const text=feedback?value.review.feedback:value.body;if(!boundedReviewText(text))throw Error(denied);
    const description=escape(text);if(description.length>4096)throw Error(denied);
    if(check(i)>=value.expiresAtMs)throw Error(denied);
    await i.editReply({content:(feedback?'Recorded feedback: '+value.review.decision:'Saved report revision '+value.revision)+'. Original access deadline: '+new Date(value.expiresAtMs).toISOString()+'. Access expiry is not deletion.',components:[],embeds:[{title:feedback?'Recorded feedback (untrusted text)':'Saved report (untrusted text)',description}],allowedMentions:{parse:[]}});
   }catch{if(!stopped)try{const payload={content:denied,components:[],embeds:[],allowedMentions:{parse:[]}};if(acknowledged||i.deferred)await i.editReply(payload);else if(!i.replied)await i.reply({...payload,flags:64});}catch{}}
   return true;
  });active.add(task);void task.then(()=>{active.delete(task);ids.delete(i.id);},()=>{active.delete(task);ids.delete(i.id);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){stopped=true;},async drain(){await Promise.allSettled([...active]);}});
}
