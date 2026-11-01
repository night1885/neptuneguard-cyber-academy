import {readFile} from 'node:fs/promises';
import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
import {createStagingPilot} from './staging-pilot.mjs';
let stage='manifest-read',pilot;
const report=label=>console.log('Staging diagnostic: '+label);
async function loadDiscord(){
 const sdk=await import('discord.js');
 return {...sdk,Client:class extends sdk.Client{
  constructor(options){
   super({...options,intents:[...options.intents,sdk.GatewayIntentBits.GuildMembers],makeCache:sdk.Options.cacheWithLimits({MessageManager:0})});
   this.once(sdk.Events.ClientReady,()=>report('discord-ready'));
   this.on('shardDisconnect',event=>report(event?.code===4014?'discord-disallowed-intents':'discord-disconnected'));
   this.on('error',()=>report('discord-client-error'));
   this.on('shardError',()=>report('discord-shard-error'));
  }
  async login(token){report('discord-login-attempt');try{return await super.login(token);}catch{report('discord-login-failed');throw Error('Staging connection unavailable');}}
 }};
}
function databaseCategory(error){
 const categories=new Map([['28P01','authentication'],['28000','authorization'],['42501','permission'],['3D000','database-not-found'],['42P01','table-not-found'],['42883','function-not-found'],['ENOTFOUND','dns'],['EAI_AGAIN','dns'],['ECONNREFUSED','connection-refused'],['ETIMEDOUT','connection-timeout'],['ECONNRESET','connection-reset'],['CERT_HAS_EXPIRED','tls-certificate-expired'],['DEPTH_ZERO_SELF_SIGNED_CERT','tls-self-signed'],['SELF_SIGNED_CERT_IN_CHAIN','tls-chain'],['UNABLE_TO_VERIFY_LEAF_SIGNATURE','tls-chain'],['UNABLE_TO_GET_ISSUER_CERT_LOCALLY','tls-chain'],['ERR_TLS_CERT_ALTNAME_INVALID','tls-hostname'],['57014','query-cancelled'],['EHOSTUNREACH','network-unreachable'],['ENETUNREACH','network-unreachable'],['EPIPE','connection-broken'],['53300','connection-limit'],['57P03','database-not-ready'],['08P01','protocol']]);
 const messages=new Map([['The server does not support SSL connections','tls-not-supported'],['There was an error establishing an SSL connection','tls-negotiation'],['SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string','authentication-password-type'],['SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string','authentication-password-empty'],['Connection terminated unexpectedly','connection-terminated'],['Connection terminated','connection-terminated'],['Connection terminated due to connection timeout','connection-timeout'],['timeout exceeded when trying to connect','connection-timeout'],['Query read timeout','query-timeout'],['Cannot use a pool after calling end on the pool','pool-closed']]);
 const pending=[error],seen=new Set();let aggregate=false,hasCode=false,unreadable=false;
 for(let count=0;pending.length&&count<16;count++){
  const current=pending.shift();
  if(!current||typeof current!=='object'||seen.has(current))continue;
  seen.add(current);
  try{
   const code=current.code,category=categories.get(code);if(category)return category;
   const messageCategory=messages.get(current.message);if(messageCategory)return messageCategory;
   if(code!==undefined&&code!==null&&code!=='')hasCode=true;
   if(current.cause&&pending.length<16)pending.push(current.cause);
   if(Array.isArray(current.errors)){aggregate=true;for(const child of current.errors.slice(0,8)){if(pending.length>=16)break;pending.push(child);}}
  }catch{unreadable=true;}
 }
 if(hasCode)return 'code-unrecognized';
 if(unreadable)return 'error-properties-unreadable';
 if(aggregate)return 'aggregate-no-recognized-code';
 return seen.size?'code-missing':'non-object-error';
}
function reportStorageContract(value,expected){
 const row=value?.rows?.[0];
 if(!row){report('storage-contract-row-missing');return;}
 const checks=[['database-identity',row.db===expected.databaseName],['worker-role-identity',row.actor===expected.expectedRole],['schema-version',row.contract===1],['non-elevated-role',row.elevated===false],['no-schema-create',row.can_create===false],['no-direct-table-access',row.table_access===false]];
 for(const [name,ok] of checks)report('storage-contract-'+name+(ok?'-passed':'-failed'));
 report(checks.every(([,ok])=>ok)?'storage-contract-checks-passed':'storage-contract-checks-failed');
}
async function loadPostgres(expected){
 const pg=await import('pg'),Base=pg.Pool??pg.default?.Pool;
 return {Pool:class extends Base{
  query(...args){
   report('database-query-attempt');
   const fail=error=>{report('database-query-failed-'+databaseCategory(error));throw Error('Staging database unavailable');};
   let result;try{result=super.query(...args);}catch(error){return fail(error);}
   if(result&&typeof result.then==='function')return result.then(value=>{report('database-query-succeeded');if(typeof args[0]==='string'&&args[0].startsWith('SELECT current_database() AS db,current_user AS actor,fi_stage.contract() AS contract,'))reportStorageContract(value,expected);return value;},fail);
   return result;
  }
 }};
}
try {
 const text=await readFile(process.argv[2]??'/etc/secrets/staging-manifest.json','utf8');
 stage='manifest-json';
 const manifest=JSON.parse(text);
 stage='profile-validation';
 const inspected=inspectFictionalIntakeStagingProfile(manifest.profile??{});
 if(!inspected.ok)throw Error();
 if(!inspected.enabled){report('manifest-disabled');}
 else if(process.env.FICTIONAL_STAGE_RUN!=='true'){report('run-flag-disabled');}
 else {
  stage='credential-presence';
  if(!process.env.FICTIONAL_STAGE_TOKEN||!process.env.FICTIONAL_STAGE_DB_PASSWORD)throw Error();
  report('credentials-present-not-validated');
  stage='pilot-construction';
  pilot=createStagingPilot(manifest,{loadDiscord,loadPostgres:()=>loadPostgres({databaseName:inspected.profile.staging.database.name,expectedRole:manifest.expectedRole})});
  stage='live-startup';
  if(await pilot.start()!==true)throw Error();
  report('started-operational-readiness-not-certified');
 }
} catch {
 console.error('Staging diagnostic: failed-at-'+stage);
 process.exitCode=1;
}
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{void pilot?.stop().catch(()=>{console.error('Staging diagnostic: cleanup-attention');process.exitCode=1;});});
