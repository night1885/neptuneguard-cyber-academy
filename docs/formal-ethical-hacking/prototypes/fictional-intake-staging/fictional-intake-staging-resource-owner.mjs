import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
const unavailable=()=>Error('Staging resources unavailable');
// Explicit owned SDK/pool startup only. No interaction listener, SQL or publication.
export function createFictionalStagingResourceOwner(config={},options={}){
 const inspected=inspectFictionalIntakeStagingProfile(config);
 if(!inspected.ok)throw unavailable();
 if(!inspected.enabled)return Object.freeze({enabled:false,operationalReady:false,isReady:()=>false,cancelStartup(){},startResources:async()=>{throw unavailable();},closeResources:async()=>{}});
 const profile=inspected.profile;
 const {expectedRole,readCredentials,readyTimeoutMs=5000,loadDiscord=()=>import('discord.js'),loadPostgres=()=>import('pg')}=options;
 if(typeof expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole)||typeof readCredentials!=='function'||
  ![loadDiscord,loadPostgres].every(f=>typeof f==='function')||!Number.isInteger(readyTimeoutMs)||readyTimeoutMs<10||readyTimeoutMs>60000)throw unavailable();
 let client,pool,started=false,closed=false,failed=false,startPromise,closePromise,cancelReady;
 const controller=new AbortController(),signal=controller.signal;
 const active=()=>{if(closed||failed)throw unavailable();};
 const invalidate=()=>{failed=true;cancelReady?.();};
 async function waitFor(work){
  active();let onAbort;
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(unavailable());signal.addEventListener('abort',onAbort,{once:true});});
  try{return await Promise.race([Promise.resolve().then(()=>{active();return work();}),aborted]);}
  finally{signal.removeEventListener('abort',onAbort);}
 }
 const isReady=()=>{try{return started&&!closed&&!failed&&client.isReady()===true&&client.user?.id===profile.staging.botId;}catch{return false;}};
 function cancelStartup(){closed=true;started=false;controller.abort();cancelReady?.();}
 function startResources(actualProfile){
  if(closed||failed)return Promise.reject(unavailable());
  try{if(JSON.stringify(actualProfile)!==JSON.stringify(profile))return Promise.reject(unavailable());}catch{return Promise.reject(unavailable());}
  if(!startPromise)startPromise=(async()=>{
   try{
    const credentials=await waitFor(()=>readCredentials({signal}));active();
    if(typeof credentials?.discordToken!=='string'||credentials.discordToken.length<1||credentials.discordToken.length>2000||
     credentials.discordToken.trim()!==credentials.discordToken||/[\r\n]/.test(credentials.discordToken)||
     typeof credentials.databasePassword!=='string'||credentials.databasePassword.length<1||credentials.databasePassword.length>8192||
     credentials.databaseCa!==undefined&&(typeof credentials.databaseCa!=='string'||credentials.databaseCa.length<1))throw unavailable();
    const sdk=await waitFor(()=>loadDiscord());active();const pg=await waitFor(()=>loadPostgres());active();
    const Pool=pg.Pool??pg.default?.Pool,bits=sdk.GatewayIntentBits,event=sdk.Events?.ClientReady;
    if(typeof Pool!=='function'||typeof sdk.Client!=='function'||!event||!bits||
     !['Guilds','GuildMessages','MessageContent'].every(k=>Number.isSafeInteger(bits[k])))throw unavailable();
    const d=profile.staging.database;
    pool=new Pool({host:d.host,port:Number(d.port),database:d.name,user:expectedRole,password:credentials.databasePassword,
     ssl:{rejectUnauthorized:true,...(credentials.databaseCa===undefined?{}:{ca:credentials.databaseCa})},
     options:'',application_name:'fictional-intake-staging',max:1,connectionTimeoutMillis:3000,idleTimeoutMillis:10000,
     statement_timeout:1000,query_timeout:1500,lock_timeout:500,idle_in_transaction_session_timeout:5000});
    pool.on('error',invalidate);
    client=new sdk.Client({intents:[bits.Guilds,bits.GuildMessages,bits.MessageContent],allowedMentions:{parse:[]}});
    for(const name of ['error','shardError','shardDisconnect','shardReconnecting'])client.on(name,invalidate);
    let timer,onReady;
    const ready=new Promise(resolve=>{onReady=resolve;client.once(event,onReady);});
    try{
     await waitFor(()=>{
      const deadline=new Promise((_,reject)=>{cancelReady=()=>reject(unavailable());timer=setTimeout(cancelReady,readyTimeoutMs);});
      const login=Promise.resolve().then(()=>{active();return client.login(credentials.discordToken);});
      return Promise.race([Promise.all([login,ready]),deadline]);
     });active();
    }finally{clearTimeout(timer);client.removeListener(event,onReady);cancelReady=undefined;}
    started=true;if(!isReady())throw unavailable();
    return Object.freeze({client,pool});
   }catch{failed=true;throw unavailable();}
  })();
  return startPromise;
 }
 function closeResources(){
  cancelStartup();
  if(!closePromise)closePromise=(async()=>{
   try{if(startPromise)await startPromise;}catch{}
   let cleanupFailed=false;
   try{await client?.destroy();}catch{cleanupFailed=true;}
   try{await pool?.end();}catch{cleanupFailed=true;}
   if(cleanupFailed)throw Error('Staging resource cleanup requires attention');
  })();
  return closePromise;
 }
 return Object.freeze({enabled:true,operationalReady:false,expectedRole,startResources,isReady,cancelStartup,closeResources});
}
