// Detached/default-off selector and modal boundary. No client, listener or root publisher.
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
export function createReviewModalBoundary(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({handle:async()=>false,entryPayload:()=>null,dispose(){}});
 const c=Object.freeze({...config,allowedReportIds:Object.freeze([...(config.allowedReportIds??[])])}),{input,responses,isReady,canBegin,now}=ports,budget=c.initialBudgetMs??1500,editBudget=c.editBudgetMs??2000;
 if(!['guildId','reviewerId','botId','applicationId','reviewChannelId','entryMessageId'].every(k=>snow(c[k]))||c.allowedReportIds.length<1||c.allowedReportIds.length>25||c.allowedReportIds.some(x=>!uuid(x))||new Set(c.allowedReportIds).size!==c.allowedReportIds.length||!['begin','accept','cancel'].every(k=>typeof input?.[k]==='function')||typeof responses?.defer!=='function'||![isReady,canBegin,now].every(f=>typeof f==='function')||!Number.isInteger(budget)||budget<20||budget>1800||!Number.isInteger(editBudget)||editBudget<10||editBudget>5000)throw Error('Explicit isolated modal providers required');
 const ctx=Object.freeze({actorId:c.reviewerId,guildId:c.guildId});let closed=false,busy=false,last=-1,pending=null;
 function clear(){if(pending)clearTimeout(pending.timer);pending=null;}
 function dispose(){closed=true;clear();try{input.cancel(ctx);}catch{}}
 function clock(){const t=now();if(!stamp(t)||t<last){dispose();throw Error();}last=t;return t;}
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw Error();return clock();}
 function scope(i){const at=guard();if(i.guildId!==c.guildId||i.channelId!==c.reviewChannelId||i.applicationId!==c.applicationId||i.user?.id!==c.reviewerId||i.user?.bot===true||!snow(i.id)||i.deferred||i.replied||!stamp(i.createdTimestamp)||i.createdTimestamp>at||at-i.createdTimestamp>=budget)throw Error();return i.createdTimestamp+budget;}
 async function bounded(work,ms,onLate){if(ms<=0)throw Error();let timer,timedOut=false;const p=Promise.resolve().then(work);p.then(value=>{if(timedOut&&onLate)Promise.resolve(onLate(value)).catch(()=>{});}).catch(()=>{});try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;dispose();reject(Error());},ms);})]);}finally{clearTimeout(timer);}}
 function entryPayload(){return {content:'Fictional reviewer input. Select a report under the intended decision, then enter feedback. This does not record a review.',embeds:[],allowedMentions:{parse:[]},components:['changes-requested','review-recorded'].map(decision=>({type:1,components:[{type:3,custom_id:`nrv:input:${decision}`,placeholder:decision==='changes-requested'?'Request changes for a report':'Record review for a report',min_values:1,max_values:1,options:c.allowedReportIds.map((id,index)=>({label:`Fictional report ${index+1}`,value:id}))}]}))};}
 async function retire(response){if(response&&typeof response.retire==='function')try{await bounded(()=>response.retire(),editBudget);}catch{}}
 async function handle(i){
  if(typeof i?.customId!=='string'||!/^nrv:(input:|feedback:)/.test(i.customId))return false;if(busy)return true;busy=true;let response=null,acceptedToken=false,openingStarted=false;
  try{
   const initialDeadline=scope(i),selection=/^nrv:input:(changes-requested|review-recorded)$/.exec(i.customId);
   if(selection){
    if(i.isStringSelectMenu?.()!==true||i.message?.author?.id!==c.botId||i.message?.id!==c.entryMessageId||!Array.isArray(i.values)||i.values.length!==1||!c.allowedReportIds.includes(i.values[0])||pending)throw Error();
    const admitted=canBegin(ctx);admitted?.catch?.(()=>{});if(admitted!==true)return true;
    openingStarted=true;const reportId=i.values[0],decision=selection[1];
    const begun=await bounded(()=>{guard();if(clock()>=initialDeadline)throw Error();return input.begin(ctx,Object.freeze({reportId,decision}));},initialDeadline-clock());guard();if(begun?.ok!==true)return true;if(!keys(begun,'ok,token,until')||!uuid(begun.token)||!stamp(begun.until)||begun.until<=clock())throw Error();
    const p={token:begun.token,until:begun.until,timer:null};p.timer=setTimeout(()=>{if(pending===p){clear();try{input.cancel(ctx);}catch{}}},Math.min(300000,p.until-clock()));p.timer.unref?.();pending=p;
    const modal={custom_id:`nrv:feedback:${p.token}`,title:decision==='changes-requested'?'Request changes':'Record review',components:[{type:1,components:[{type:4,custom_id:'feedback',label:'Fictional feedback',style:2,required:true,min_length:1,max_length:2000}]}]};
    await bounded(()=>{guard();if(pending!==p||clock()>=p.until||clock()>=initialDeadline)throw Error();return i.showModal(modal);},initialDeadline-clock());return true;
   }
   const match=/^nrv:feedback:([a-f0-9-]{36})$/.exec(i.customId),p=pending;
   if(i.isModalSubmit?.()!==true||!match||!p||match[1]!==p.token||clock()>=p.until)throw Error();acceptedToken=true;clear();
   response=await bounded(()=>{guard();if(clock()>=initialDeadline)throw Error();return responses.defer(i,Object.freeze({flags:64,deadlineMs:p.until}));},initialDeadline-clock(),late=>retire(late));guard();
   if(!response||typeof response.edit!=='function'||typeof response.retire!=='function'||clock()>=p.until||i.fields?.fields?.size!==1||i.fields.fields.has('feedback')!==true||typeof i.fields.getTextInputValue!=='function')throw Error();
   const feedback=i.fields.getTextInputValue('feedback'),result=await bounded(()=>input.accept(ctx,Object.freeze({token:p.token,feedback})),Math.min(editBudget,p.until-clock()));guard();if(clock()>=p.until)throw Error();
   const content=result?.ok===true?'Feedback captured. Reopen the review controls to prepare this selection.':'Review input unavailable. Start a fresh selection.';if(result?.ok!==true)input.cancel(ctx);
   const edited=await bounded(()=>{guard();return response.edit({content,embeds:[],components:[],allowedMentions:{parse:[]}});},Math.min(editBudget,p.until-clock()));if(!keys(edited,'ok')||edited.ok!==true)throw Error();return true;
  }catch{if(openingStarted)dispose();if(acceptedToken){try{input.cancel(ctx);}catch{}await retire(response);}return true;}finally{busy=false;}
 }
 return Object.freeze({handle,entryPayload,dispose});
}
