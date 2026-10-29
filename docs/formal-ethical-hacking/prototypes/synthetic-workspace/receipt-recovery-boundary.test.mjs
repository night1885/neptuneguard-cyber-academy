import test from 'node:test';
import assert from 'node:assert/strict';
import {createReceiptRecoveryBoundary as create} from './receipt-recovery-boundary.mjs';
const G='100000000000000001',P='100000000000000002',C='100000000000000003',A='100000000000000004',M='100000000000000005';
const R='11111111-1111-1111-1111-111111111111',Q='22222222-2222-2222-2222-222222222222',S='33333333-3333-3333-3333-333333333333';
function fixture(){
 const f={now:1000000,ready:true,allowed:true,recordId:R,events:[],edits:[],replies:[]};
 f.item={requestId:Q,reportId:S,revision:1,expiresAtMs:f.now+86400000,body:'PRIVATE_BODY'};
 const config={enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:P,entryChannelId:C,courseKey:'demo-course',exerciseKey:'demo-exercise',timeoutMs:10};
 const ports={now:()=>f.now,isReady:()=>f.ready,
 resolve:async()=>({recordId:f.recordId,learnerId:A,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:1}),
 authorize:async()=>f.allowed,discoverReceipts:async(b,n)=>{assert.equal(b.actorId,A);assert.equal(n,5);f.events.push('discover');return [f.item];},
 recoverSubmission:async(ctx,q)=>{assert.deepEqual(ctx,{actorId:A,guildId:G});assert.equal(q,Q);f.events.push('recover');return {ok:true,...f.item};}};
 f.ports=ports;f.config=config;f.boundary=create(config,ports);
 f.interaction=(customId='nmr:list',patch={})=>({customId,guildId:G,channelId:C,user:{id:A},message:{id:M,flags:{has:n=>n===64}},isButton:()=>true,deferred:false,replied:false,
 async deferReply(p){assert.deepEqual(p,{flags:64});this.deferred=true;},async deferUpdate(){this.deferred=true;},async reply(p){this.replied=true;f.replies.push(p);},
 async editReply(p){f.edits.push(p);return {id:M,flags:{has:n=>n===64}};},...patch});
 f.open=async()=>{const before=f.edits.length;await f.boundary.handle(f.interaction());return f.edits.length>before?f.edits.at(-1)?.components[0]?.components[0]?.custom_id:undefined;};return f;
}
test('default off without providers',async()=>assert.equal(await create().handle({customId:'nmr:list'}),false));
test('explicit isolated configuration required',()=>assert.throws(()=>create({enabled:true})));
test('fresh private discovery and recovery expose metadata only',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();assert.match(token,/^nmr:recover:/);assert.ok(!token.includes(Q));await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover','recover']);assert.match(f.edits.at(-1).content,/does not extend retention/);const text=JSON.stringify(f.edits);for(const secret of [Q,R,S,'PRIVATE_BODY'])assert.ok(!text.includes(secret));for(const p of f.edits){assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(p.embeds,[]);}});
for(const [name,patch]of [['actor',{user:{id:P}}],['channel',{channelId:P}],['guild',{guildId:P}],['public',{message:{id:M,flags:{has:()=>false}}}],['message',{message:{id:P,flags:{has:()=>true}}}]])test('foreign control denied: '+name,async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();await f.boundary.handle(f.interaction(token,patch));assert.deepEqual(f.events,['discover']);assert.equal(f.replies.length,1);});
for(const [name,advance]of [['session',300000],['receipt',86400000]])test('exact '+name+' deadline denied',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();f.now+=advance;await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover']);});
for(const name of ['revoked','binding'])test('current authority change denied: '+name,async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();if(name==='revoked')f.allowed=false;else f.recordId=Q;await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover']);});
for(const patch of [{requestId:'bad'},{reportId:'bad'},{revision:0},{expiresAtMs:1000000}])test('malformed discovery '+JSON.stringify(patch),async t=>{const f=fixture();t.after(()=>f.boundary.dispose());Object.assign(f.item,patch);assert.equal(await f.open(),undefined);assert.deepEqual(f.edits.at(-1).components,[]);});
test('over-limit discovery denied',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.ports.discoverReceipts=async()=>Array(6).fill(f.item);assert.equal(await f.open(),undefined);});
test('duplicate request discovery denied',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.ports.discoverReceipts=async()=>[f.item,f.item];assert.equal(await f.open(),undefined);});
test('missing receipt never invokes a submission fallback',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();f.ports.recoverSubmission=async()=>({ok:false});await f.boundary.handle(f.interaction(token));assert.deepEqual(f.edits.at(-1).components,[]);assert.match(f.edits.at(-1).content,/unavailable/);});
test('changed acknowledgement deadline denied',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();f.ports.recoverSubmission=async()=>({ok:true,...f.item,expiresAtMs:f.item.expiresAtMs+1});await f.boundary.handle(f.interaction(token));assert.match(f.edits.at(-1).content,/unavailable/);});
test('expiry during final authorization suppresses ACK',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();f.ports.authorize=async()=>{if(f.events.includes('recover'))f.now=f.item.expiresAtMs;return true;};await f.boundary.handle(f.interaction(token));assert.match(f.edits.at(-1).content,/unavailable/);});
test('disposal suppresses pending discovery result',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());let release,entered;const started=new Promise(r=>{entered=r;});f.ports.discoverReceipts=()=>new Promise(r=>{release=r;entered();});const pending=f.boundary.handle(f.interaction());await started;assert.equal(f.edits.length,0);f.boundary.dispose();release([f.item]);await pending;assert.equal(f.edits.length,0);});
test('timed out provider result cannot create controls',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());let release;f.ports.discoverReceipts=()=>new Promise(r=>{release=r;});assert.equal(await f.open(),undefined);release([f.item]);await new Promise(r=>setImmediate(r));assert.equal(f.edits.length,1);assert.deepEqual(f.edits[0].components,[]);});
for(const now of [-1,NaN,Infinity])test('invalid clock '+now,async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.now=now;assert.equal(await f.open(),undefined);assert.equal(f.events.length,0);});
test('reconstruction requires fresh controls',async t=>{const f=fixture();const token=await f.open();f.boundary.dispose();f.boundary=create(f.config,f.ports);t.after(()=>f.boundary.dispose());await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover']);assert.ok(await f.open());});
test('unrelated route is ignored',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());assert.equal(await f.boundary.handle(f.interaction('nmi:prepare')),false);assert.equal(f.events.length,0);});

