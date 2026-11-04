// One bound preparation per session. No exposure of the legacy SDK handle method.
import {createReviewControls} from './staging-review-controls.candidate.mjs';
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const rev=x=>Number.isInteger(x)&&x>=0&&x<2147483647;
const deny=()=>Object.freeze({ok:false,reason:'unavailable'});
export function createBoundReviewPreparation(config={},ports={},envelope){
 if(config.enabled!==true)return Object.freeze({prepare:async()=>deny(),confirm:async()=>deny(),recover:async()=>deny(),dispose(){}});
 const c=Object.freeze({...config}),{authority,store,now,isReady}=ports,timeout=c.authorityTimeoutMs??1500;
 if(!keys(envelope,'binding,draft')||!keys(envelope.binding,'actorId,digest,expiresAtMs,guildId,recordId,reportId,reviewRevision,submissionRevision,until')||!keys(envelope.draft,'decision,feedback,reportId')||typeof authority?.get!=='function'||![now,isReady].every(f=>typeof f==='function')||!Number.isInteger(timeout)||timeout<10||timeout>2000)throw Error('Bound preparation providers required');
 const b=Object.freeze({...envelope.binding});let draft=Object.freeze({...envelope.draft});
 const at=now();if(!stamp(at)||b.actorId!==c.reviewerId||b.guildId!==c.guildId||b.recordId!==c.recordId||!uuid(b.reportId)||draft.reportId!==b.reportId||typeof b.digest!=='string'||!/^[a-f0-9]{64}$/.test(b.digest)||!stamp(b.expiresAtMs)||!stamp(b.until)||b.until>Math.min(b.expiresAtMs,at+300000)||at>=b.until||!rev(b.submissionRevision)||b.submissionRevision<1||!rev(b.reviewRevision)||!['changes-requested','review-recorded'].includes(draft.decision)||typeof draft.feedback!=='string'||!draft.feedback.trim()||Array.from(draft.feedback).length>2000||Buffer.byteLength(draft.feedback,'utf8')>8192)throw Error('Invalid bound input');
 const ctx=Object.freeze({actorId:b.actorId,guildId:b.guildId});let core,timer,closed=false,phase='new',last=at,until=b.until;
 const valid=x=>keys(x,'actorId,guildId')&&x.actorId===ctx.actorId&&x.guildId===ctx.guildId;
 function dispose(){closed=true;phase='closed';draft=null;clearTimeout(timer);core?.dispose();}
 function clock(){const t=now();if(!stamp(t)||t<last){dispose();throw Error();}last=t;return t;}
 function ready(){const r=isReady();r?.catch?.(()=>{});return !closed&&r===true;}
 function arm(){clearTimeout(timer);timer=setTimeout(dispose,Math.max(0,until-clock()));timer.unref?.();}
 const guarded={async get(input,id,purpose){if(!valid(input)||id!==b.reportId||purpose!=='review'||!ready()||clock()>=until)return null;let deadline;
  try{const a=await Promise.race([Promise.resolve().then(()=>authority.get(ctx,id,'review')),new Promise((_,reject)=>{deadline=setTimeout(()=>{dispose();reject(Error());},Math.min(timeout,Math.max(1,until-clock())));})]);
   if(!ready()||clock()>=until||!keys(a,'actorId,digest,expiresAtMs,ok,purpose,recordId,reportId,reviewRevision,status,submissionRevision,validUntilMs')||a.ok!==true||a.actorId!==b.actorId||a.recordId!==b.recordId||a.reportId!==b.reportId||a.purpose!=='review'||a.digest!==b.digest||a.submissionRevision!==b.submissionRevision||a.expiresAtMs!==b.expiresAtMs||phase==='preparing'&&a.reviewRevision!==b.reviewRevision||!stamp(a.validUntilMs))return null;
   until=Math.min(until,a.validUntilMs,a.expiresAtMs);if(clock()>=until)return null;arm();return Object.freeze({...a,validUntilMs:until});
  }catch{return null;}finally{clearTimeout(deadline);}
 }};
 core=createReviewControls(c,{authority:guarded,store,now,isReady:ready,selectDraft:async()=>null,selectReport:async()=>null});arm();
 return Object.freeze({async prepare(input){if(!valid(input)||closed||phase!=='new')return deny();phase='preparing';const captured=draft;draft=null;try{const result=await core.prepare(ctx,captured);if(result?.ok===true&&ready()&&clock()<until){phase='active';return Object.freeze({ok:true,token:result.token,reportId:result.reportId,decision:result.decision,expectedReviewRevision:result.expectedReviewRevision,until:result.until});}dispose();return result?.ok===true?deny():result;}catch{dispose();return deny();}},confirm:(input,token)=>valid(input)&&!closed&&phase==='active'?core.confirm(ctx,token):Promise.resolve(deny()),recover:(input,token)=>valid(input)&&!closed&&phase==='active'?core.recover(ctx,token):Promise.resolve(deny()),dispose});
}
