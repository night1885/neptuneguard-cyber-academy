// Detached rehearsal coordinator only. No SDK client, listener, pool or live adapter.
import { randomUUID, createHash } from 'node:crypto';
const DAY=86400000, PREVIEW=300000;
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const key=x=>typeof x==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(x);
const time=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000-DAY;
const text=x=>typeof x==='string'&&x.trim().length>0&&Array.from(x).length<=2000&&Buffer.byteLength(x,'utf8')<=8192;
const digest=x=>createHash('sha256').update(x).digest('hex');
const deny=(reason='unavailable')=>Object.freeze({ok:false,reason});
export function createNoModalIntakeCoordinator(config={},ports={}) {
  if(config.enabled!==true)return Object.freeze(Object.fromEntries(['prepare','preview','submit','review','expireDraft'].map(k=>[k,async()=>deny('disabled')]).concat([['dispose',()=>{}]])));
  const {guildId,productionGuildId,ownerId,courseKey,mode,policy,timeoutMs=250}=config;
  if(mode!=='detached-rehearsal'||!id(guildId)||!id(productionGuildId)||guildId===productionGuildId||!id(ownerId)||
    !key(courseKey)||policy?.draftHours!==24||policy?.reportHours!==24||policy?.ownerOnly!==true||policy?.status!=='proposed-for-rehearsal'||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<5||timeoutMs>1000)throw new Error('Explicit isolated rehearsal profile required');
  for(const name of ['resolve','authorize','journalRead','journalWrite','createRestricted','verifyPrivate','admitLearner',
    'latest','exact','receipt','submit','readReport','publishTrackedReview','review','claimDraft','deleteDraft','finishDraft','now'])
    if(typeof ports[name]!=='function')throw new Error('Explicit rehearsal provider required');
  let stopped=false,queue=Promise.resolve(),pending=0,lastNow=-1;
  const previews=new Map(),inflight=new Set();
  function now(){const n=ports.now();if(!time(n)||n<lastNow)throw new Error('Clock unavailable');lastNow=n;return n;}
  async function call(name,...args){
    if(stopped||inflight.size>=20)throw new Error('Retired or busy');let timer;
    const work=Promise.resolve().then(()=>ports[name](...args));inflight.add(work);
    void work.then(()=>inflight.delete(work),()=>inflight.delete(work));
    try{const value=await Promise.race([work,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Provider outcome unknown')),timeoutMs);})]);
      if(stopped)throw new Error('Retired');return value;
    }finally{clearTimeout(timer);}
  }
  async function binding(ctx,action,previous){
    if(!ctx||Object.keys(ctx).sort().join(',')!=='actorId,guildId'||!id(ctx.actorId)||ctx.guildId!==guildId)throw new Error('Unavailable');
    const b=await call('resolve',Object.freeze({...ctx,action}));
    if(!b||!key(b.recordId)||!id(b.learnerId)||b.courseKey!==courseKey||!key(b.exerciseKey)||!Number.isSafeInteger(b.revision)||b.revision<0)throw new Error('Unavailable');
    if(action==='review'||action==='draft-delete'){
      if(ctx.actorId!==ownerId||(action==='review'&&b.learnerId===ownerId))throw new Error('Unavailable');
    }else if(ctx.actorId!==b.learnerId)throw new Error('Unavailable');
    if(previous&&['recordId','learnerId','courseKey','exerciseKey'].some(k=>b[k]!==previous[k]))throw new Error('Binding changed');
    const scoped=Object.freeze({...b,actorId:ctx.actorId,guildId,action});
    if(await call('authorize',scoped)!==true)throw new Error('Unavailable');return scoped;
  }
  async function channel(b){const j=await call('journalRead',b);
    if(j?.state!=='available'||!id(j.channelId)||await call('verifyPrivate',b,j.channelId)!==true)throw new Error('Unavailable');return j.channelId;}
  function message(m,b,ch,body=true){
    if(!m||!id(m.id)||m.guildId!==guildId||m.channelId!==ch||m.authorId!==b.learnerId||m.bot!==false||m.webhook!==false||
      !time(m.createdAtMs)||m.createdAtMs>now())throw new Error('Unavailable');
    if(body&&(m.contentAvailable!==true||!text(m.content)||m.attachmentCount!==0||m.forwarded!==false))throw new Error('Unavailable');return m;
  }
  function ack(x,b,hash){
    if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||!x||x.ok!==true||!key(x.reportId)||x.recordId!==b.recordId||x.learnerId!==b.learnerId||x.digest!==hash||
      !Number.isSafeInteger(x.revision)||x.revision<1||!time(x.submittedAtMs)||x.submittedAtMs>now()||
      x.expiresAtMs!==x.submittedAtMs+DAY||now()>=x.expiresAtMs)throw new Error('Unavailable');
    return Object.freeze({ok:true,reportId:x.reportId,revision:x.revision,expiresAtMs:x.expiresAtMs});
  }
  function forget(token){const p=previews.get(token);if(p)clearTimeout(p.timer);previews.delete(token);}
  function run(operation){
    if(stopped||pending>=20)return Promise.resolve(deny());pending++;
    const task=queue.then(async()=>{try{return stopped?deny():await operation();}catch{return deny();}});
    queue=task.then(()=>undefined,()=>undefined);return task.finally(()=>{pending--;});
  }
  return Object.freeze({
    prepare:ctx=>run(async()=>{
      const b=await binding(ctx,'prepare');let j=await call('journalRead',b);
      if(j?.state==='available'){const ch=await channel(b);await binding(ctx,'prepare',b);return Object.freeze({ok:true,channelId:ch});}
      if(j)return deny('reconcile-required');
      const operationId=randomUUID();await call('journalWrite',b,{state:'creating',operationId});
      try{
        const created=await call('createRestricted',b,{operationId,learnerAccess:false});
        if(!id(created?.id)||created.guildId!==guildId)throw new Error('Unavailable');
        j={state:'verify-pending',operationId,channelId:created.id};await call('journalWrite',b,j);
        if(await call('verifyPrivate',b,created.id)!==true)throw new Error('Unavailable');
        await binding(ctx,'prepare',b);await call('admitLearner',b,created.id);
        if(await call('verifyPrivate',b,created.id)!==true)throw new Error('Unavailable');
        await binding(ctx,'prepare',b);await call('journalWrite',b,{...j,state:'available'});
        return Object.freeze({ok:true,channelId:created.id});
      }catch{try{await call('journalWrite',b,{...(j||{operationId}),state:'reconcile-required'});}catch{}return deny('reconcile-required');}
    }),
    preview:ctx=>run(async()=>{
      const b=await binding(ctx,'preview'),ch=await channel(b),m=message(await call('latest',b,ch),b,ch);
      if(now()>=m.createdAtMs+DAY)return deny('draft-expired');
      await binding(ctx,'preview',b);
      for(const [token,p]of previews)if(p.actorId===ctx.actorId||now()>=p.until)forget(token);
      if(previews.size>=20)return deny();const token=randomUUID(),hash=digest(m.content);
      const p={actorId:ctx.actorId,b,channelId:ch,messageId:m.id,createdAtMs:m.createdAtMs,body:m.content,digest:hash,until:now()+PREVIEW};
      p.timer=setTimeout(()=>forget(token),PREVIEW);p.timer.unref?.();previews.set(token,p);
      return Object.freeze({ok:true,token,sourceMessageId:m.id,channelId:ch,digest:hash,characters:Array.from(m.content).length});
    }),
    submit:(ctx,token,requestId)=>run(async()=>{
      const p=previews.get(token);if(!p||p.actorId!==ctx?.actorId||!key(requestId))return deny();
      if(now()>=p.until){forget(token);return deny();}
      const b=await binding(ctx,'submit',p.b);
      if(await channel(b)!==p.channelId){forget(token);return deny('refresh-required');}
      const old=await call('receipt',b,requestId);
      if(old!==null){
        if(old?.sourceMessageId!==p.messageId||old?.sourceChannelId!==p.channelId||old?.sourceCreatedAtMs!==p.createdAtMs)return deny();
        const result=ack(old,b,p.digest);await binding(ctx,'submit',b);return now()<result.expiresAtMs?result:deny();}
      const m=message(await call('exact',b,p.channelId,p.messageId),b,p.channelId);
      if(m.id!==p.messageId||m.createdAtMs!==p.createdAtMs||digest(m.content)!==p.digest||now()>=m.createdAtMs+DAY){forget(token);return deny('refresh-required');}
      await binding(ctx,'submit',b);
      const response=await call('submit',b,Object.freeze({requestId,expectedRevision:p.b.revision,messageId:p.messageId,
        channelId:p.channelId,createdAtMs:p.createdAtMs,body:p.body,digest:p.digest}));
      if(response?.sourceMessageId!==p.messageId||response?.sourceChannelId!==p.channelId||response?.sourceCreatedAtMs!==p.createdAtMs)return deny();
      const result=ack(response,b,p.digest);await binding(ctx,'submit',b);return now()<result.expiresAtMs?result:deny();
    }),
    review:(ctx,reportId,expectedRevision,decision,feedback)=>run(async()=>{
      if(!key(reportId)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!['changes-requested','review-recorded'].includes(decision)||!text(feedback))return deny();
      const b=await binding(ctx,'review'),report=await call('readReport',b,reportId);
      if(report?.ok!==true||report.reportId!==reportId||report.recordId!==b.recordId||report.learnerId!==b.learnerId||!text(report.body))return deny();
      if(digest(report.body)!==report.digest)return deny();
      ack(report,b,report.digest);await binding(ctx,'review',b);
      const presentation=Object.freeze(Object.fromEntries(['reportId','recordId','learnerId','body','submittedAtMs','expiresAtMs','digest','revision'].map(k=>[k,report[k]])));
      const view=await call('publishTrackedReview',b,presentation);
      if(view?.tracked!==true||view.expiresAtMs!==report.expiresAtMs)return deny('reconcile-required');
      await binding(ctx,'review',b);if(now()>=report.expiresAtMs)return deny();
      const response=await call('review',b,{reportId,expectedRevision,decision,feedback});
      const result=ack(response,b,report.digest);await binding(ctx,'review',b);return now()<result.expiresAtMs?result:deny();
    }),
    expireDraft:(ctx,messageId)=>run(async()=>{
      if(!id(messageId))return deny();const b=await binding(ctx,'draft-delete'),ch=await channel(b);
      const m=message(await call('exact',b,ch,messageId),b,ch,false);if(m.id!==messageId)return deny();
      if(now()<m.createdAtMs+DAY)return deny('not-due');
      const claim=await call('claimDraft',b,{channelId:ch,messageId,createdAtMs:m.createdAtMs,deadlineMs:m.createdAtMs+DAY});
      if(claim?.claimed!==true||!key(claim.token))return deny('not-unsubmitted');
      let outcome='unknown';
      try{await binding(ctx,'draft-delete',b);if(await call('verifyPrivate',b,ch)!==true)throw new Error();
        const r=await call('deleteDraft',b,ch,messageId);if(r?.deleted!==true)throw new Error();outcome='confirmed';
      }catch{}finally{try{await call('finishDraft',b,claim.token,outcome);}catch{outcome='unknown';}}
      return outcome==='confirmed'?Object.freeze({ok:true,outcome:'provider-confirmed'}):deny('reconcile-required');
    }),
    dispose(){stopped=true;for(const token of previews.keys())forget(token);}
  });
}
