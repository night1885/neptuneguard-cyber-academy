import {randomUUID} from 'node:crypto';
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const denied=()=>({content:'Receipt recovery is unavailable. Reopen recovery to refresh.',components:[],embeds:[],allowedMentions:{parse:[]}});
// Detached metadata-only boundary. No listener, entry message, client or pool.
export function createReceiptRecoveryBoundary(config={},ports={}) {
  if(config.enabled!==true)return Object.freeze({handle:async()=>false,dispose(){}});
  const {guildId,productionGuildId,entryChannelId,courseKey,exerciseKey,mode,timeoutMs=250}=config;
  if(mode!=='detached-rehearsal'||![guildId,productionGuildId,entryChannelId].every(snow)||guildId===productionGuildId||
    ![courseKey,exerciseKey].every(x=>typeof x==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(x))||!Number.isInteger(timeoutMs)||timeoutMs<5||timeoutMs>1000)throw Error('Explicit recovery rehearsal profile required');
  for(const name of ['resolve','authorize','discoverReceipts','recoverSubmission','isReady','now'])if(typeof ports[name]!=='function')throw Error('Explicit recovery provider required');
  const sessions=new Map(),inflight=new Set();let stopped=false,pending=0,last=-1;
  const ready=()=>{try{const r=ports.isReady();if(r?.catch)r.catch(()=>{});return !stopped&&r===true;}catch{return false;}};
  function now(){const n=ports.now();if(!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-300000||n<last)throw Error();last=n;return n;}
  function drop(token){const s=sessions.get(token);if(s)clearTimeout(s.timer);sessions.delete(token);}
  async function call(name,...args){
    if(!ready()||inflight.size>=20)throw Error();let timer;
    const work=Promise.resolve().then(()=>ports[name](...args));inflight.add(work);
    void work.then(()=>inflight.delete(work),()=>inflight.delete(work));
    try{const r=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),timeoutMs);})]);if(!ready())throw Error();return r;}finally{clearTimeout(timer);}
  }
  async function binding(ctx,previous){
    const b=await call('resolve',Object.freeze({...ctx,action:'submit'}));
    if(!b||!uuid(b.recordId)||b.learnerId!==ctx.actorId||b.courseKey!==courseKey||b.exerciseKey!==exerciseKey||!Number.isSafeInteger(b.revision)||b.revision<0||
      previous&&['recordId','learnerId','courseKey','exerciseKey'].some(k=>b[k]!==previous[k]))throw Error();
    const scoped=Object.freeze({recordId:b.recordId,learnerId:b.learnerId,courseKey,exerciseKey,revision:b.revision,...ctx,action:'submit'});
    if(await call('authorize',scoped)!==true)throw Error();return scoped;
  }
  return Object.freeze({async handle(i){
    if(typeof i?.customId!=='string'||!i.customId.startsWith('nmr:'))return false;
    const deny=async()=>{if(!i.deferred&&!i.replied)try{await i.reply({...denied(),flags:64});}catch{}return true;};
    if(!ready()||i.isButton?.()!==true||i.guildId!==guildId||i.channelId!==entryChannelId||!snow(i.user?.id)||i.deferred||i.replied||pending>=20)return deny();
    pending++;let reserved;
    try{
      const at=now();for(const [t,s]of sessions)if(at>=s.until)drop(t);
      const ctx=Object.freeze({actorId:i.user.id,guildId}),listing=i.customId==='nmr:list';
      const match=/^nmr:recover:([a-f0-9-]{36}):([0-4])$/.exec(i.customId),s=match&&sessions.get(match[1]);
      if(!listing&&(!s||s.actorId!==ctx.actorId||s.messageId!==i.message?.id||i.message?.flags?.has?.(64)!==true))return await deny();
      if(listing&&sessions.size>=100)return await deny();
      if(listing){
        reserved=randomUUID();const slot={actorId:ctx.actorId,until:at+300000};sessions.set(reserved,slot);
        const sessionToken=reserved;slot.timer=setTimeout(()=>drop(sessionToken),300000);slot.timer.unref?.();
        await i.deferReply({flags:64});
      }else await i.deferUpdate();
      const b=await binding(ctx,s?.binding);let payload;
      if(listing){
        const rows=await call('discoverReceipts',b,5);
        if(!Array.isArray(rows)||rows.length>5)throw Error();
        const seen=new Set(),items=rows.map(r=>{
          if(!uuid(r?.requestId)||!uuid(r.reportId)||seen.has(r.requestId)||!Number.isSafeInteger(r.revision)||r.revision<1||!Number.isSafeInteger(r.expiresAtMs)||r.expiresAtMs>8640000000000000||r.expiresAtMs<=now())throw Error();
          seen.add(r.requestId);return Object.freeze({requestId:r.requestId,reportId:r.reportId,revision:r.revision,expiresAtMs:r.expiresAtMs});
        });
        await binding(ctx,b);const slot=sessions.get(reserved);if(!slot||now()>=slot.until||items.some(r=>now()>=r.expiresAtMs))throw Error();
        slot.binding=b;slot.items=items;
        payload={content:items.length?'Select a submission receipt to recheck its current authorization and original deadline.':'No current submission receipts are available.',components:items.length?[{type:1,components:items.map((r,n)=>({type:2,style:2,label:`Recover receipt ${n+1}`,custom_id:`nmr:recover:${reserved}:${n}`}))}]:[]};
      }else{
        const item=s.items?.[Number(match[2])];if(!item||now()>=item.expiresAtMs||now()>=s.until)throw Error();
        const ack=await call('recoverSubmission',ctx,item.requestId);
        if(ack?.ok!==true||ack.reportId!==item.reportId||ack.revision!==item.revision||ack.expiresAtMs!==item.expiresAtMs)throw Error();
        await binding(ctx,b);if(now()>=item.expiresAtMs||now()>=s.until)throw Error();
        payload={content:`Submission receipt verified. Original expiry: <t:${Math.floor(item.expiresAtMs/1000)}:F>. Recovery does not extend retention.`,components:[]};
      }
      if(!ready())throw Error();
      const message=await i.editReply({...payload,embeds:[],allowedMentions:{parse:[]}});
      if(listing){const slot=sessions.get(reserved);if(!ready()||!slot||now()>=slot.until||!snow(message?.id)||message.flags?.has?.(64)!==true)throw Error();slot.messageId=message.id;reserved=undefined;}
      return true;
    }catch{if(ready())try{if(i.deferred||i.replied)await i.editReply(denied());else await i.reply({...denied(),flags:64});}catch{}return true;}
    finally{if(reserved)drop(reserved);pending--;}
  },dispose(){stopped=true;for(const t of sessions.keys())drop(t);}});
}
