import {randomUUID} from 'node:crypto';
import {discordId,operationId,exactFields,boundedReviewText,reviewClock} from './formal-review-policy.mjs';
const denied=Object.freeze({ok:false}),decisions=new Set(['changes-requested','review-recorded']);
const fail=()=>{throw Error('Formal owner review unavailable');};
export function createFormalReviewOwnerFlow(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,read:async()=>denied,open:async()=>denied,canPrepare:()=>denied,prepare:async()=>denied,confirm:async()=>denied,cancel:async()=>denied,dispose(){},drain:async()=>{}});
 const {ownerId,guildId,channelId,core,isReady,now=Date.now,sessionMs=300000,reviewerMode='owner',verifyAdministrator}=options;
 if(!['owner','current-administrator'].includes(reviewerMode)||(reviewerMode==='current-administrator'&&typeof verifyAdministrator!=='function'))fail();
 const administratorReview=reviewerMode==='current-administrator';
 if(![ownerId,guildId,channelId].every(discordId)||core?.enabled!==true||!['read','review'].every(k=>typeof core[k]==='function')||typeof isReady!=='function'||typeof now!=='function'||!Number.isSafeInteger(sessionMs)||sessionMs<20||sessionMs>300000)fail();
 let stopped=false,last=-1;const sessions=new Map(),active=new Set();
 function time(){if(stopped||isReady()!==true)fail();const n=reviewClock(now());if(n<last)fail();last=n;return n;}
 function context(c){time();if(!exactFields(c,['actorId','guildId','channelId'])||!discordId(c.actorId)||(!administratorReview&&c.actorId!==ownerId)||c.guildId!==guildId||c.channelId!==channelId)fail();return Object.freeze({actorId:c.actorId,guildId,channelId});}
 async function authorized(c){const selected=context(c);if(administratorReview&&await verifyAdministrator(selected.actorId)!==true)fail();context(selected);return selected;}
 const actor=c=>({actorId:c.actorId,guildId:c.guildId});
 function remove(id){const s=sessions.get(id);if(s)clearTimeout(s.timer);sessions.delete(id);}
 function sweep(){const n=time();for(const [id,s] of sessions)if(n>=s.expiresAtMs)remove(id);}
 function selected(c,id){sweep();const s=sessions.get(id);if(!operationId(id)||!s||s.actorId!==c.actorId||s.guildId!==c.guildId||s.channelId!==c.channelId||s.busy)fail();return s;}
 function execute(fn){if(stopped||active.size>=4)return Promise.resolve(denied);const task=(async()=>{try{return await fn();}catch{return denied;}})();active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;}
 async function readChecked(c,r){c=await authorized(c);if(!exactFields(r,['workId','reportId'])||!operationId(r.workId)||!operationId(r.reportId))fail();const workId=r.workId,reportId=r.reportId;
  const v=await core.read(actor(c),Object.freeze({workId,reportId}));await authorized(c);
  if(v?.ok!==true||v.reportId!==reportId||!Number.isSafeInteger(v.revision)||v.revision<1||!boundedReviewText(v.body)||time()>=reviewClock(v.expiresAtMs)||v.review!==null&&(!decisions.has(v.review?.decision)||!boundedReviewText(v.review?.feedback)))fail();return Object.freeze({...v,workId});
 }
 const read=(ctx,r)=>execute(async()=>readChecked(context(ctx),r));
 function open(ctx,r){return execute(async()=>{const c=await authorized(ctx);sweep();if(sessions.size+active.size>=100)fail();const v=await readChecked(c,r);let reviewToken=null;
  if(v.review===null){reviewToken=randomUUID();const expiresAtMs=Math.min(time()+sessionMs,v.expiresAtMs),s={...c,workId:v.workId,reportId:v.reportId,revision:v.revision,reportExpiresAtMs:v.expiresAtMs,expiresAtMs,busy:false,attempted:false,request:null};sessions.set(reviewToken,s);s.timer=setTimeout(()=>remove(reviewToken),Math.max(1,expiresAtMs-time()));s.timer.unref?.();}
  return Object.freeze({...v,reviewToken});
 });}
 // Synchronous modal eligibility only. Reads, preparation and confirmation use fresh authority.
 function canPrepare(ctx,r){try{const c=context(ctx);if(!exactFields(r,['reviewToken','decision'])||!decisions.has(r.decision)||selected(c,r.reviewToken).request)fail();return Object.freeze({ok:true});}catch{return denied;}}
 function prepare(ctx,r){return execute(async()=>{const c=await authorized(ctx);if(!exactFields(r,['reviewToken','decision','feedback','ack'])||r.ack!=='REVIEWED'||!decisions.has(r.decision)||!boundedReviewText(r.feedback))fail();const token=r.reviewToken,s=selected(c,token);if(s.request)fail();const decision=r.decision,feedback=r.feedback;s.busy=true;
  try{const v=await readChecked(c,{workId:s.workId,reportId:s.reportId});if(v.review!==null||v.revision!==s.revision||v.expiresAtMs!==s.reportExpiresAtMs||time()>=s.expiresAtMs||sessions.get(token)!==s)fail();s.request=Object.freeze({workId:s.workId,operationId:randomUUID(),expectedRevision:s.revision,reportId:s.reportId,decision,feedback});return Object.freeze({ok:true,reviewToken:token,reportId:s.reportId,expectedRevision:s.revision,decision,feedback,expiresAtMs:s.expiresAtMs});}finally{s.busy=false;}
 });}
 function confirm(ctx,r){return execute(async()=>{const c=await authorized(ctx);if(!exactFields(r,['reviewToken']))fail();const token=r.reviewToken,s=selected(c,token);if(!s.request)fail();s.busy=true;s.attempted=true;
  try{const v=await core.review(actor(c),s.request);await authorized(c);if(time()>=s.expiresAtMs||sessions.get(token)!==s||v?.ok!==true||v.workId!==s.workId||v.reportId!==s.reportId||v.revision!==s.revision+1||v.expiresAtMs!==s.reportExpiresAtMs)fail();return Object.freeze({ok:true,workId:v.workId,reportId:v.reportId,revision:v.revision,expiresAtMs:v.expiresAtMs});}finally{s.busy=false;}
 });}
 function cancel(ctx,r){return execute(async()=>{const c=context(ctx);if(!exactFields(r,['reviewToken']))fail();const s=selected(c,r.reviewToken);if(s.attempted)fail();remove(r.reviewToken);return Object.freeze({ok:true,cancelledConfirmation:true});});}
 return Object.freeze({enabled:true,read,open,canPrepare,prepare,confirm,cancel,dispose(){stopped=true;for(const id of sessions.keys())remove(id);},async drain(){await Promise.allSettled([...active]);}});
}
