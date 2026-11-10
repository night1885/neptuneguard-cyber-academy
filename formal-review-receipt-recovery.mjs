import {discordId,operationId,exactFields,reviewClock} from './formal-review-policy.mjs';
const denied=Object.freeze({ok:false});
const fail=()=>{throw Error('Receipt recovery unavailable');};
const integer=x=>{if(typeof x==='string'){if(!/^[0-9]+$/.test(x))fail();x=Number(x);}if(!Number.isSafeInteger(x)||x<1)fail();return x;};
export function createFormalReviewReceiptRecovery(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,inspectLatest:async()=>denied,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,readPool,core,isReady,now=Date.now,providerTimeoutMs=1000}=options;
 if(![guildId,ownerId].every(discordId)||typeof readPool?.query!=='function'||core?.enabled!==true||typeof core.read!=='function'||typeof isReady!=='function'||typeof now!=='function'||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<20||providerTimeoutMs>2000)fail();
 let stopped=false,last=-1;const active=new Set();
 function check(deadline){if(stopped||isReady()!==true||performance.now()>=deadline)fail();const n=reviewClock(now());if(n<last)fail();last=n;return n;}
 function inspectLatest(ctx,request){
  if(stopped||active.size>=4)return Promise.resolve(denied);
  const deadline=performance.now()+providerTimeoutMs;
  const task=Promise.resolve().then(async()=>{try{
   check(deadline);if(!exactFields(ctx,['actorId','guildId'])||ctx.guildId!==guildId||!discordId(ctx.actorId)||!exactFields(request,['workId'])||!operationId(request.workId))fail();
   const actor=Object.freeze({actorId:ctx.actorId,guildId}),workId=request.workId,action=actor.actorId===ownerId?'review':'submit';
   const result=await readPool.query(`SELECT w.guild_id,w.learner_id,o.work_id,o.actor_id,o.operation_id,o.action,o.report_id,o.revision,o.expires_ms
    FROM formal_review.operations o JOIN formal_review.work w ON w.id=o.work_id
    WHERE w.guild_id=$1 AND o.actor_id=$2 AND o.work_id=$3 AND o.action=$4
      AND w.expires_ms>floor(extract(epoch FROM clock_timestamp())*1000)::bigint
      AND o.expires_ms>floor(extract(epoch FROM clock_timestamp())*1000)::bigint
    ORDER BY o.revision DESC,o.operation_id DESC LIMIT 1`,[guildId,actor.actorId,workId,action]);
   const stamp=check(deadline);if(!Array.isArray(result?.rows)||result.rows.length!==1)fail();
   const r=result.rows[0];if(r?.guild_id!==guildId||!discordId(r.learner_id)||r.work_id!==workId||r.actor_id!==actor.actorId||r.action!==action||!operationId(r.operation_id)||!operationId(r.report_id)||(action==='submit'?r.learner_id!==actor.actorId:r.learner_id===ownerId))fail();
   const revision=integer(r.revision),expiresAtMs=reviewClock(integer(r.expires_ms)),reportId=r.report_id,operation=r.operation_id;if(stamp>=expiresAtMs)fail();
   const value=await core.read(actor,Object.freeze({workId,reportId}));
   if(check(deadline)>=expiresAtMs||value?.ok!==true||value.reportId!==reportId||value.expiresAtMs!==expiresAtMs||!Number.isSafeInteger(value.revision)||value.revision<1||revision!==value.revision+(action==='review'?1:0)||(action==='review'&&!['changes-requested','review-recorded'].includes(value.review?.decision)))fail();
   return Object.freeze({ok:true,kind:'latest-recorded-operation',workId,reportId,operationId:operation,action,revision,expiresAtMs});
  }catch{return denied;}});
  active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));
  let timer;return Promise.race([task,new Promise(resolve=>{timer=setTimeout(()=>resolve(denied),providerTimeoutMs);})]).finally(()=>clearTimeout(timer));
 }
 return Object.freeze({enabled:true,inspectLatest,dispose(){stopped=true;},async drain(){await Promise.allSettled([...active]);}});
}
