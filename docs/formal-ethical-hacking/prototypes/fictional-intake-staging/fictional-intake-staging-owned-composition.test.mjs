import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createFictionalStagingResourceOwner as createOwner} from './fictional-intake-staging-resource-owner.mjs';
import {createFictionalIntakeStagingSession as createSession} from './fictional-intake-staging-session.mjs';
import {createFictionalIntakeStagingLifecycle as createLifecycle} from './fictional-intake-staging-lifecycle.mjs';
const G='100000000000000001',B='100000000000000002',C='100000000000000003',A='100000000000000004',M='100000000000000005',P='200000000000000001';
const R='11111111-1111-1111-1111-111111111111',Q='22222222-2222-2222-2222-222222222222',S='33333333-3333-3333-3333-333333333333';
// Actual owner/session/lifecycle/verifier/journey/boundaries; scripted transports/storage.
function fixture(){
 const config={enabled:true,mode:'fictional-intake-staging',fictionalReportsOnly:true,staging:{guildId:G,botId:B,entryChannelId:C,operatorId:A,database:{host:'stage.invalid',port:'5432',name:'fictional_intake'}},production:{guildId:P,botId:'200000000000000002',database:{host:'production.invalid',port:'5432',name:'academy'}}};
 const f={reads:0,logins:0,queries:0,checks:0,destroys:0,ends:0,ready:true,loginFails:false,emitReady:true,verified:true,events:[],edits:[],denied:new Set(),db:{database_name:'fictional_intake',role_name:'fictional_stage_worker',elevated:false}};
 const guild={id:G,roles:{async fetch(){}},members:{async fetch({user,force}){assert.equal(force,true);return {id:user,guild:{id:G},user:{bot:user===B}};}},channels:{async fetch(id,{force}){assert.equal(force,true);assert.equal(id,C);return {id:C,guildId:G,type:0,permissionsFor(member){return {has:p=>!f.denied.has(member.id+':'+p)};}};}}};
 class Client extends EventEmitter{
  constructor(options){super();f.client=this;f.clientOptions=options;this.user={id:B};this.guilds={async fetch(o){assert.deepEqual(o,{guild:G,force:true});return guild;}};}
  isReady(){return f.ready;}
  async login(token){assert.equal(token,'fixture-only-token');f.logins++;if(f.loginFails)throw Error('fixture-private-marker');if(f.wrongBot)this.user.id=config.production.botId;if(f.emitReady)this.emit('clientReady');return token;}
  async destroy(){f.destroys++;if(f.destroyFails)throw Error('fixture-private-marker');}
 }
 class Pool extends EventEmitter{constructor(options){super();f.pool=this;f.poolOptions=options;}async query(sql){assert.match(sql,/^SELECT current_database\(\)/);f.queries++;return {rows:[f.db]};}async end(){f.ends++;}}
 f.owner=createOwner(config,{expectedRole:'fictional_stage_worker',readyTimeoutMs:25,async readCredentials(){f.reads++;return {discordToken:'fixture-only-token',databasePassword:'fixture-only-password'};},loadDiscord:async()=>({Client,Events:{ClientReady:'clientReady'},GatewayIntentBits:{Guilds:1,GuildMessages:512,MessageContent:32768}}),loadPostgres:async()=>({Pool})});
 const coordinator={async prepare(){f.events.push('prepare');return {ok:true,channelId:C};},async preview(){f.events.push('preview');return {ok:true,channelId:C,sourceMessageId:M,token:Q,digest:'a'.repeat(64)};},async submit(ctx,token,request){assert.equal(token,Q);assert.equal(request,Q);f.events.push('submit');return {ok:true,expiresAtMs:87400000};},async recoverSubmission(ctx,request){assert.equal(request,Q);f.events.push('recover');return {ok:true,reportId:S,revision:1,expiresAtMs:87400000};},dispose(){throw Error('borrowed coordinator must not be disposed');}};
 const storage={ready:true,async resolve(){return {recordId:R,learnerId:A,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:1};},async authorize(){return true;},async discoverReceipts(){f.events.push('discover');return [{requestId:Q,reportId:S,revision:1,expiresAtMs:87400000}];}};
 const ports={...f.owner,coordinator,storage,now:()=>1000000,async verifyIsolation(){f.checks++;return f.verified;}};
 f.app=createLifecycle(config,{createSession(){return createSession(config,{courseKey:'demo-course',exerciseKey:'demo-exercise'},ports);}});
 f.i=(customId,patch={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(){this.replied=true;},async editReply(p){f.edits.push(p);return {id:M,flags:{has:n=>n===64}};},...patch});
 return f;
}
test('owned startup, concrete verification, real intake/recovery and once-only shutdown',async t=>{
 const f=fixture();t.after(()=>f.app.stop());assert.equal(f.reads,0);assert.equal(f.logins,0);assert.equal(await f.app.start(),true);assert.equal(f.queries,1);assert.equal(f.checks,1);assert.equal(f.app.operationalReady,false);
 for(const id of ['nmi:prepare','nmi:preview',`nmi:submit:${Q}`,'nmr:list'])assert.equal(await f.app.handle(f.i(id)),true);
 const token=f.edits.at(-1).components[0].components[0].custom_id;assert.equal(await f.app.handle(f.i(token)),true);assert.match(f.edits.at(-1).content,/Submission receipt verified/);assert.deepEqual(f.events,['prepare','preview','submit','discover','recover']);
 assert.equal(f.poolOptions.host,'stage.invalid');assert.equal(f.poolOptions.user,'fictional_stage_worker');assert.deepEqual(f.poolOptions.ssl,{rejectUnauthorized:true});await Promise.all([f.app.stop(),f.app.stop()]);assert.equal(f.destroys,1);assert.equal(f.ends,1);assert.equal(f.app.ready,false);assert.equal(await f.app.handle(f.i('nmi:prepare')),false);
});
test('wrong backend fails before dispatch and closes owned resources',async()=>{const f=fixture();f.db.database_name='academy';await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.checks,0);assert.deepEqual(f.events,[]);assert.equal(f.destroys,1);assert.equal(f.ends,1);});
test('supplemental isolation remains mandatory',async()=>{const f=fixture();f.verified=false;await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.queries,1);assert.equal(f.checks,1);assert.deepEqual(f.events,[]);assert.equal(f.ends,1);});
test('login failure exposes neutral lifecycle error and cleans partial startup',async()=>{const f=fixture();f.loginFails=true;await assert.rejects(f.app.start(),e=>e.message==='Staging startup failed');assert.equal(f.queries,0);assert.equal(f.destroys,1);assert.equal(f.ends,1);});
test('wrong logged-in bot never reaches verification or interaction',async()=>{const f=fixture();f.wrongBot=true;await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.queries,0);assert.deepEqual(f.events,[]);assert.equal(f.ends,1);});
test('ready deadline propagates through session cleanup',async()=>{const f=fixture();f.emitReady=false;await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.destroys,1);assert.equal(f.ends,1);assert.equal(f.app.ready,false);});
test('pool background failure blocks real recovery admission',async t=>{const f=fixture();t.after(()=>f.app.stop());await f.app.start();f.pool.emit('error',Error('fixture-private-marker'));assert.equal(f.app.ready,false);assert.equal(await f.app.handle(f.i('nmr:list')),false);assert.deepEqual(f.events,[]);});
test('gateway reconnect latches admission off',async t=>{const f=fixture();t.after(()=>f.app.stop());await f.app.start();f.client.emit('shardReconnecting',0);assert.equal(f.app.ready,false);assert.equal(await f.app.handle(f.i('nmi:prepare')),false);assert.deepEqual(f.events,[]);});
test('cleanup failure preserves cleanup-failed state and still ends pool',async()=>{const f=fixture();await f.app.start();f.destroyFails=true;await assert.rejects(f.app.stop(),e=>e.message==='Staging cleanup requires attention');assert.equal(f.app.state,'cleanup-failed');assert.equal(f.ends,1);assert.equal(f.app.ready,false);});
test('non-operator cannot enter actual boundary or storage',async t=>{const f=fixture();t.after(()=>f.app.stop());await f.app.start();assert.equal(await f.app.handle(f.i('nmi:prepare',{user:{id:'100000000000000099'}})),false);assert.equal(await f.app.handle(f.i('nmr:list',{user:{id:'100000000000000099'}})),false);assert.deepEqual(f.events,[]);});
test('missing Discord entry permission denies before SQL',async()=>{const f=fixture();f.denied.add(B+':SendMessages');await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.queries,0);assert.equal(f.ends,1);assert.deepEqual(f.events,[]);});
