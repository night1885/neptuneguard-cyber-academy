// One bounded reviewer input slot. No SDK, listener, SQL or public feedback echo.
import {randomUUID} from 'node:crypto';
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const rev=x=>Number.isInteger(x)&&x>=0&&x<2147483647;
const deny=()=>Object.freeze({ok:false});
export function createReviewInputCustody(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({begin:async()=>deny(),accept:async()=>deny(),selectBoundDraft:async()=>null,cancel:()=>false,dispose(){}});
 const c=Object.freeze({...config}),{authority,now,isReady}=ports,timeout=c.authorityTimeoutMs??1500;
 if(!snow(c.guildId)||!snow(c.reviewerId)||!uuid(c.recordId)||typeof authority?.get!=='function'||![now,isReady].every(f=>typeof f==='function')||!Number.isInteger(timeout)||timeout<10||timeout>2000)throw Error('Explicit input providers required');
 let slot=null,closed=false,busy=false,last=-1,epoch=0;
 function clear(){if(slot){clearTimeout(slot.timer);slot.feedback=null;}slot=null;}
 function clock(){const t=now();if(!stamp(t)||t<last){closed=true;clear();throw Error();}last=t;return t;}
 function guard(){const r=isReady();r?.catch?.(()=>{});if(closed||r!==true)throw Error();return clock();}
 function context(x){if(!keys(x,'actorId,guildId')||x.actorId!==c.reviewerId||x.guildId!==c.guildId)throw Error();return Object.freeze({...x});}
 async function auth(ctx,id){guard();const generation=epoch;let timer;try{const a=await Promise.race([Promise.resolve().then(()=>authority.get(ctx,id,'review')),new Promise((_,reject)=>{timer=setTimeout(()=>{closed=true;clear();reject(Error());},timeout);})]);const at=guard();if(generation!==epoch||!keys(a,'actorId,digest,expiresAtMs,ok,purpose,recordId,reportId,reviewRevision,status,submissionRevision,validUntilMs')||a.ok!==true||a.actorId!==c.reviewerId||a.recordId!==c.recordId||a.reportId!==id||a.purpose!=='review'||typeof a.digest!=='string'||!/^[a-f0-9]{64}$/.test(a.digest)||!stamp(a.validUntilMs)||!stamp(a.expiresAtMs)||at>=a.validUntilMs||at>=a.expiresAtMs||!rev(a.submissionRevision)||a.submissionRevision<1||!rev(a.reviewRevision)||(a.status==='submitted'?a.reviewRevision!==0:!['changes-requested','review-recorded'].includes(a.status)||a.reviewRevision<1))throw Error();return Object.freeze({...a});}finally{clearTimeout(timer);}}
 const same=(a,b)=>['digest','submissionRevision','reviewRevision','expiresAtMs'].every(k=>a[k]===b[k]);
 function arm(p){p.timer=setTimeout(()=>{if(slot===p)clear();},Math.max(0,p.until-clock()));p.timer.unref?.();slot=p;}
 async function run(input,fallback,work){let ctx;try{ctx=context(input);}catch{return fallback;}if(busy)return fallback;busy=true;try{guard();if(slot&&clock()>=slot.until)clear();return await work(ctx);}catch{clear();return fallback;}finally{busy=false;}}
 async function begin(input,selection){return run(input,deny(),async ctx=>{if(slot||!keys(selection,'decision,reportId'))return deny();const {reportId,decision}=selection;if(!uuid(reportId)||!['changes-requested','review-recorded'].includes(decision))return deny();const source=await auth(ctx,reportId),until=Math.min(clock()+300000,source.validUntilMs,source.expiresAtMs),p={token:randomUUID(),reportId,decision,source,until,state:'awaiting',feedback:null,timer:null};arm(p);return Object.freeze({ok:true,token:p.token,until});});}
 async function accept(input,submission){return run(input,deny(),async ctx=>{if(!keys(submission,'feedback,token'))return deny();const {token,feedback}=submission,p=slot;if(!p||p.state!=='awaiting'||token!==p.token)return deny();clear();if(typeof feedback!=='string'||!feedback.trim()||Array.from(feedback).length>2000||Buffer.byteLength(feedback,'utf8')>8192)return deny();const a=await auth(ctx,p.reportId);if(clock()>=p.until||!same(a,p.source))return deny();p.until=Math.min(p.until,a.validUntilMs,a.expiresAtMs);p.feedback=feedback;p.state='ready';arm(p);return Object.freeze({ok:true});});}
 async function selectBoundDraft(input){return run(input,null,async ctx=>{const p=slot;if(!p||p.state!=='ready')return null;const feedback=p.feedback;clear();const a=await auth(ctx,p.reportId);if(clock()>=p.until||!same(a,p.source))return null;return Object.freeze({draft:Object.freeze({reportId:p.reportId,decision:p.decision,feedback}),binding:Object.freeze({actorId:ctx.actorId,guildId:ctx.guildId,recordId:c.recordId,reportId:p.reportId,digest:p.source.digest,submissionRevision:p.source.submissionRevision,reviewRevision:p.source.reviewRevision,expiresAtMs:p.source.expiresAtMs,until:Math.min(p.until,a.validUntilMs,a.expiresAtMs)})});});}
 function cancel(input){try{context(input);epoch++;clear();return true;}catch{return false;}}
 return Object.freeze({begin,accept,selectBoundDraft,cancel,dispose(){epoch++;closed=true;clear();}});
}
