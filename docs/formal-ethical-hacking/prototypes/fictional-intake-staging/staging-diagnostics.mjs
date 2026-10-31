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
async function loadPostgres(){
 const pg=await import('pg'),Base=pg.Pool??pg.default?.Pool;
 return {Pool:class extends Base{
  query(...args){
   report('database-query-attempt');
   const fail=()=>{report('database-query-failed');throw Error('Staging database unavailable');};
   let result;try{result=super.query(...args);}catch{return fail();}
   if(result&&typeof result.then==='function')return result.then(value=>{report('database-query-succeeded');return value;},fail);
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
  pilot=createStagingPilot(manifest,{loadDiscord,loadPostgres});
  stage='live-startup';
  if(await pilot.start()!==true)throw Error();
  report('started-operational-readiness-not-certified');
 }
} catch {
 console.error('Staging diagnostic: failed-at-'+stage);
 process.exitCode=1;
}
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{void pilot?.stop().catch(()=>{console.error('Staging diagnostic: cleanup-attention');process.exitCode=1;});});
