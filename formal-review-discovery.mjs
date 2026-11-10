import {discordId,operationId,exactFields,reviewClock} from './formal-review-policy.mjs';
const denied=Object.freeze({ok:false});
export function createFormalReviewDiscovery(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,list:async()=>denied,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,readPool,core,isReady,now=Date.now,reviewerMode='owner',verifyAdministrator}=options;
 if(!['owner','current-administrator'].includes(reviewerMode)||(reviewerMode==='current-administrator'&&typeof verifyAdministrator!=='function'))throw Error('Formal report discovery unavailable');
 if(![guildId,ownerId].every(discordId)||typeof readPool?.query!=='function'||core?.enabled!==true||typeof core.read!=='function'||typeof isReady!=='function'||typeof now!=='function')throw Error('Formal report discovery unavailable');
 let stopped=false,last=-1;const active=new Set();
 function clock(){if(stopped||isReady()!==true)throw Error();const stamp=reviewClock(now());if(stamp<last)throw Error();last=stamp;return stamp;}
 async function authorize(actor,learnerId){clock();if(actor.actorId!==learnerId){if(reviewerMode==='current-administrator'){if(await verifyAdministrator(actor.actorId)!==true)throw Error();}else if(actor.actorId!==ownerId)throw Error();}return clock();}
 function list(ctx,request){
  if(stopped||active.size>=4)return Promise.resolve(denied);
  const task=Promise.resolve().then(async()=>{try{
   clock();if(!exactFields(ctx,['actorId','guildId'])||!discordId(ctx.actorId)||ctx.guildId!==guildId||!exactFields(request,['learnerId'])||!discordId(request.learnerId))throw Error();
   const actor=Object.freeze({actorId:ctx.actorId,guildId}),learnerId=request.learnerId;await authorize(actor,learnerId);
   const result=await readPool.query(`SELECT w.id AS work_id,r.id AS report_id,w.guild_id,w.learner_id
    FROM formal_review.work w JOIN formal_review.reports r ON r.work_id=w.id
    WHERE w.guild_id=$1 AND w.learner_id=$2 AND w.course_key='ethical-hacking-reading'
      AND w.expires_ms>floor(extract(epoch FROM clock_timestamp())*1000)::bigint
      AND r.expires_ms>floor(extract(epoch FROM clock_timestamp())*1000)::bigint
    ORDER BY r.submitted_ms DESC,r.id DESC LIMIT 20`,[guildId,learnerId]);
   await authorize(actor,learnerId);if(!Array.isArray(result?.rows)||result.rows.length>20)throw Error();
   const reports=[],seen=new Set();
   for(const row of result.rows){
    if(!operationId(row.work_id)||!operationId(row.report_id)||row.guild_id!==guildId||row.learner_id!==learnerId||seen.has(row.report_id))throw Error();seen.add(row.report_id);
    const workId=row.work_id,reportId=row.report_id;await authorize(actor,learnerId);
    const value=await core.read(actor,Object.freeze({workId,reportId}));await authorize(actor,learnerId);
    if(value?.ok!==true)continue;
    if(value.reportId!==reportId||!Number.isSafeInteger(value.revision)||value.revision<1||clock()>=reviewClock(value.expiresAtMs))throw Error();
    if(value.review!==null&&!['changes-requested','review-recorded'].includes(value.review?.decision))throw Error();
    reports.push(Object.freeze({workId,reportId,revision:value.revision,expiresAtMs:value.expiresAtMs,reviewDecision:value.review?.decision??null}));
   }
   const stamp=await authorize(actor,learnerId);if(reports.some(r=>stamp>=r.expiresAtMs))throw Error();
   return Object.freeze({ok:true,reports:Object.freeze(reports)});
  }catch{return denied;}});
  active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;
 }
 return Object.freeze({enabled:true,list,dispose(){stopped=true;},async drain(){await Promise.allSettled([...active]);}});
}
