import {randomUUID} from 'node:crypto';
import {discordId,operationId} from './formal-review-policy.mjs';
export function formalReviewAdministratorEntryControl(){return Object.freeze({type:2,style:2,custom_id:'frr:entry',label:'Open learner reports'});}
export function createFormalReviewAdministratorEntry(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,channelId,applicationId,botId,delegate,verifyAdministrator,isReady,now=Date.now,sessionMs=300000}=options;
 if(![guildId,channelId,applicationId,botId].every(discordId)||delegate?.enabled!==true||!['handle','dispose','drain'].every(k=>typeof delegate[k]==='function')||![verifyAdministrator,isReady,now].every(f=>typeof f==='function')||!Number.isSafeInteger(sessionMs)||sessionMs<20||sessionMs>300000)throw Error('Administrator report entry unavailable');
 let stopped=false;const sessions=new Map(),active=new Set(),ids=new Set();
 function remove(token){const value=sessions.get(token);if(value)clearTimeout(value.timer);sessions.delete(token);}
 function context(i){if(stopped||isReady()!==true||i.inGuild?.()!==true||i.guildId!==guildId||i.applicationId!==applicationId||i.channelId!==channelId||i.channel?.id!==channelId||i.channel.guildId!==guildId||i.channel.type!==0||!discordId(i.user?.id)||i.user.id===botId||i.user.bot===true||i.user.system===true)throw Error();return i.user.id;}
 async function authorize(i,actor){const id=context(i);if(actor!==undefined&&id!==actor)throw Error();if(await verifyAdministrator(id)!==true||context(i)!==id)throw Error();return id;}
 function handle(i){
  const id=i?.customId,own=id==='frr:entry'||typeof id==='string'&&id.startsWith('frr:entry-form:');
  if(stopped)return Promise.resolve(own);if(!own)return delegate.handle(i);
  if(i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=8)return Promise.resolve(true);
  const interactionId=i.id;ids.add(interactionId);
  const task=(async()=>{let pending=null;try{
   const actor=await authorize(i),stamp=now();if(!Number.isSafeInteger(stamp)||stamp<0)throw Error();for(const [key,value] of sessions)if(stamp>=value.expires)remove(key);
   if(id==='frr:entry'){
    if(i.isButton?.()!==true||i.message?.author?.id!==botId||typeof i.showModal!=='function'||sessions.size>=100)throw Error();
    const origin=i.message.interactionMetadata?.user?.id||i.message.interaction?.user?.id;if(i.message.flags?.has?.(64)===true&&origin&&origin!==actor)throw Error();
    const token=randomUUID(),expires=stamp+sessionMs;pending=token;const value={actor,expires};sessions.set(token,value);value.timer=setTimeout(()=>remove(token),sessionMs);value.timer.unref?.();
    await authorize(i,actor);await i.showModal({custom_id:'frr:entry-form:'+token,title:'Open learner reports',components:[{type:1,components:[{type:4,custom_id:'learner_id',label:'Learner Discord user ID',style:1,required:true,min_length:17,max_length:20}]}]});pending=null;
   }else{
    const token=id.slice('frr:entry-form:'.length),value=sessions.get(token);if(i.isModalSubmit?.()!==true||!operationId(token)||!value||value.actor!==actor||stamp>=value.expires||i.fields?.fields?.size!==1||!i.fields.fields.has('learner_id'))throw Error();
    const raw=i.fields.getTextInputValue('learner_id'),learnerId=typeof raw==='string'?raw.trim():'';if(!discordId(learnerId)||[actor,botId].includes(learnerId))throw Error();remove(token);
    await i.deferReply({flags:64});await authorize(i,actor);if(i.ephemeral!==true)throw Error();
    await i.editReply({content:'Open the selected learner’s currently accessible reports. Eligibility and report authority are checked again when opened. This does not grant enrollment, lab access, grading or certificate authority.',embeds:[],components:[{type:1,components:[{type:2,style:2,custom_id:'frr:list:'+learnerId+':0',label:'Saved learner reports'}]}],allowedMentions:{parse:[]}});
   }
  }catch{if(pending)remove(pending);if(!stopped)try{const payload={content:'Administrator report entry unavailable or expired. Open a fresh report entry.',embeds:[],components:[],allowedMentions:{parse:[]}};if(i.deferred&&i.ephemeral===true)await i.editReply(payload);else if(!i.deferred&&!i.replied)await i.reply({...payload,flags:64});}catch{}}return true;})();
  active.add(task);void task.then(()=>{active.delete(task);ids.delete(interactionId);},()=>{active.delete(task);ids.delete(interactionId);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){if(stopped)return;stopped=true;for(const key of sessions.keys())remove(key);delegate.dispose();},async drain(){await Promise.allSettled([...active,Promise.resolve().then(()=>delegate.drain())]);}});
}
