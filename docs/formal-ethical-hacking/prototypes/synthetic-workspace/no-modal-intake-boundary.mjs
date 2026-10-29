// Metadata-only rehearsal interaction boundary. No listener or entry button is published.
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const unavailable=()=>({content:'Evidence intake is unavailable.',embeds:[],components:[],allowedMentions:{parse:[]}});
const button=(label,custom_id)=>({type:2,style:1,label,custom_id});
export function createNoModalIntakeBoundary({enabled=false,guildId,entryChannelId,isReady,coordinator,readNow}={}) {
  if(!enabled)return Object.freeze({handle:async()=>false,dispose:()=>{}});
  if(!id(guildId)||!id(entryChannelId)||typeof isReady!=='function'||typeof readNow!=='function'||!['prepare','preview','submit','dispose'].every(k=>typeof coordinator?.[k]==='function'))throw new Error('Explicit detached boundary required');
  const owners=new Map();let stopped=false,lastNow=-1;
  const clock=()=>{const n=readNow();if(!Number.isSafeInteger(n)||n<0||n<lastNow)throw new Error('Clock unavailable');lastNow=n;return n;};
  const ready=()=>{try{const value=isReady();if(value?.catch)value.catch(()=>{});return !stopped&&value===true;}catch{return false;}};
  return Object.freeze({async handle(i){
    if(typeof i?.customId!=='string'||!i.customId.startsWith('nmi:'))return false;
    const deny=async()=>{if(!i.deferred&&!i.replied)try{await i.reply({...unavailable(),flags:64});}catch{}return true;};
    if(!ready()||i.isButton?.()!==true||i.guildId!==guildId||i.channelId!==entryChannelId||!id(i.user?.id)||i.deferred||i.replied)return deny();
    let at;try{at=clock();}catch{return deny();}
    for(const [key,value]of owners)if(at>=value.until)owners.delete(key);
    const opening=i.customId==='nmi:prepare',owner=owners.get(i.message?.id);
    if(!opening&&(!owner||owner.actorId!==i.user.id||i.message?.flags?.has?.(64)!==true))return deny();
    if(opening&&owners.size>=100)return deny();
    try{
      if(opening)await i.deferReply({flags:64});else await i.deferUpdate();
      if(!ready())return true;
      const ctx={actorId:i.user.id,guildId};let r;
      if(opening)r=await coordinator.prepare(ctx);
      else if(i.customId==='nmi:preview')r=await coordinator.preview(ctx);
      else if(/^nmi:submit:[a-f0-9-]{36}$/.test(i.customId)){
        const token=i.customId.slice(11);r=await coordinator.submit(ctx,token,token);
      }else r={ok:false};
      if(!ready())return true;
      let payload=unavailable();
      if(r?.ok===true&&(!i.customId.startsWith('nmi:submit:')||Number.isSafeInteger(r.expiresAtMs)&&clock()<r.expiresAtMs)){
        if(opening&&id(r.channelId))payload={content:`Intake channel: <#${r.channelId}>. Write the report there, then preview it.`,components:[{type:1,components:[button('Preview latest report','nmi:preview')]}]};
        else if(i.customId==='nmi:preview'&&id(r.sourceMessageId)&&id(r.channelId)&&/^[a-f0-9-]{36}$/.test(r.token)&&/^[a-f0-9]{64}$/.test(r.digest))
          payload={content:`Selected source: https://discord.com/channels/${guildId}/${r.channelId}/${r.sourceMessageId}\nFingerprint: ${r.digest}\nConfirm this exact source; report text is not copied into this control message.`,components:[{type:1,components:[button('Submit this report',`nmi:submit:${r.token}`)]}]};
        else if(i.customId.startsWith('nmi:submit:'))payload={content:'Submission acknowledged. Use the approved record workspace for current status.',components:[{type:1,components:[button('Preview latest report','nmi:preview')]}]};
      }
      const message=await i.editReply({...payload,embeds:[],allowedMentions:{parse:[]}});
      if(opening&&id(message?.id)&&message.flags?.has?.(64)===true)owners.set(message.id,{actorId:i.user.id,until:clock()+300000});
      else if(!opening&&owners.has(i.message.id))owners.set(i.message.id,{actorId:i.user.id,until:clock()+300000});
      return true;
    }catch{return true;}
  },dispose(){stopped=true;owners.clear();coordinator.dispose();}});
}
