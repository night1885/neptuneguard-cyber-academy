const ids=['guildId','botId','entryChannelId','operatorId'];
const dbFields=['host','port','name'];
const snow=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const fail=()=>Object.freeze({ok:false,enabled:false,operationalReady:false,issue:'Invalid fictional intake staging profile'});
function record(value,keys){
 if(!value||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw Error();
 const descriptors=Object.getOwnPropertyDescriptors(value),copy=Object.create(null);
 if(Reflect.ownKeys(descriptors).length!==keys.length)throw Error();
 for(const key of keys){const d=descriptors[key];if(!d||!Object.hasOwn(d,'value'))throw Error();copy[key]=d.value;}
 return copy;
}
function database(value){
 const d=record(value,dbFields);
 if(typeof d.host!=='string'||! /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(d.host)||d.host.length>253||d.host.includes('..')||
  typeof d.port!=='string'||! /^[1-9][0-9]{0,4}$/.test(d.port)||Number(d.port)>65535||
  typeof d.name!=='string'||! /^[A-Za-z0-9_][A-Za-z0-9_-]{0,62}$/.test(d.name))throw Error();
 return Object.freeze({host:d.host.toLowerCase(),port:d.port,name:d.name});
}
// Pure configuration inspection only: no credentials, clients, pools or activation.
export function inspectFictionalIntakeStagingProfile(config={}){
 try{
  if(!config||![Object.prototype,null].includes(Object.getPrototypeOf(config)))return fail();
  const enabled=Object.getOwnPropertyDescriptor(config,'enabled');
  if(enabled&&!Object.hasOwn(enabled,'value'))return fail();
  if(!enabled||enabled.value!==true)return Object.freeze({ok:true,enabled:false,operationalReady:false});
  const c=record(config,['enabled','mode','fictionalReportsOnly','staging','production']);
  if(c.mode!=='fictional-intake-staging'||c.fictionalReportsOnly!==true)return fail();
  const s=record(c.staging,[...ids,'database']),p=record(c.production,['guildId','botId','database']);
  if(!ids.every(k=>snow(s[k]))||!snow(p.guildId)||!snow(p.botId)||s.guildId===p.guildId||s.botId===p.botId)return fail();
  const stagingDatabase=database(s.database),productionDatabase=database(p.database);
  if(dbFields.every(k=>stagingDatabase[k]===productionDatabase[k]))return fail();
  const profile=Object.freeze({mode:c.mode,fictionalReportsOnly:true,
   staging:Object.freeze({...Object.fromEntries(ids.map(k=>[k,s[k]])),database:stagingDatabase}),
   production:Object.freeze({guildId:p.guildId,botId:p.botId,database:productionDatabase})});
  return Object.freeze({ok:true,enabled:true,operationalReady:false,profile});
 }catch{return fail();}
}
