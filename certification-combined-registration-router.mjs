import { isGeneralRegistrationScope, isGeneralRegistrationActor } from './certification-general-registration.mjs';
export function createCombinedRegistrationRouter({settings,policy,base,registration,learner,ownerDecisions}={}) {
  if(settings?.combined!==true||settings.enabled!==true||!Array.isArray(settings.studentIds)||
     ['classify','allowsStudent','allowsButton','allowsModal'].some(k=>typeof policy?.[k]!=='function')||
     [base,registration,learner,ownerDecisions].some(fn=>typeof fn!=='function')||
     [base,ownerDecisions].some(fn=>typeof fn.initialize!=='function'||typeof fn.dispose!=='function'))throw Error('Complete combined runtime dependencies required');
  if (settings.generalMembers === true && !isGeneralRegistrationScope(settings)) throw Error('Valid general member scope required');
  const s=Object.freeze({...settings,studentIds:Object.freeze([...settings.studentIds])});
  let disposed=false,ready=false,initializing=null,closing=null;const active=new Set();
  const ownPrivate=i=>{const m=i.message,origin=m?.interactionMetadata?.user?.id||m?.interaction?.user?.id;return m?.flags?.has?.(64)===true&&origin===i.user?.id&&typeof i.client?.user?.id==='string'&&m.author?.id===i.client.user.id;};
  const hold=async i=>{const p={content:'This academy action is unavailable. No operation was admitted.',embeds:[],components:[],allowedMentions:{parse:[]}};if(i.deferred||i.replied)await i.followUp({...p,flags:64});else await i.reply({...p,flags:64});return true;};
  const kind=i=>{const b=i.isButton?.()===true,m=i.isModalSubmit?.()===true,v=i.isStringSelectMenu?.()===true;return [b,m,v].filter(Boolean).length!==1?null:b?'button':m?'modal':'menu';};
  const namespace=id=>typeof id==='string'&&/^cert:(?:course|cr):/.test(id);
  function destination(i){
    const actor=i.user?.id,id=i.customId,k=kind(i),owner=actor===s.ownerId;
    const ownerHome=owner&&s.generalMembers===true&&k==='button'&&/^cert:initial:(?:home|status|help)$/.test(id);
    if(!k||typeof actor!=='string'||!/^[0-9]{17,20}$/.test(actor)||typeof id!=='string'||i.guildId!==s.guildId||i.guild?.id!==s.guildId||(i.message?.flags?.has?.(64)===true&&!ownPrivate(i))||(owner&&!ownerHome&&i.channelId!==s.adminChannelId))return null;
    if(s.generalMembers===true&&!owner&&!isGeneralRegistrationActor(i,s))return null;
    if(ownerHome)return 'base';
    const classified=policy.classify(i);
    if(id.startsWith('cert:review:'))return owner&&classified==='decision'?'decision':null;
    if(id.startsWith('cert:register:'))return owner&&classified==='registration'?'registration':null;
    if(id.startsWith('cert:invite:'))return !owner&&classified==='learner'?'learner':null;
    if(id.startsWith('cert:access:'))return owner&&s.generalMembers===true&&classified==='management'?'base':null;
    if(id.startsWith('cert:courselife:'))return owner?'base':null;
    if(namespace(id))return 'base';
    if(owner&&classified==='read')return 'base';
    if(!owner&&k==='button'&&/^cert:(?:initial:(?:home|status|help)|learner:(?:home|status))$/.test(id))return 'base';
    return null;
  }
  const json=v=>typeof v?.toJSON==='function'?v.toJSON():v;
  function adapt(i){
    const actor=i.user.id,owner=actor===s.ownerId;let privateReply=i.ephemeral===true;
    const allowedButton=id=>typeof id==='string'&&(namespace(id)||(owner&&id.startsWith('cert:courselife:'))||policy.allowsButton(actor,id)||(!owner&&/^cert:(?:initial:(?:home|status|help)|learner:(?:home|status))$/.test(id)));
    function present(p){
      if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Structured private payload required');
      return {...p,allowedMentions:{parse:[]},components:(p.components||[]).map((raw,r)=>{
        const row=json(raw);if(row?.type!==1||!Array.isArray(row.components))throw Error('Unsupported row');
        return {...row,components:row.components.map((raw,c)=>{
          const item=json(raw);
          if(item?.type===2){if(allowedButton(item.custom_id))return {...item};const {url,sku_id,...rest}=item;return {...rest,style:2,disabled:true,custom_id:`cert:combined:disabled:${r}:${c}`};}
          if(item?.type===3&&owner&&item.custom_id==='cert:admin:section'){const options=(item.options||[]).filter(o=>['overview','enrollments','labs','students','courses'].includes(o.value));return {...item,options,disabled:item.disabled===true||!options.length};}
          if(item?.type===3&&owner&&item.custom_id?.startsWith('cert:courselife:assign:'))return {...item};
          if([3,5,6,7,8].includes(item?.type))return {...item,disabled:true};throw Error('Unsupported component');
        })};
      })};
    }
    return new Proxy(i,{get(target,key){
      // Filter legacy controls before trusted card conversion; retain private transport guards.
      if(key===Symbol.for('neptuneguard.academy.course-card-transport'))return async(method,p,convert)=>{
        if(!['reply','editReply','update'].includes(method)||typeof convert!=='function')throw Error('Invalid card transport');
        if(method==='editReply'&&!privateReply&&!ownPrivate(i))throw Error('Private reply required');
        if(method==='update'&&!ownPrivate(i))throw Error('Own private message required');
        const payload=convert(present(p));
        const result=await target[method](method==='reply'?{...payload,flags:(payload.flags||0)|64}:payload);
        if(method==='reply')privateReply=true;
        return result;
      };
      if(['reply','followUp'].includes(key))return async p=>{const result=await target[key]({...present(p),flags:64});privateReply=true;return result;};
      if(key==='editReply')return p=>{if(!privateReply&&!ownPrivate(i))throw Error('Private reply required');return target.editReply(present(p));};
      if(key==='update')return p=>{if(!ownPrivate(i))throw Error('Own private message required');return target.update(present(p));};
      if(key==='deferReply')return async()=>{const result=await target.deferReply({flags:64});privateReply=true;return result;};
      if(key==='deferUpdate')return()=>{if(!ownPrivate(i))throw Error('Own private message required');privateReply=true;return target.deferUpdate();};
      if(key==='showModal')return p=>{p=json(p);if(!policy.allowsModal(actor,p?.custom_id)&&!(typeof p?.custom_id==='string'&&(p.custom_id.startsWith('cert:cr:')||/^cert:course:submit:[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(p.custom_id))))throw Error('Modal not admitted');return target.showModal(p);};
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
  }
  const handlers={base,registration,learner,decision:ownerDecisions};
  const route=async i=>{
    if(disposed||!ready)return hold(i);const target=destination(i);if(!target)return hold(i);
    const task=Promise.resolve().then(async()=>{if(disposed||!ready)return hold(i);if(await handlers[target](adapt(i),policy)!==true)throw Error('Admitted combined action not handled');return true;});
    active.add(task);try{return await task;}finally{active.delete(task);}
  };
  route.initialize=()=>{
    if(disposed)return Promise.reject(Error('Combined runtime disposed'));
    if(!initializing)initializing=Promise.resolve().then(async()=>{await base.initialize();if(disposed)throw Error('Combined startup stopped');const result=await ownerDecisions.initialize();if(disposed||result?.ready!==true||ownerDecisions.ready!==true)throw Error('Decision readiness unconfirmed');ready=true;return Object.freeze({ready:true});}).catch(error=>{ready=false;throw error;});return initializing;
  };
  route.dispose=()=>{
    if(closing)return closing;disposed=true;ready=false;
    closing=(async()=>{await Promise.allSettled([...active,...(initializing?[initializing]:[])]);const results=await Promise.allSettled([base,ownerDecisions].map(fn=>Promise.resolve().then(()=>fn.dispose())));if(results.some(r=>r.status==='rejected'))throw Error('Combined runtime drain or disposal failed');})();return closing;
  };
  return route;
}