for(const ready of [false,1,'true'])test('nonliteral readiness '+ready,async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.ready=ready;assert.equal(await f.open(),undefined);assert.equal(f.events.length,0);});
test('session timer retires controls without another list request',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const original=globalThis.setTimeout;let expire;
 globalThis.setTimeout=(fn,ms,...a)=>{if(ms===300000)expire=fn;return original(fn,ms,...a);};let token;
 try{token=await f.open();}finally{globalThis.setTimeout=original;}
 assert.equal(typeof expire,'function');expire();await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover']);
});
test('100 settled sessions bound capacity and expire together',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());for(let n=0;n<100;n++)assert.ok(await f.open());assert.equal(await f.open(),undefined);assert.equal(f.events.length,100);f.now+=300000;assert.ok(await f.open());assert.equal(f.events.length,101);});
test('concurrent pending operations are bounded before provider settlement',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const releases=[];f.ports.discoverReceipts=()=>new Promise(r=>releases.push(r));
 const pending=Array.from({length:20},()=>f.boundary.handle(f.interaction()));
 while(releases.length<20)await new Promise(r=>setImmediate(r));
 await f.boundary.handle(f.interaction());assert.equal(f.replies.length,1);for(const release of releases)release([f.item]);await Promise.all(pending);assert.equal(f.edits.length,20);
});
test('timeout caps unsettled work across later requests',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const releases=[];f.ports.discoverReceipts=()=>new Promise(r=>releases.push(r));
 for(let n=0;n<22;n++)assert.equal(await f.open(),undefined);assert.equal(releases.length,20);
 for(const release of releases)release([f.item]);await new Promise(r=>setImmediate(r));f.ports.discoverReceipts=async()=>[f.item];assert.ok(await f.open());
});
test('revocation after discovery suppresses control publication',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.ports.discoverReceipts=async()=>{f.allowed=false;return [f.item];};assert.equal(await f.open(),undefined);});
test('missing content fields are not needed for discovery or ACK',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());delete f.item.body;const token=await f.open();await f.boundary.handle(f.interaction(token));assert.match(f.edits.at(-1).content,/verified/);});
test('empty discovery publishes no recovery action',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());f.ports.discoverReceipts=async()=>[];assert.equal(await f.open(),undefined);assert.match(f.edits.at(-1).content,/No current/);});
test('public control reply cannot establish ownership',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());let token;await f.boundary.handle(f.interaction('nmr:list',{async editReply(p){f.edits.push(p);token=p.components?.[0]?.components?.[0]?.custom_id||token;return {id:M,flags:{has:()=>false}};}}));await f.boundary.handle(f.interaction(token));assert.equal(f.events.includes('recover'),false);});
test('clock regression blocks recovery before provider access',async t=>{const f=fixture();t.after(()=>f.boundary.dispose());const token=await f.open();f.now--;await f.boundary.handle(f.interaction(token));assert.deepEqual(f.events,['discover']);});
