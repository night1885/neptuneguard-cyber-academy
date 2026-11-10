import {discordId,operationId,reviewClock} from './formal-review-policy.mjs';
const unavailable='Reviewer report browser unavailable or expired.';
const row=(...components)=>({type:1,components}),button=(custom_id,label)=>({type:2,custom_id,label,style:2});
export function createFormalReviewOwnerBrowser(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,channelId,applicationId,botId,reviewer,discovery,isReady,now=Date.now,reviewerMode='owner',verifyAdministrator}=options;
 if(!['owner','current-administrator'].includes(reviewerMode)||(reviewerMode==='current-administrator'&&typeof verifyAdministrator!=='function'))throw Error(unavailable);
 if(![guildId,ownerId,channelId,applicationId,botId].every(discordId)||![reviewer,discovery].every(x=>x?.enabled===true&&['dispose','drain'].every(k=>typeof x[k]==='function'))||typeof reviewer.handle!=='function'||typeof discovery.list!=='function'||typeof isReady!=='function'||typeof now!=='function')throw Error(unavailable);
 let stopped=false,last=-1;const active=new Set(),ids=new Set();
 function check(i){if(stopped||isReady()!==true||i.inGuild?.()!==true||i.guildId!==guildId||i.applicationId!==applicationId||!discordId(i.user?.id)||(reviewerMode==='owner'&&i.user.id!==ownerId)||i.user.bot===true||i.user.system===true||i.channelId!==channelId||i.channel?.id!==channelId||i.channel.guildId!==guildId||i.channel.type!==0||i.isButton?.()!==true||i.message?.author?.id!==botId||i.message.flags?.has?.(64)!==true)throw Error();const origin=i.message.interactionMetadata?.user?.id||i.message.interaction?.user?.id;if(origin&&origin!==i.user.id)throw Error();const stamp=reviewClock(now());if(stamp<last)throw Error();last=stamp;return stamp;}
 async function authorize(i){check(i);const actorId=i.user.id;if(reviewerMode==='current-administrator'&&await verifyAdministrator(actorId)!==true)throw Error();if(i.user.id!==actorId)throw Error();return check(i);}
 function handle(i){
  const customId=i?.customId;if(stopped)return Promise.resolve(typeof customId==='string'&&customId.startsWith('frr:'));
  if(typeof customId!=='string'||!customId.startsWith('frr:list:'))return reviewer.handle(i);
  if(i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);
  const interactionId=i.id;ids.add(interactionId);
  const task=Promise.resolve().then(async()=>{let acknowledged=false;try{
   await authorize(i);const actorId=i.user.id,match=/^frr:list:([0-9]{17,20}):([0-4])$/.exec(customId);if(!match||match[1]===actorId||typeof i.deferUpdate!=='function')throw Error();
   const learnerId=match[1],page=Number(match[2]);await i.deferUpdate();acknowledged=true;await authorize(i);if(i.user.id!==actorId)throw Error();
   const value=await discovery.list(Object.freeze({actorId,guildId}),Object.freeze({learnerId}));const stamp=await authorize(i);if(i.user.id!==actorId)throw Error();
   if(value?.ok!==true||!Array.isArray(value.reports)||value.reports.length>20)throw Error();const seen=new Set();
   const reports=value.reports.map(r=>{if(!operationId(r?.workId)||!operationId(r.reportId)||seen.has(r.reportId)||!Number.isSafeInteger(r.revision)||r.revision<1||stamp>=reviewClock(r.expiresAtMs)||![null,'changes-requested','review-recorded'].includes(r.reviewDecision))throw Error();seen.add(r.reportId);return Object.freeze({workId:r.workId,reportId:r.reportId,revision:r.revision,expiresAtMs:r.expiresAtMs});});
   const pages=Math.max(1,Math.ceil(reports.length/4)),selected=Math.min(page,pages-1),components=[];
   for(const [n,r] of reports.slice(selected*4,selected*4+4).entries())components.push(row(button('frr:open:'+r.workId+':'+r.reportId,'Report '+(selected*4+n+1)+' / revision '+r.revision),button('frr:feedback:'+r.workId+':'+r.reportId,'Read feedback')));
   const navigation=[button('frr:list:'+learnerId+':'+selected,'Refresh reports')];if(selected>0)navigation.unshift(button('frr:list:'+learnerId+':'+(selected-1),'Previous'));if(selected+1<pages)navigation.push(button('frr:list:'+learnerId+':'+(selected+1),'Next'));components.push(row(...navigation));
   const finalStamp=await authorize(i);if(i.user.id!==actorId||reports.some(r=>finalStamp>=r.expiresAtMs))throw Error();
   await i.editReply({content:(reports.length?'Current accessible reports for the selected learner. Page '+(selected+1)+' of '+pages+'.':'No current accessible reports were returned for the selected learner.')+' Discovery checks up to 20 recent unexpired candidates, not a complete archive. Opening a report rechecks authority. Access expiry is not deletion.',components,embeds:[],allowedMentions:{parse:[]}});
  }catch{if(!stopped)try{const p={content:unavailable,components:[],embeds:[],allowedMentions:{parse:[]}};if(acknowledged||i.deferred)await i.editReply(p);else if(!i.replied)await i.reply({...p,flags:64});}catch{}}return true;});
  active.add(task);void task.then(()=>{active.delete(task);ids.delete(interactionId);},()=>{active.delete(task);ids.delete(interactionId);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){if(stopped)return;stopped=true;try{reviewer.dispose();}finally{discovery.dispose();}},async drain(){await Promise.all([...active,Promise.resolve().then(()=>reviewer.drain()),Promise.resolve().then(()=>discovery.drain())]);}});
}
