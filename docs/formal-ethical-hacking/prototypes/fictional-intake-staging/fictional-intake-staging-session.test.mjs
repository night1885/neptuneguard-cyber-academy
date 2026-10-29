import test from 'node:test';
import assert from 'node:assert/strict';
import {createFictionalIntakeStagingLifecycle as create} from './fictional-intake-staging-lifecycle.mjs';
import {createFictionalIntakeStagingSession as createSession} from './fictional-intake-staging-session.mjs';
const G='100000000000000001',P='200000000000000001',A='100000000000000004',C='100000000000000003',M='100000000000000005';
const R='11111111-1111-1111-1111-111111111111',Q='22222222-2222-2222-2222-222222222222',S='33333333-3333-3333-3333-333333333333';
function fixture(){
 const config={enabled:true,mode:'fictional-intake-staging',fictionalReportsOnly:true,staging:{guildId:G,botId:'100000000000000002',entryChannelId:C,operatorId:A,database:{host:'stage.invalid',port:'5432',name:'fictional_intake'}},production:{guildId:P,botId:'200000000000000002',database:{host:'production.invalid',port:'5432',name:'academy'}}};
 const f={now:1000000,ready:true,verified:true,starts:0,closes:0,disposals:0,events:[],edits:[],denials:[]};
 const coordinator={async prepare(){assert.equal(this,coordinator);f.events.push('prepare');return {ok:true,channelId:C};},async preview(){assert.equal(this,coordinator);f.events.push('preview');return {ok:true,channelId:C,sourceMessageId:M,token:Q,digest:'a'.repeat(64)};},async submit(ctx,token,request){assert.equal(this,coordinator);assert.equal(token,Q);assert.equal(request,Q);f.events.push('submit');return {ok:true,expiresAtMs:87400000};},async recoverSubmission(ctx,q){assert.equal(this,coordinator);assert.equal(q,Q);f.events.push('recover');return {ok:true,reportId:S,revision:1,expiresAtMs:87400000};},dispose(){f.disposals++;}};
 const storage={ready:true,async resolve(){assert.equal(this,storage);return {recordId:R,learnerId:A,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:1};},async authorize(){assert.equal(this,storage);return true;},async discoverReceipts(){assert.equal(this,storage);f.events.push('discover');return [{requestId:Q,reportId:S,revision:1,expiresAtMs:87400000}];}};
 const ports={coordinator,storage,now:()=>f.now,isReady:()=>f.ready,async startResources(){assert.equal(this,ports);f.starts++;},async verifyIsolation(){assert.equal(this,ports);return f.verified;},async closeResources(){assert.equal(this,ports);f.closes++;}};
 f.config=config;f.ports=ports;f.storage=storage;f.coordinator=coordinator;
 f.app=create(config,{createSession:profile=>createSession({enabled:true,...profile},{courseKey:'demo-course',exerciseKey:'demo-exercise'},ports)});
 f.i=(customId,patch={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){this.replied=true;f.denials.push(p);},async editReply(p){f.edits.push(p);return {id:M,flags:{has:n=>n===64}};},...patch});return f;
}
test('actual lifecycle/session/assembly/boundaries dispatch intake then recovery',async t=>{
 const f=fixture();t.after(()=>f.app.stop());assert.equal(f.starts,0);assert.equal(await f.app.start(),true);
 for(const id of ['nmi:prepare','nmi:preview',`nmi:submit:${Q}`,'nmr:list'])assert.equal(await f.app.handle(f.i(id)),true);
 const token=f.edits.at(-1).components[0].components[0].custom_id;assert.equal(await f.app.handle(f.i(token)),true);assert.match(f.edits.at(-1).content,/Submission receipt verified/);
 assert.deepEqual(f.events,['prepare','preview','submit','discover','recover']);await f.app.stop();assert.equal(f.closes,1);assert.equal(f.disposals,0);assert.equal((await f.coordinator.prepare({})).ok,true);assert.equal(f.disposals,0);
});
test('failed verification closes resources without provider use',async()=>{const f=fixture();f.verified=false;await assert.rejects(f.app.start(),/Staging startup failed/);assert.equal(f.closes,1);assert.deepEqual(f.events,[]);assert.equal(f.app.ready,false);});
test('storage readiness loss blocks actual assembly without provider invocation',async t=>{const f=fixture();t.after(()=>f.app.stop());await f.app.start();f.storage.ready=false;assert.equal(f.app.ready,false);assert.equal(await f.app.handle(f.i('nmi:prepare')),false);assert.equal(await f.app.handle(f.i('nmr:list')),false);assert.deepEqual(f.events,[]);});
test('operator and route checks precede actual boundary provider invocation',async t=>{const f=fixture();t.after(()=>f.app.stop());await f.app.start();assert.equal(await f.app.handle(f.i('nmi:prepare',{user:{id:'100000000000000099'}})),false);assert.equal(await f.app.handle(f.i('fws:open')),false);assert.deepEqual(f.events,[]);});
test('disabled session does not access providers',async()=>{const s=createSession({},new Proxy({},{get(){throw Error();}}),new Proxy({},{get(){throw Error();}}));await s.start();assert.equal(s.isReady(),false);assert.equal(await s.handle({}),false);await s.close();});
test('nonfictional exercise scope rejected',()=>{const f=fixture();assert.throws(()=>createSession(f.config,{courseKey:'real-course',exerciseKey:'real-exercise'},f.ports),/fictional exercise/);});
