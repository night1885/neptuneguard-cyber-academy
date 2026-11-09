import {discordId,operationId,boundedReviewText,reviewClock} from './formal-review-policy.mjs';
import {createFormalReviewSavedInteractions} from './formal-review-saved-interactions.mjs';
const fail=()=>{throw Error('Formal interaction unavailable');};
const escape=x=>x.replace(/[\\`*_~|<>@\[\]()]/g,c=>'\\'+c);
const button=(id,label,style=2)=>({type:2,custom_id:id,label,style});
const row=(...components)=>({type:1,components});
const payload=(content,components=[],embeds=[])=>({content,components,embeds,allowedMentions:{parse:[]}});
const retry=id=>[row(button('frv:confirm:'+id,'Recheck same submission'))];
const uncertain='Submission outcome is unconfirmed; a write may already exist. Recheck this same confirmation while it remains valid. Do not start another submission to work around a response failure.';
export function createFormalReviewInteractions(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,botId,applicationId,intake,isReady,now=Date.now,core}=options;
 if(![guildId,botId,applicationId].every(discordId)||intake?.enabled!==true||!['preview','confirm','cancel'].every(k=>typeof intake[k]==='function')||typeof isReady!=='function'||typeof now!=='function')fail();
 const saved=createFormalReviewSavedInteractions(core===undefined?{}:{enabled:true,guildId,botId,applicationId,core,isReady,now});
 let stopped=false;const active=new Set(),ids=new Set();
 function context(i){if(i.inGuild?.()!==true||i.applicationId!==applicationId||i.guildId!==guildId||!discordId(i.user?.id)||i.user.bot===true||i.user.system===true||!discordId(i.channelId)||i.channel?.id!==i.channelId||i.channel.guildId!==guildId||i.channel.type!==0||i.message?.author?.id!==botId||i.message.flags?.has?.(64)!==true)fail();return Object.freeze({actorId:i.user.id,guildId,channelId:i.channelId});}
 function handle(i){
  const customId=i?.customId;if(typeof customId!=='string'||!customId.startsWith('frv:'))return Promise.resolve(false);
  if(stopped||i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);
  ids.add(i.id);
  const task=(async()=>{let acknowledged=false,pendingPreview=null,phase='',token=null,recorded=false,c;
   const guard=()=>{if(stopped||isReady()!==true)fail();const fresh=context(i);if(c&&(fresh.actorId!==c.actorId||fresh.channelId!==c.channelId))fail();};
   const send=async value=>{guard();await i.editReply({...value,allowedMentions:{parse:[]}});};
   const errorReply=async value=>{if(stopped)return;if(acknowledged||i.deferred)await i.editReply({...value,allowedMentions:{parse:[]}});else if(!i.replied)await i.reply({...value,flags:64,allowedMentions:{parse:[]}});};
   try{
    c=context(i);guard();
    if(/^frv:(report|feedback):/.test(customId)){if(!saved.enabled)fail();return await saved.handle(i);}
    const match=/^frv:(start|choose|preview|confirm|cancel):([a-f0-9-]{36})$/.exec(customId);if(!match||!operationId(match[2]))fail();phase=match[1];token=match[2];
    if((phase==='preview'?i.isModalSubmit?.()!==true:i.isButton?.()!==true))fail();
    if(phase==='choose'){
     const field=(id,label,min,max,placeholder)=>row({type:4,custom_id:id,label,style:1,min_length:min,max_length:max,required:true,placeholder});
     guard();await i.showModal({custom_id:'frv:preview:'+token,title:'Read source; no submission yet',components:[field('source_message_id','Message ID in this private work channel',17,20,'Only your selected message in this channel'),field('consent','Read selected message: type PREVIEW',7,7,'PREVIEW')]});return true;
    }
    let messageId;
    if(phase==='preview'){
     if(i.fields?.fields?.size!==2||!i.fields.fields.has('source_message_id')||!i.fields.fields.has('consent'))fail();messageId=i.fields.getTextInputValue('source_message_id');if(!discordId(messageId)||i.fields.getTextInputValue('consent')!=='PREVIEW')fail();
    }
    await i.deferReply({flags:64});acknowledged=true;guard();
    if(phase==='start'){
     await send(payload('Select one of your plain-text messages in this private work channel. Preview retrieves it but does not submit it. Confirm stores the exact report for reviewer access for 24 hours; access expiry is not deletion. Do not include personal or sensitive data. Review is not grading, practical authorization or certificate issuance.',[row(button('frv:choose:'+token,'Select message for preview',1))]));
    }else if(phase==='preview'){
     const v=await intake.preview(c,{workId:token,sourceMessageId:messageId,consent:true});if(v?.ok!==true||!operationId(v.previewId)||!boundedReviewText(v.body)||reviewClock(now())>=reviewClock(v.expiresAtMs))fail();pendingPreview=v.previewId;
     const description=escape(v.body);if(description.length>4096)fail();await send(payload('Preview only: nothing has been submitted by this preview. Confirm submits the exact fetched text. Confirmation expires '+new Date(v.expiresAtMs).toISOString()+'.',[row(button('frv:confirm:'+v.previewId,'Confirm submission',1),button('frv:cancel:'+v.previewId,'Cancel preview'))],[{title:'Report text (untrusted; Markdown escaped)',description}]));pendingPreview=null;
    }else if(phase==='cancel'){
     const result=await intake.cancel(c,{previewId:token});await send(payload(result?.ok===true&&result.cancelledPreview===true?'Unattempted preview canceled. This cancellation does not withdraw or roll back any submitted report.':'Preview cancellation unavailable. A confirmation may have been attempted; inspect the same submission instead of assuming rollback.'));
    }else{
     const result=await intake.confirm(c,{previewId:token});if(result?.ok!==true){await send(payload(uncertain,retry(token)));return true;}
     if(!operationId(result.reportId)||!Number.isSafeInteger(result.revision)||result.revision<1||reviewClock(now())>=reviewClock(result.expiresAtMs))fail();recorded=true;
     const controls=retry(token);
     if(saved.enabled){if(!operationId(result.workId))fail();controls.push(row(button('frv:report:'+result.workId+':'+result.reportId,'Read saved report'),button('frv:feedback:'+result.workId+':'+result.reportId,'Read feedback')));}
     await send(payload('Report submission recorded. Report ID: '+result.reportId+'. Revision: '+result.revision+'. Access expires '+new Date(result.expiresAtMs).toISOString()+'. This is not grading, practical authorization or certificate issuance.',controls));
    }
   }catch{
    if(pendingPreview&&c)try{await intake.cancel(c,{previewId:pendingPreview});}catch{}
    const text=phase==='confirm'?(recorded?'The service returned a recorded submission, but delivery is unconfirmed. Recheck this same receipt; do not create a new submission.':uncertain):'Review controls unavailable or expired. Use a current private report control.';
    try{await errorReply(payload(text,phase==='confirm'&&operationId(token)?retry(token):[]));}catch{}
   }
   return true;
  })();
  active.add(task);void task.then(()=>{active.delete(task);ids.delete(i.id);},()=>{active.delete(task);ids.delete(i.id);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){stopped=true;saved.dispose();},async drain(){await Promise.allSettled([...active]);await saved.drain();}});
}
