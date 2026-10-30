import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createFictionalStagingResourceOwner as createOwner} from './fictional-intake-staging-resource-owner.mjs';
import {createFictionalIntakeStagingSession as createSession} from './fictional-intake-staging-session.mjs';
import {createFictionalIntakeStagingLifecycle as createLifecycle} from './fictional-intake-staging-lifecycle.mjs';
const config={enabled:true,mode:'fictional-intake-staging',fictionalReportsOnly:true,staging:{guildId:'100000000000000001',botId:'100000000000000002',entryChannelId:'100000000000000003',operatorId:'100000000000000004',database:{host:'stage.invalid',port:'5432',name:'fictional_intake'}},production:{guildId:'200000000000000001',botId:'200000000000000002',database:{host:'production.invalid',port:'5432',name:'academy'}}};
async function bounded(work){let timer;try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('stop did not settle')),300);})]);}finally{clearTimeout(timer);}}
function fixture(phase){
 let enter,release,reject;const entered=new Promise(r=>enter=r),gate=new Promise((yes,no)=>{release=yes;reject=no;});
 const f={entered,release,reject,credentials:0,discordLoads:0,pgLoads:0,clients:0,pools:0,logins:0,destroys:0,ends:0,verified:0};
 const credentials={discordToken:'fixture-only-token',databasePassword:'fixture-only-password'};
 class Client extends EventEmitter{
  constructor(){super();f.clients++;f.client=this;this.user={id:config.staging.botId};}
  isReady(){return true;}
  login(){f.logins++;if(phase==='login'){enter();return gate;}if(phase==='ready'){enter();return Promise.resolve('fixture-only-token');}if(phase==='error-event'){this.emit('error',Error('fixture-private-marker'));return Promise.resolve('fixture-only-token');}this.emit('clientReady');return Promise.resolve('fixture-only-token');}
  async destroy(){f.destroys++;}
 }
 class Pool extends EventEmitter{constructor(){super();f.pools++;}async end(){f.ends++;}}
 const sdk={Client,Events:{ClientReady:'clientReady'},GatewayIntentBits:{Guilds:1,GuildMessages:512,MessageContent:32768}},pg={Pool};
 f.lateValue={credentials,discord:sdk,postgres:pg,login:'fixture-only-token',ready:null}[phase];
 f.owner=createOwner(config,{expectedRole:'fictional_stage_worker',readyTimeoutMs:5000,
  readCredentials({signal}){f.signal=signal;f.credentials++;if(phase==='credentials'){enter();return gate;}return credentials;},
  loadDiscord(){f.discordLoads++;if(phase==='discord'){enter();return gate;}return sdk;},
  loadPostgres(){f.pgLoads++;if(phase==='postgres'){enter();return gate;}return pg;}});
 f.makeSession=()=>createSession(config,{courseKey:'demo-course',exerciseKey:'demo-exercise'},{...f.owner,coordinator:{},storage:{},now:()=>1000000,async verifyIsolation(){f.verified++;return true;}});
 f.app=createLifecycle(config,{createSession:()=>f.makeSession()});return f;
}
for(const phase of ['credentials','discord','postgres','login','ready'])test('lifecycle stop interrupts pending '+phase+' and ignores late results',async()=>{
 const f=fixture(phase),startup=f.app.start(),rejected=assert.rejects(startup,e=>e.message==='Staging startup failed');
 await bounded(f.entered);const stop=f.app.stop();assert.equal(f.app.ready,false);assert.equal(f.signal.aborted,true);await bounded(Promise.all([stop,rejected]));
 assert.equal(f.app.state,'stopped');assert.equal(f.verified,0);assert.equal(f.owner.isReady(),false);
 const allocated=phase==='login'||phase==='ready';assert.equal(f.destroys,allocated?1:0);assert.equal(f.ends,allocated?1:0);
 const counters=[f.discordLoads,f.pgLoads,f.clients,f.pools,f.logins];f.release(f.lateValue);f.client?.emit('clientReady');await new Promise(r=>setImmediate(r));
 assert.deepEqual([f.discordLoads,f.pgLoads,f.clients,f.pools,f.logins],counters);assert.equal(f.app.ready,false);await f.app.stop();assert.equal(f.destroys,allocated?1:0);assert.equal(f.ends,allocated?1:0);
});
test('late rejected credential lookup is consumed after stop',async()=>{const f=fixture('credentials'),startup=f.app.start(),rejected=assert.rejects(startup,/Staging startup failed/);await f.entered;await bounded(Promise.all([f.app.stop(),rejected]));f.reject(Error('fixture-private-marker'));await new Promise(r=>setImmediate(r));assert.equal(f.clients,0);});
test('synchronous gateway error during login has no unhandled rejection',async()=>{const f=fixture('error-event');await bounded(assert.rejects(f.app.start(),e=>e.message==='Staging startup failed'));assert.equal(f.ends,1);assert.equal(f.destroys,1);assert.equal(f.app.ready,false);});
test('direct session close cancels pending startup before waiting',async()=>{const f=fixture('credentials'),s=f.makeSession(),start=s.start(),rejected=assert.rejects(start,/Staging resources unavailable/);await f.entered;await bounded(Promise.all([s.close(),rejected]));assert.equal(f.signal.aborted,true);assert.equal(s.isReady(),false);f.release(f.lateValue);});
test('requestStop is synchronous and idempotent',async()=>{const f=fixture('credentials'),s=f.makeSession(),start=s.start(),rejected=assert.rejects(start,/Staging resources unavailable/);await f.entered;assert.equal(s.requestStop(),undefined);assert.equal(f.signal.aborted,true);s.requestStop();await bounded(Promise.all([s.close(),s.close(),rejected]));assert.equal(f.clients,0);});
test('disabled path supports stop without touching ports',async()=>{const trap=new Proxy({},{get(){throw Error('unexpected access');}}),s=createSession({},trap,trap),o=createOwner({},trap);s.requestStop();o.cancelStartup();await s.close();await o.closeResources();assert.equal(s.isReady(),false);});
test('late-created session after lifecycle stop is closed without starting',async()=>{let release;const factory=new Promise(r=>release=r),f=fixture('credentials'),s=f.makeSession(),app=createLifecycle(config,{createSession:()=>factory});const startup=app.start(),stop=app.stop();release(s);assert.equal(await bounded(startup),false);await bounded(stop);assert.equal(f.credentials,0);assert.equal(app.state,'stopped');});
