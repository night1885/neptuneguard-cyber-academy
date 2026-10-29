import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetachedIntakeJourney as create} from './detached-intake-journey.mjs';
const G='100000000000000001',P='100000000000000002',C='100000000000000003',A='100000000000000004',M='100000000000000005';
const R='11111111-1111-1111-1111-111111111111',Q='22222222-2222-2222-2222-222222222222',S='33333333-3333-3333-3333-333333333333';
function fixture(){
 const f={now:1000000,parentReady:true,events:[],edits:[],denials:[],coordinatorDisposals:0,storageDisposals:0};
 const coordinator={
  async prepare(){assert.equal(this,coordinator);f.events.push('prepare');return {ok:true,channelId:C};},
  async preview(){assert.equal(this,coordinator);f.events.push('preview');return {ok:true,channelId:C,sourceMessageId:M,token:Q,digest:'a'.repeat(64)};},
  async submit(ctx,token,request){assert.equal(this,coordinator);assert.equal(token,Q);assert.equal(request,Q);f.events.push('submit');return {ok:true,expiresAtMs:f.now+86400000};},
  async recoverSubmission(ctx,q){assert.equal(this,coordinator);assert.equal(q,Q);f.events.push('recover');return {ok:true,reportId:S,revision:1,expiresAtMs:87400000};},
  dispose(){f.coordinatorDisposals++;}
 };
 const storage={ready:true,
  async resolve(){assert.equal(this,storage);f.events.push('resolve');return {recordId:R,learnerId:A,courseKey:'course',exerciseKey:'exercise',revision:1};},
  async authorize(){assert.equal(this,storage);return true;},async discoverReceipts(){assert.equal(this,storage);f.events.push('discover');return [{requestId:Q,reportId:S,revision:1,expiresAtMs:87400000}];},
  initialize(){throw Error('Must not initialize borrowed storage');},dispose(){f.storageDisposals++;}
 };
 const config={enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:P,entryChannelId:C,courseKey:'course',exerciseKey:'exercise'};
 const providers={coordinator,storage,isReady:()=>f.parentReady,now:()=>f.now};
 f.coordinator=coordinator;f.storage=storage;f.config=config;f.providers=providers;f.journey=create(config,providers);
 f.i=(customId,patch={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,
  async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){this.replied=true;f.denials.push(p);},async editReply(p){f.edits.push(p);return {id:M,flags:{has:n=>n===64}};},...patch});
 return f;
}
test('disabled before touching provider getters',async()=>{const providers=new Proxy({},{get(){throw Error('Unexpected provider access');}});const x=create({},providers);assert.equal(x.enabled,false);assert.equal(x.ready,false);assert.equal(await x.handle({customId:'nmi:prepare'}),false);x.dispose();});
test('explicit providers and isolated profile required',()=>{assert.throws(()=>create({enabled:true}));const f=fixture();try{assert.throws(()=>create({...f.config,productionGuildId:G},f.providers));assert.throws(()=>create({...f.config,mode:'production'},f.providers));}finally{f.journey.dispose();}});
test('actual boundaries dispatch full intake and recovery through one assembly',async t=>{const f=fixture();t.after(()=>f.journey.dispose());assert.equal(f.journey.ready,true);
 for(const id of ['nmi:prepare','nmi:preview',`nmi:submit:${Q}`,'nmr:list'])assert.equal(await f.journey.handle(f.i(id)),true);
 const token=f.edits.at(-1).components[0].components[0].custom_id;await f.journey.handle(f.i(token));assert.match(f.edits.at(-1).content,/verified/);
 assert.deepEqual(f.events.filter(x=>['prepare','preview','submit','discover','recover'].includes(x)),['prepare','preview','submit','discover','recover']);
 for(const p of f.edits){assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(p.embeds,[]);}
});
for(const id of ['fws:open','fnv:open','other',undefined])test('unrelated route ignored: '+id,async t=>{const f=fixture();t.after(()=>f.journey.dispose());assert.equal(await f.journey.handle(f.i(id)),false);assert.equal(f.events.length,0);});
for(const route of ['nmi:prepare','nmr:list'])for(const reason of ['parent','storage'])test(route+' rejects readiness loss: '+reason,async t=>{const f=fixture();t.after(()=>f.journey.dispose());if(reason==='parent')f.parentReady=false;else f.storage.ready=false;assert.equal(f.journey.ready,false);await f.journey.handle(f.i(route));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
for(const value of [1,'true',Promise.resolve(true)])test('readiness is literal synchronous true: '+String(value),async t=>{const f=fixture();t.after(()=>f.journey.dispose());f.parentReady=value;await f.journey.handle(f.i('nmr:list'));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
test('shared clock regression across route prefixes denies second provider access',async t=>{const f=fixture();t.after(()=>f.journey.dispose());await f.journey.handle(f.i('nmi:prepare'));f.now--;await f.journey.handle(f.i('nmr:list'));assert.deepEqual(f.events,['prepare']);assert.equal(f.denials.length,1);});
test('dispose is idempotent and never disposes borrowed providers',async()=>{const f=fixture();await f.journey.handle(f.i('nmi:prepare'));await f.journey.handle(f.i('nmr:list'));f.journey.dispose();f.journey.dispose();assert.equal(f.journey.ready,false);const before=f.events.length;assert.equal(await f.journey.handle(f.i('nmi:prepare')),false);assert.equal(await f.journey.handle(f.i('nmr:list')),false);assert.equal(f.events.length,before);assert.equal(f.coordinatorDisposals,0);assert.equal(f.storageDisposals,0);});
for(const route of ['nmi:prepare','nmr:list'])test('dispose suppresses pending '+route,async()=>{const f=fixture();let release,enter;const entered=new Promise(r=>{enter=r;});
 if(route==='nmi:prepare')f.coordinator.prepare=()=>new Promise(r=>{release=r;enter();});else f.storage.discoverReceipts=()=>new Promise(r=>{release=r;enter();});
 const pending=f.journey.handle(f.i(route));await entered;f.journey.dispose();release(route==='nmi:prepare'?{ok:true,channelId:C}:[]);await pending;assert.equal(f.edits.length,0);assert.equal(f.coordinatorDisposals,0);assert.equal(f.storageDisposals,0);
});
test('reconstruction cannot revive captured recovery controls',async t=>{const f=fixture();await f.journey.handle(f.i('nmr:list'));const token=f.edits.at(-1).components[0].components[0].custom_id;f.journey.dispose();f.journey=create(f.config,f.providers);t.after(()=>f.journey.dispose());const count=f.events.length;await f.journey.handle(f.i(token));assert.equal(f.events.length,count);assert.equal(f.denials.length,1);});
for(const route of ['nmi:prepare','nmr:list'])test('guild scope stays enforced: '+route,async t=>{const f=fixture();t.after(()=>f.journey.dispose());await f.journey.handle(f.i(route,{guildId:P}));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});

test('throwing parent readiness denies without provider use',async t=>{const f=fixture();f.journey.dispose();f.journey=create(f.config,{...f.providers,isReady(){throw Error('private readiness error');}});t.after(()=>f.journey.dispose());await f.journey.handle(f.i('nmi:prepare'));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
test('throwing storage readiness denies without provider use',async t=>{const f=fixture();t.after(()=>f.journey.dispose());Object.defineProperty(f.storage,'ready',{get(){throw Error('private storage error');}});await f.journey.handle(f.i('nmr:list'));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
test('rejected asynchronous readiness is contained and denied',async t=>{const f=fixture();t.after(()=>f.journey.dispose());f.parentReady=Promise.reject(Error('private readiness rejection'));await f.journey.handle(f.i('nmr:list'));await new Promise(r=>setImmediate(r));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
for(const route of ['nmi:prepare','nmr:list'])for(const value of [-1,NaN])test('shared invalid clock '+route+' '+String(value),async t=>{const f=fixture();t.after(()=>f.journey.dispose());f.now=value;await f.journey.handle(f.i(route));assert.equal(f.events.length,0);assert.equal(f.denials.length,1);});
