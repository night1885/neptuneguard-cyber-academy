const discordId=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const sections=new Set(['overview','enrollments','labs','students','courses']);
const banner='Read-only owner preview: record changes and learner workflows are blocked.';
const unavailable=()=>new Error('Read-only preview query unavailable');
export function readReadOnlyPreviewFlag(env={}){
  const flag=env.CERTIFICATION_READ_ONLY_PREVIEW;
  if(flag!==undefined&&flag!=='true'&&flag!=='false')throw new Error('Invalid read-only preview flag');
  return flag==='true';
}
function readButton(id){
  return typeof id==='string'&&(
    /^cert:admin:(overview|enrollments|labs):\d{1,6}$/.test(id)||
    /^cert:admin:courses:(\d{1,6}|course:\d{1,6}:\d{1,6}|module:\d{1,6}:\d{1,6}:\d{1,6})$/.test(id)||
    /^cert:students:(list:\d{1,6}|detail:\d{17,20})$/.test(id)||
    /^cert:dir:(all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked):\d{1,5}:[A-Za-z0-9-]{0,48}$/.test(id)||
    /^cert:audit:\d{1,5}$/.test(id)||['cert:dir:search','cert:console:settings'].includes(id));
}
function allowed(i){
  if(i.isStringSelectMenu?.())return i.customId==='cert:admin:section'&&i.values?.length===1&&sections.has(i.values[0]);
  if(i.isModalSubmit?.())return i.customId==='cert:dir:search';
  return i.isButton?.()===true&&readButton(i.customId);
}
const data=v=>typeof v?.toJSON==='function'?v.toJSON():v;
function presentation(payload){
  const components=Array.isArray(payload.components)?payload.components.map((row,r)=>{
    const value=data(row);return{...value,components:value.components.map((component,c)=>{
      const item=data(component);
      if(item.type===2&&!readButton(item.custom_id))return{...item,disabled:true,...(typeof item.custom_id==='string'?{custom_id:`cert:preview:disabled:${r}:${c}`}:{})};
      if(item.type===3){
        if(item.custom_id!=='cert:admin:section')return{...item,disabled:true};
        const options=item.options.filter(option=>sections.has(option.value));return{...item,options,disabled:item.disabled===true||options.length===0};
      }
      if([5,6,7,8].includes(item.type))return{...item,disabled:true};
      return{...item};
    })};
  }):[];
  return{...payload,content:(banner+(payload.content?'\n'+payload.content:'')).slice(0,2000),allowedMentions:{parse:[]},components};
}
export function createReadOnlyPreviewRouter(route,config,guildId){
  if(typeof route!=='function'||!discordId(config?.ownerId)||!discordId(guildId))throw new Error('Explicit read-only owner and guild required');
  const preview=async i=>{
    if(config.enabled!==true||i.user?.id!==config.ownerId||i.guildId!==guildId||!allowed(i)){
      const payload={content:banner,embeds:[],components:[],allowedMentions:{parse:[]},flags:64};
      if(i.deferred||i.replied)await i.followUp(payload);else await i.reply(payload);return true;
    }
    const adapter=new Proxy(i,{get(target,key){
      if(['reply','editReply','update'].includes(key))return payload=>target[key](presentation(payload));
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
    return route(adapter);
  };
  for(const name of ['initialize','dispose'])if(typeof route[name]==='function')preview[name]=()=>route[name]();
  return preview;
}
export function createReadOnlyPreviewPool(pool){
  if(typeof pool?.connect!=='function'||typeof pool.end!=='function')throw unavailable();
  return Object.freeze({
    async connect(){throw unavailable();},
    async query(sql,params){
      if(arguments.length>2||typeof sql!=='string'||(params!==undefined&&!Array.isArray(params)))throw unavailable();
      const text=sql.trim().replace(/;$/,'');
      if(!/^(SELECT|WITH)\b/i.test(text)||text.includes(';'))throw unavailable();
      let client;try{client=await pool.connect();}catch{throw unavailable();}
      let discard=false;
      try{await client.query('BEGIN READ ONLY');const result=await client.query(sql,params);await client.query('COMMIT');return result;}
      catch(error){try{await client.query('ROLLBACK');}catch{discard=true;}const safe=unavailable();if(typeof error?.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code))safe.code=error.code;throw safe;}
      finally{client.release(discard);}
    },
    end(){return pool.end();}
  });
}
