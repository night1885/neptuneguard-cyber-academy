import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createFormalReviewComposition} from './formal-review-composition.mjs';
const G='100000000000000001',O='100000000000000002',A='100000000000000003',C='100000000000000004',B='100000000000000005',W='11111111-1111-4111-8111-111111111111';
function fixture(){
 const s={queries:0,outputs:[],preflight:true,scope:null};
 const adapter={enabled:true,ready:false,async initialize(){this.ready=true;return {ready:true};},dispose(){this.ready=false;},drain:async()=>{}};
 const store={...adapter,transaction(){assert.fail('Empty recovery must not reach core storage');}},courseAuthorization={...adapter,authorizeCourse:async()=>null},source={enabled:true,readSource:async()=>assert.fail('Recovery must not retrieve source'),dispose(){},drain:async()=>{}};
 const receiptPool={async query(){s.queries++;return {rows:[]};},end(){assert.fail('Receipt pool remains borrowed');}};
 const options={enabled:true,guildId:G,ownerId:O,reviewerChannelId:C,applicationId:B,botId:B,exerciseKeys:['EH-NET-02'],client:new EventEmitter(),store,courseAuthorization,source,metadataPool:{query:async()=>({rows:[]})},receiptPool,recoveryEnabled:true,authorizeExercise:async()=>false,authorizeReviewer:async()=>false,isReady:()=>true,now:()=>1000,verifyResources:async scope=>{s.scope=scope;return s.preflight;}};
 let serial=100000000000001000n;
 function interaction(owner=false){return {id:(serial++).toString(),customId:(owner?'frr:':'frv:')+'recover:'+W,guildId:G,applicationId:B,channelId:C,channel:{id:C,guildId:G,type:0},user:{id:owner?O:A},message:{author:{id:B},flags:{has:n=>n===64}},inGuild:()=>true,isButton:()=>true,isModalSubmit:()=>false,async deferUpdate(){this.deferred=true;},async editReply(p){s.outputs.push(p);},async reply(p){s.outputs.push(p);}};}
 return {s,options,interaction};
}
test('opt-in composition routes both private recovery paths without registering or writing',async()=>{const f=fixture(),c=createFormalReviewComposition(f.options);try{assert.equal(f.options.client.listenerCount('interactionCreate'),0);await c.initialize();assert.equal(f.s.scope.recoveryEnabled,true);for(const owner of [false,true])await c.handle(f.interaction(owner));assert.equal(f.s.queries,2);for(const p of f.s.outputs){assert.match(p.content,/unconfirmed/);assert.deepEqual(p.components,[]);assert.deepEqual(p.embeds,[]);}assert.equal(f.options.client.listenerCount('interactionCreate'),0);}finally{await c.detach();}});
test('recovery-off construction never reads the receipt-pool getter',async()=>{const f=fixture();delete f.options.receiptPool;f.options.recoveryEnabled=false;Object.defineProperty(f.options,'receiptPool',{get(){assert.fail();}});const c=createFormalReviewComposition(f.options);try{await c.initialize();assert.equal(Object.hasOwn(f.s.scope,'recoveryEnabled'),false);}finally{await c.detach();}});
for(const value of ['true',1])test('nonboolean recovery enablement is rejected '+value,()=>{const f=fixture();f.options.recoveryEnabled=value;assert.throws(()=>createFormalReviewComposition(f.options),/composition unavailable/);});
test('opt-in requires an explicit receipt reader',()=>{const f=fixture();delete f.options.receiptPool;assert.throws(()=>createFormalReviewComposition(f.options),/composition unavailable/);});
test('private-origin and resource preflight failures do not reach receipt SQL',async()=>{const f=fixture(),c=createFormalReviewComposition(f.options);try{f.s.preflight=false;await assert.rejects(c.initialize());assert.equal(f.s.queries,0);f.s.preflight=true;await c.initialize();const i=f.interaction();i.message.flags.has=()=>false;await c.handle(i);assert.equal(f.s.queries,0);assert.equal(f.s.outputs.length,0);}finally{await c.detach();}});
