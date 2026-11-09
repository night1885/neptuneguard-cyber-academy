import {discordId,operationId,boundedReviewText,reviewClock} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal owner controls unavailable');};
const escape=x=>x.replace(/[\\`*_~|<>@\[\]()]/g,c=>'\\'+c);
const row=(...components)=>({type:1,components}),button=(custom_id,label,style=2)=>({type:2,custom_id,label,style});
const message=(content,components=[],embeds=[])=>({content,components,embeds,allowedMentions:{parse:[]}});
const embedded=(title,text)=>{if(!boundedReviewText(text))fail();const description=escape(text);if(description.length>4096)fail();return {title,description};};
const retry=id=>[row(button('frr:confirm:'+id,'Recheck same review'))];
const uncertain='Review outcome is unconfirmed; a write may already exist. Recheck this same confirmation while valid, not a newly prepared review.';
export function createFormalReviewOwnerInteractions(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,handle:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,channelId,applicationId,botId,flow,isReady,now=Date.now}=options;
 if(![guildId,ownerId,channelId,applicationId,botId].every(discordId)||flow?.enabled!==true||!['read','open','canPrepare','prepare','confirm','cancel'].every(k=>typeof flow[k]==='function')||typeof isReady!=='function'||typeof now!=='function')fail();
 let stopped=false;const active=new Set(),ids=new Set();
 function context(i){if(i.inGuild?.()!==true||i.applicationId!==applicationId||i.guildId!==guildId||i.user?.id!==ownerId||i.user.bot===true||i.user.system===true||i.channelId!==channelId||i.channel?.id!==channelId||i.channel.guildId!==guildId||i.channel.type!==0||i.message?.author?.id!==botId||i.message.flags?.has?.(64)!==true)fail();return Object.freeze({actorId:ownerId,guildId,channelId});}
 function handle(i){const id=i?.customId;if(typeof id!=='string'||!id.startsWith('frr:'))return Promise.resolve(false);if(stopped||i.deferred||i.replied||!discordId(i.id)||ids.has(i.id)||active.size>=4)return Promise.resolve(true);ids.add(i.id);
  const task=(async()=>{let c,phase='',token=null,pending=null,acknowledged=false,recorded=false,inPlace=false;
   const guard=()=>{if(stopped||isReady()!==true||(acknowledged&&!inPlace&&i.ephemeral!==true))fail();context(i);};
   const send=async p=>{guard();await i.editReply({...p,allowedMentions:{parse:[]}});};
   try{c=context(i);guard();const parts=id.split(':');phase=parts[1];
    const paired=['open','feedback'].includes(phase),choose=['choose','form'].includes(phase);
    if(paired){if(parts.length!==4||!operationId(parts[2])||!operationId(parts[3]))fail();}
    else if(choose){if(parts.length!==4||!['changes-requested','review-recorded'].includes(parts[2])||!operationId(parts[3]))fail();token=parts[3];}
    else if(['confirm','cancel'].includes(phase)){if(parts.length!==3||!operationId(parts[2]))fail();token=parts[2];}else fail();
    if(phase==='form'?i.isModalSubmit?.()!==true:i.isButton?.()!==true)fail();
    if(phase==='choose'){
     if(flow.canPrepare(c,{reviewToken:token,decision:parts[2]})?.ok!==true)fail();const field=(custom_id,label,style,max_length)=>row({type:4,custom_id,label,style,required:true,min_length:1,max_length});guard();
     await i.showModal({custom_id:'frr:form:'+parts[2]+':'+token,title:parts[2]==='changes-requested'?'Request report changes':'Record report review',components:[field('feedback','Feedback: up to 2,000 Unicode characters',2,4000),field('ack','Type REVIEWED after inspecting the report',1,8)]});return true;
    }
    let feedback,ack;if(phase==='form'){if(i.fields?.fields?.size!==2||!i.fields.fields.has('feedback')||!i.fields.fields.has('ack'))fail();feedback=i.fields.getTextInputValue('feedback');ack=i.fields.getTextInputValue('ack');if(ack!=='REVIEWED'||!boundedReviewText(feedback))fail();}
    inPlace=paired&&typeof i.deferUpdate==='function';if(inPlace)await i.deferUpdate();else await i.deferReply({flags:64});acknowledged=true;guard();
    if(paired){const request={workId:parts[2],reportId:parts[3]},v=await flow[phase==='open'?'open':'read'](c,request);if(v?.ok!==true||v.reportId!==request.reportId||reviewClock(now())>=reviewClock(v.expiresAtMs))fail();
     if(phase==='feedback'){if(!v.review)fail();await send(message('Recorded feedback: '+v.review.decision+'. Original report access deadline: '+new Date(v.expiresAtMs).toISOString()+'.',inPlace?[row(button('frr:open:'+request.workId+':'+request.reportId,'Read saved report'))]:[],[embedded('Recorded feedback (untrusted text)',v.review.feedback)]));}
     else{const controls=[];if(v.reviewToken!==null){if(!operationId(v.reviewToken))fail();pending=v.reviewToken;controls.push(row(button('frr:choose:changes-requested:'+v.reviewToken,'Request changes'),button('frr:choose:review-recorded:'+v.reviewToken,'Record review',1),button('frr:cancel:'+v.reviewToken,'Cancel')));}else if(v.review)controls.push(row(button('frr:feedback:'+request.workId+':'+request.reportId,'Read recorded feedback')));
      await send(message('Report revision '+v.revision+'. Access expires '+new Date(v.expiresAtMs).toISOString()+'. '+(v.review?'This revision already has immutable feedback.':'Choose feedback, then explicitly confirm. No grading or certificate is issued.'),controls,[embedded('Report text (untrusted; Markdown escaped)',v.body)]));pending=null;}
    }else if(phase==='form'){const v=await flow.prepare(c,{reviewToken:token,decision:parts[2],feedback,ack});if(v?.ok!==true||v.reviewToken!==token||v.decision!==parts[2]||v.feedback!==feedback||reviewClock(now())>=reviewClock(v.expiresAtMs))fail();pending=token;
     await send(message('Confirm '+v.decision+' for report revision '+v.expectedRevision+'. This records feedback only; it does not grant practical authorization, course completion, a grade or a certificate. The original report deadline is preserved. Confirmation expires '+new Date(v.expiresAtMs).toISOString()+'.',[row(button('frr:confirm:'+token,'Confirm review',1),button('frr:cancel:'+token,'Cancel confirmation'))],[embedded('Feedback to record (Markdown escaped)',v.feedback)]));pending=null;
    }else if(phase==='cancel'){const v=await flow.cancel(c,{reviewToken:token});await send(message(v?.ok===true&&v.cancelledConfirmation===true?'Unattempted review confirmation canceled. No submitted report or recorded review was withdrawn.':'Cancellation unavailable; do not assume rollback after a confirmation attempt.'));}
    else{const v=await flow.confirm(c,{reviewToken:token});if(v?.ok!==true){await send(message(uncertain,retry(token)));return true;}if(!operationId(v.reportId)||!Number.isSafeInteger(v.revision)||v.revision<1||reviewClock(now())>=reviewClock(v.expiresAtMs))fail();recorded=true;await send(message('Review operation recorded. Report ID: '+v.reportId+'. Work revision: '+v.revision+'. Original report access deadline remains '+new Date(v.expiresAtMs).toISOString()+'. No grade or certificate was issued.',retry(token)));}
   }catch{if(pending&&c)try{await flow.cancel(c,{reviewToken:pending});}catch{}
    if(!stopped)try{const p=message(phase==='confirm'?(recorded?'The service returned a recorded review, but delivery is unconfirmed. Recheck this same receipt; do not prepare another review.':uncertain):'Owner review unavailable or expired. Open a current private report control.',phase==='confirm'&&operationId(token)?retry(token):[]);if(acknowledged||i.deferred)await i.editReply(p);else if(!i.replied)await i.reply({...p,flags:64});}catch{}
   }return true;
  })();active.add(task);void task.then(()=>{active.delete(task);ids.delete(i.id);},()=>{active.delete(task);ids.delete(i.id);});return task;
 }
 return Object.freeze({enabled:true,handle,dispose(){stopped=true;},async drain(){await Promise.allSettled([...active]);}});
}
