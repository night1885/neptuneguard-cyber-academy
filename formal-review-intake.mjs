import {randomUUID,createHash} from 'node:crypto';
import {discordId,operationId,exactFields,boundedReviewText,reviewClock} from './formal-review-policy.mjs';
const denied=Object.freeze({ok:false});
const fail=()=>{throw Error('Formal intake unavailable');};
export function createFormalReviewIntake(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,preview:async()=>denied,confirm:async()=>denied,cancel:async()=>denied,dispose(){},drain:async()=>{}});
 const {core,isReady,now=Date.now,previewMs=300000}=options;
 if(core?.enabled!==true||typeof core.preview!=='function'||typeof core.submit!=='function'||typeof isReady!=='function'||typeof now!=='function'||!Number.isSafeInteger(previewMs)||previewMs<20||previewMs>300000)fail();
 let stopped=false,last=-1;const sessions=new Map(),active=new Set();
 function time(){if(stopped||isReady()!==true)fail();const n=reviewClock(now());if(n<last)fail();last=n;return n;}
 function context(c){if(!exactFields(c,['actorId','guildId','channelId'])||![c.actorId,c.guildId,c.channelId].every(discordId))fail();return Object.freeze({actorId:c.actorId,guildId:c.guildId,channelId:c.channelId});}
 const coreContext=c=>({actorId:c.actorId,guildId:c.guildId});
 function remove(id){const s=sessions.get(id);if(s)clearTimeout(s.timer);sessions.delete(id);}
 function sweep(n){for(const [id,s] of sessions)if(n>=s.expiresAtMs)remove(id);}
 function selected(c,r){const n=time();sweep(n);if(!exactFields(r,['previewId'])||!operationId(r.previewId))fail();const s=sessions.get(r.previewId);if(!s||s.actorId!==c.actorId||s.guildId!==c.guildId||s.channelId!==c.channelId||n>=s.expiresAtMs||s.busy)fail();return s;}
 function execute(fn){if(stopped||active.size>=4)return Promise.resolve(denied);const task=(async()=>{try{return await fn();}catch{return denied;}})();active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;}
 function preview(ctx,r){return execute(async()=>{const c=context(ctx),n=time();sweep(n);if(!exactFields(r,['workId','sourceMessageId','consent'])||r.consent!==true||!operationId(r.workId)||!discordId(r.sourceMessageId)||sessions.size+active.size>=100)fail();const request=Object.freeze({workId:r.workId,sourceMessageId:r.sourceMessageId});
  const v=await core.preview(coreContext(c),request),stamp=time();
  if(v?.ok!==true||v.workId!==request.workId||v.sourceMessageId!==request.sourceMessageId||v.sourceChannelId!==c.channelId||!Number.isSafeInteger(v.expectedRevision)||v.expectedRevision<0||!boundedReviewText(v.body)||v.sourceDigest!==createHash('sha256').update(v.body,'utf8').digest('hex')||stamp>=reviewClock(v.expiresAtMs))fail();
  const previewId=randomUUID(),expiresAtMs=Math.min(stamp+previewMs,v.expiresAtMs);
  sessions.set(previewId,{...c,expiresAtMs,busy:false,attempted:false,request:Object.freeze({workId:v.workId,operationId:randomUUID(),expectedRevision:v.expectedRevision,sourceMessageId:v.sourceMessageId,sourceDigest:v.sourceDigest})});
  const timer=setTimeout(()=>remove(previewId),Math.max(1,expiresAtMs-stamp));timer.unref?.();sessions.get(previewId).timer=timer;
  return Object.freeze({ok:true,previewId,body:v.body,expiresAtMs});
 });}
 function confirm(ctx,r){return execute(async()=>{const c=context(ctx),s=selected(c,r);s.busy=true;s.attempted=true;
  try{const result=await core.submit(coreContext(c),s.request);if(time()>=s.expiresAtMs||sessions.get(r.previewId)!==s||result?.ok!==true||result.workId!==s.request.workId||!operationId(result.reportId)||result.revision!==s.request.expectedRevision+1||time()>=reviewClock(result.expiresAtMs))fail();return Object.freeze({ok:true,workId:result.workId,reportId:result.reportId,revision:result.revision,expiresAtMs:result.expiresAtMs});}finally{s.busy=false;}
 });}
 function cancel(ctx,r){return execute(async()=>{const c=context(ctx),s=selected(c,r);if(s.attempted)fail();remove(r.previewId);return Object.freeze({ok:true,cancelledPreview:true});});}
 return Object.freeze({enabled:true,preview,confirm,cancel,dispose(){stopped=true;for(const id of sessions.keys())remove(id);},async drain(){await Promise.allSettled([...active]);}});
}
