import {discordId,operationId,reviewClock} from './formal-review-policy.mjs';
const unavailable='Saved report browser unavailable or expired.';
export function createFormalReviewBrowser(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,applicationId,botId,learner,discovery,isReady,now=Date.now}=options;
 if(![guildId,applicationId,botId].every(discordId)||learner?.enabled!==true||!['handle','dispose','drain'].every(k=>typeof learner[k]==='function')||discovery?.enabled!==true||!['list','dispose','drain'].every(k=>typeof discovery[k]==='function')||typeof isReady!=='function'||typeof now!=='function')throw Error(unavailable);
 let stopped=false,last=-1;const active=new Set(),ids=new Set();
 function check(i){if(stopped||isReady()!==true||i.inGuild?.()!==true||i.guildId!==guildId||i.applicationId!==applicationId||!discordId(i.user?.id)||i.user.bot===true||i.user.system===true||i.isButton?.()!==true||!discordId(i.channelId)||i.channel?.id!==i.channelId||i.channel.guildId!==guildId||i.channel.type!==0||i.message?.author?.id!==botId||i.message.flags?.has?.(64)!==true)throw Error();const stamp=reviewClock(now());if(stamp<last)throw Error();last=stamp;return stamp;}
 const button=(custom_id,label)=>({type:2,custom_id,label,style:2}),row=(...components)=>({type:1,components});
 function handle(i){
  if(stopped)return Promise.resolve(typeof i?.customId==='string'&&i.customId.startsWith('frv:'));
  if(typeof i?.customId!=='string'||!i.customId.startsWith('frv:list:'))return learner.handle(i);
  if(i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);
  ids.add(i.id);const task=Promise.resolve().then(async()=>{let acknowledged=false;
   try{
    check(i);const match=/^frv:list:([0-9]{17,20}):([0-4])$/.exec(i.customId);if(!match||match[1]!==i.user.id)throw Error();
    const actorId=i.user.id,page=Number(match[2]),inPlace=typeof i.deferUpdate==='function';
    if(inPlace)await i.deferUpdate();else await i.deferReply({flags:64});acknowledged=true;check(i);if(i.user.id!==actorId||(!inPlace&&i.ephemeral!==true))throw Error();
    const result=await discovery.list(Object.freeze({actorId,guildId}),Object.freeze({learnerId:actorId}));
    const stamp=check(i);if(i.user.id!==actorId||result?.ok!==true||!Array.isArray(result.reports)||result.reports.length>20)throw Error();
    const seen=new Set();for(const r of result.reports){if(!operationId(r.workId)||!operationId(r.reportId)||seen.has(r.reportId)||!Number.isSafeInteger(r.revision)||r.revision<1||stamp>=reviewClock(r.expiresAtMs))throw Error();seen.add(r.reportId);}
    const pages=Math.max(1,Math.ceil(result.reports.length/4)),selected=Math.min(page,pages-1),components=[];
    for(const [index,r] of result.reports.slice(selected*4,selected*4+4).entries())components.push(row(button('frv:report:'+r.workId+':'+r.reportId,'Report '+(selected*4+index+1)+' / revision '+r.revision),button('frv:feedback:'+r.workId+':'+r.reportId,'Read feedback')));
    const navigation=[button('frv:list:'+actorId+':'+selected,'Refresh reports')];if(selected>0)navigation.unshift(button('frv:list:'+actorId+':'+(selected-1),'Previous'));if(selected+1<pages)navigation.push(button('frv:list:'+actorId+':'+(selected+1),'Next'));components.push(row(...navigation));
    const finalStamp=check(i);if(result.reports.some(r=>finalStamp>=r.expiresAtMs))throw Error();
    await i.editReply({content:(result.reports.length?'Your current accessible reports. Page '+(selected+1)+' of '+pages+'.':'No current accessible reports were returned.')+' This browser checks up to the 20 most recent unexpired report candidates, not a complete archive. Opening a report rechecks authorization. Access expiry is not deletion.',components,embeds:[],allowedMentions:{parse:[]}});
   }catch{if(!stopped)try{const p={content:unavailable,components:[],embeds:[],allowedMentions:{parse:[]}};if(acknowledged||i.deferred)await i.editReply(p);else if(!i.replied)await i.reply({...p,flags:64});}catch{}}
   return true;
  });active.add(task);void task.then(()=>{active.delete(task);ids.delete(i.id);},()=>{active.delete(task);ids.delete(i.id);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){stopped=true;learner.dispose();discovery.dispose();},async drain(){await Promise.allSettled([...active]);await Promise.all([learner.drain(),discovery.drain()]);}});
}
