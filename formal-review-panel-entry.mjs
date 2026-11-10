import {discordId,exactFields} from './formal-review-policy.mjs';
const empty=Object.freeze([]);
export function createFormalReviewPanelEntry(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,learner:()=>empty});
 const {guildId,ownerId,applicationId,botId,isReady}=options;
 if(![guildId,ownerId,applicationId,botId].every(discordId)||ownerId===botId||typeof isReady!=='function')throw Error('Private report entry unavailable');
 function learner(i,proof){try{
  if(isReady()!==true||!exactFields(proof,['studentId'])||typeof proof.studentId!=='string'||!proof.studentId.trim()||proof.studentId.length>100||i.inGuild?.()!==true||i.guildId!==guildId||i.applicationId!==applicationId||i.isButton?.()!==true||!discordId(i.user?.id)||[ownerId,botId].includes(i.user.id)||i.user.bot===true||i.user.system===true||!discordId(i.channelId)||i.channel?.id!==i.channelId||i.channel.guildId!==guildId||i.channel.type!==0||i.message?.author?.id!==botId||(i.deferred!==true&&i.replied!==true))return empty;
  const origin=i.message?.interactionMetadata?.user?.id||i.message?.interaction?.user?.id;
  if(origin&&origin!==i.user.id)return empty;
  if(i.ephemeral!==true&&i.message.flags?.has?.(64)!==true)return empty;
  return Object.freeze([Object.freeze({type:1,components:Object.freeze([Object.freeze({type:2,style:2,custom_id:'frv:list:'+i.user.id+':0',label:'Saved formal reports'})])})]);
 }catch{return empty;}}
 return Object.freeze({enabled:true,learner});
}
