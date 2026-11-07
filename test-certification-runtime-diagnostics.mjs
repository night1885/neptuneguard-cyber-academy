import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const source=await readFile(new URL('./certification-runtime.js',import.meta.url),'utf8');
const begin=source.indexOf('const diagnosticFamilies ='),end=source.indexOf('export function attachCertificationRuntime');
assert.ok(begin>=0&&end>begin,'Self-contained bounded diagnostics required');
const helper=source.slice(begin,end);
const handleStart=source.indexOf('  async function handleInteraction('),handleEnd=source.indexOf('\n  function onInteraction(',handleStart);
assert.ok(handleStart>=0&&handleEnd>handleStart,'Actual outer handler required');
const handle=source.slice(handleStart,handleEnd),plain=value=>JSON.parse(JSON.stringify(value));
const context={};runInNewContext(helper+';globalThis.describe=describeCertificationInteractionFailure;',context);
const describe=(...args)=>context.describe(...args);
const button={customId:'cert:course:page:PrivateNonceFixture:module:0:0',isButton:()=>true,deferred:true,replied:false};
for(const family of ['initial','learner','course','courselife','cr','register','invite','review'])test('allowlisted family '+family,()=>assert.equal(describe({...button,customId:'cert:'+family+':PrivateNonceFixture'},{}).routeFamily,family));
for(const [prefix,expected]of [['fws:','formal-review'],['fnv:','formal-practical'],['cert:PrivateFamilyFixture:','other-cert'],['outside:','unknown']])test('bounded namespace '+expected,()=>assert.equal(describe({customId:prefix+'PrivateNonceFixture'},{}).routeFamily,expected));
test('known error and acknowledgment state',()=>assert.deepEqual(plain(describe(button,{name:'DiscordAPIError[50035]',code:50035})),{routeFamily:'course',interactionType:'button',deferred:true,replied:false,errorClass:'DiscordAPIError',errorCode:'50035'}));
for(const code of ['42501','23505','40P01','57014'])test('allowlisted code '+code,()=>assert.equal(describe(null,{code}).errorCode,code));
for(const code of ['PrivateCodeFixture',123456789012345678,{},NaN,Infinity,'010062'])test('unlisted code rejected '+typeof code+' '+String(code),()=>assert.equal(describe(null,{code}).errorCode,'unknown'));
test('modal type',()=>assert.equal(describe({isModalSubmit:()=>true},null).interactionType,'modal'));
test('select type',()=>assert.equal(describe({isStringSelectMenu:()=>true},null).interactionType,'select'));
test('missing inputs',()=>assert.deepEqual(plain(describe(null,null)),{routeFamily:'unknown',interactionType:'other',deferred:false,replied:false,errorClass:'unknown',errorCode:'unknown'}));
test('oversized identifier not emitted',()=>assert.equal(describe({customId:'cert:course:'+('x'.repeat(101))},{}).routeFamily,'unknown'));
test('nonboolean acknowledgment not coerced',()=>{const result=describe({deferred:'PrivateFixture',replied:1},null);assert.equal(result.deferred,false);assert.equal(result.replied,false);});
test('hostile getters cannot interrupt recovery',()=>{const bad=new Proxy({},{get(){throw Error('PrivateGetterFixture');}});assert.doesNotThrow(()=>describe(bad,bad));assert.equal(describe(bad,bad).errorClass,'unknown');});
test('throwing type predicate is contained',()=>assert.equal(describe({isButton(){throw Error('PrivateTypeFixture');}},null).interactionType,'other'));
test('raw payload, IDs, message, stack and cause are never read',()=>{let accesses=0;const interaction={...button},error={name:'PrivateClassFixture',code:'PrivateCodeFixture'};for(const key of ['user','member','guild','channel','message','fields','values','token'])Object.defineProperty(interaction,key,{get(){accesses++;throw Error('PrivatePayloadFixture');}});for(const key of ['message','stack','cause','requestBody','rawError','toJSON'])Object.defineProperty(error,key,{get(){accesses++;throw Error('PrivateErrorFixture');}});assert.ok(!JSON.stringify(describe(interaction,error)).includes('Private'));assert.equal(accesses,0);assert.equal(describe(interaction,error).errorClass,'unknown');});
test('output is frozen and has only fixed primitive fields',()=>{const result=describe(button,{name:'TypeError'});assert.equal(Object.isFrozen(result),true);assert.deepEqual(Object.keys(result),['routeFamily','interactionType','deferred','replied','errorClass','errorCode']);assert.ok(Object.values(result).every(v=>['string','boolean'].includes(typeof v)));assert.throws(()=>{result.extra='PrivateFixture';});});
const notice='This action could not be completed. Reopen the dashboard or student panel and check the current status before retrying.';
const marker=Symbol.for('neptuneguard.academy.course-card-response');
function runtime(options={}) {
 const logs=[],calls=[];let routes=0,formalRoutes=0,holds=0;
 const state={formal:options.formal?{}:null,formalPrefix:options.prefix||'fws:',ready:options.ready!==false,detached:options.detached===true,
  formalRoute:{async handle(){formalRoutes++;throw{name:'Error',code:'42501',message:'PrivateFormalFixture'};}},
  async route(){routes++;if(options.success)return true;if(options.unhandled)return false;throw{name:'DiscordAPIError[50035]',code:50035,message:'PrivateRouteFixture',requestBody:{token:'PrivateTokenFixture'}};},
  async replyRetentionHold(){holds++;if(options.holdFailure)throw{name:'Error',code:'42501',message:'PrivateHoldFixture'};},
  console:{error(...args){logs.push(plain(args));}}};
 runInNewContext(helper+handle+';globalThis.handle=handleInteraction;',state);
 const interaction={customId:options.formal?state.formalPrefix+'PrivateNonceFixture':'cert:course:page:PrivateNonceFixture',isButton:()=>true,
  deferred:options.ack==='deferred',replied:options.ack==='replied',message:{flags:{has:n=>options.format==='card'&&n===32768}},
  async reply(payload){calls.push(['reply',plain(payload)]);if(options.replyFailure)throw{name:'DiscordAPIError[10062]',code:10062,message:'PrivateReplyFixture'};},
  async editReply(payload){calls.push(['edit',plain(payload)]);if(options.replyFailure)throw{name:'DiscordAPIError[10062]',code:10062,message:'PrivateReplyFixture'};}};
 if(options.format==='marked')interaction[marker]=true;
 return {logs,calls,interaction,run:()=>state.handle(interaction),counts:()=>({routes,formalRoutes,holds})};
}
for(const format of ['legacy','card','marked'])for(const ack of ['fresh','deferred','replied'])for(const replyFailure of [false,true])test(`actual outer recovery ${format} ${ack} replyFailure=${replyFailure}`,async()=>{
 const r=runtime({format,ack,replyFailure});await r.run();assert.deepEqual(r.counts(),{routes:1,formalRoutes:0,holds:0});assert.equal(r.calls.length,1);
 const [method,p]=r.calls[0];assert.equal(method,ack==='fresh'?'reply':'edit');assert.deepEqual(p.allowedMentions,{parse:[]});
 if(format==='legacy'){assert.equal(p.content,notice);assert.deepEqual(p.embeds,[]);assert.deepEqual(p.components,[]);assert.equal(p.flags,ack==='fresh'?64:undefined);}
 else{assert.equal(p.flags,ack==='fresh'?32832:32768);assert.ok(!('content'in p));assert.ok(!('embeds'in p));assert.deepEqual(p.components,[{type:10,content:notice}]);}
 assert.equal(r.logs.length,replyFailure?2:1);assert.equal(r.logs[0][0],'Certification interaction failed.');
 assert.deepEqual(r.logs[0][1],{routeFamily:'course',interactionType:'button',deferred:ack==='deferred',replied:ack==='replied',errorClass:'DiscordAPIError',errorCode:'50035'});
 if(replyFailure){assert.equal(r.logs[1][0],'Certification error reply failed.');assert.equal(r.logs[1][1].errorCode,'10062');}
 assert.ok(!JSON.stringify(r.logs).includes('Private'));
});
for(const prefix of ['fws:','fnv:'])for(const ack of ['fresh','deferred','replied'])for(const replyFailure of [false,true])test(`formal failure retains acknowledgment policy ${prefix} ${ack} ${replyFailure}`,async()=>{
 const r=runtime({formal:true,prefix,ack,replyFailure});await r.run();assert.deepEqual(r.counts(),{routes:0,formalRoutes:1,holds:0});assert.equal(r.calls.length,ack==='fresh'?1:0);
 assert.equal(r.logs[0][1].routeFamily,prefix==='fws:'?'formal-review':'formal-practical');assert.equal(r.logs[0][1].errorCode,'42501');
 assert.equal(r.logs.length,ack==='fresh'&&replyFailure?2:1);if(ack==='fresh')assert.equal(r.calls[0][1].content,'Formal review workspace is unavailable.');assert.ok(!JSON.stringify(r.logs).includes('Private'));
});
test('successful route has no diagnostic and no extra response',async()=>{const r=runtime({success:true});await r.run();assert.equal(r.counts().routes,1);assert.deepEqual(r.logs,[]);assert.deepEqual(r.calls,[]);});
test('unhandled route retains unavailable response without error diagnostic',async()=>{const r=runtime({unhandled:true});await r.run();assert.equal(r.counts().routes,1);assert.deepEqual(r.logs,[]);assert.equal(r.calls[0][1].content,'This action is unavailable. Reopen the Admin Dashboard or your student panel.');});
for(const detached of [false,true])test('readiness hold prevents route entry detached='+detached,async()=>{const r=runtime({ready:false,detached});await r.run();assert.deepEqual(r.counts(),{routes:0,formalRoutes:0,holds:1});assert.deepEqual(r.logs,[]);assert.deepEqual(r.calls,[]);});
test('failed readiness hold records bounded diagnostics without entering route',async()=>{const r=runtime({ready:false,holdFailure:true});await r.run();assert.deepEqual(r.counts(),{routes:0,formalRoutes:0,holds:1});assert.equal(r.logs[0][1].errorCode,'42501');assert.equal(r.calls.length,1);});
