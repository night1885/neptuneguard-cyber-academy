import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERAL_CHAT_UI_TARGET as TARGET, buildGeneralChatUiReviewEntry, createGeneralChatUiReviewOptions, readGeneralChatUiReviewFlag } from './general-chat-ui-review.mjs';
const A='100000000000000001',B='100000000000000002',M='100000000000000003',M2='100000000000000004';
const control=(i,label)=>i.edits.at(-1).components[0].components.find(b=>b.label===label).custom_id;
function setup(t,{isReady}={}) {
  const state={ready:true,present:true,available:true,memberGuild:TARGET.guildId,fetches:[],afterMember:null,error:false};
  const client={guilds:{async fetch(guildId){state.fetches.push(['guild',guildId]);if(state.error)throw new Error('PRIVATE SDK DETAIL');return {id:guildId,available:state.available,
    members:{async fetch(options){state.fetches.push(['member',{...options}]);if(state.afterMember)await state.afterMember();return state.present?{id:options.user,guild:{id:state.memberGuild}}:null;}}};}}};
  const options=createGeneralChatUiReviewOptions({enabled:true});
  const route=options.createRoute({client,guildId:TARGET.guildId,isReady:isReady||(()=>state.ready),config:new Proxy({},{get(){assert.fail('UI preview must not inspect account configuration');}})});
  t.after(()=>route.dispose());
  function button(customId='fws:open',extra={}) {return {customId,guildId:TARGET.guildId,channelId:TARGET.channelId,user:{id:A},isButton:()=>true,
    deferred:false,replied:false,ephemeral:false,message:{id:M,flags:{has:b=>b===64}},outputMessageId:M,edits:[],replies:[],
    async deferReply(payload){assert.equal(payload.flags,64);this.deferred=true;this.ephemeral=true;},async deferUpdate(){this.deferred=true;},
    async editReply(payload){this.edits.push(payload);this.replied=true;return {id:this.outputMessageId,flags:{has:b=>b===64}};},async reply(payload){this.replies.push(payload);this.replied=true;},...extra};}
  return {state,client,options,route,button};
}
test('confirmed target is immutable and distinct from the formal course identity',()=>{
  assert.deepEqual(TARGET,{guildId:'1330353166830665859',channelId:'1330353167371735094',courseId:'formal-ui-review'});assert.ok(Object.isFrozen(TARGET));assert.notEqual(TARGET.courseId,'formal-ethical-hacking');
});
test('entry builder returns only the exact channel plan and safe public copy',()=>{
  const entry=buildGeneralChatUiReviewEntry();assert.equal(entry.guildId,TARGET.guildId);assert.equal(entry.channelId,TARGET.channelId);
  assert.equal(entry.payload.components[0].components[0].custom_id,'fws:open');assert.deepEqual(entry.payload.allowedMentions,{parse:[]});
  assert.match(entry.payload.content,/synthetic/);entry.payload.content='changed';assert.notEqual(buildGeneralChatUiReviewEntry().payload.content,'changed');
});
test('default options are off and reject database content and target overrides',()=>{
  assert.deepEqual(createGeneralChatUiReviewOptions(),{enabled:false});assert.deepEqual(createGeneralChatUiReviewOptions({enabled:false}),{enabled:false});
  for(const options of [{enabled:'true'},{enabled:true,readPool:{}},{enabled:true,bundle:{}},{enabled:true,guildId:A},{enabled:true,render:()=>''}])assert.throws(()=>createGeneralChatUiReviewOptions(options));
});
test('factory rejects wrong guild and missing SDK or readiness without fetching',()=>{
  const options=createGeneralChatUiReviewOptions({enabled:true});assert.ok(Object.isFrozen(options));let reads=0;const client={guilds:{fetch(){reads++;}}};
  for(const args of [{client,guildId:A,isReady:()=>true},{client,guildId:TARGET.guildId},{guildId:TARGET.guildId,isReady:()=>true}])assert.throws(()=>options.createRoute(args));assert.equal(reads,0);
});
test('entry and Next Previous Home reuse private navigation with fixed synthetic pages',async t=>{
  const f=setup(t),entry=f.button();await f.route.handle(entry);assert.match(entry.edits[0].content,/UI preview 1\/3/);assert.equal(entry.ephemeral,true);
  const next=f.button(control(entry,'Next'));await f.route.handle(next);assert.match(next.edits[0].content,/UI preview 2\/3/);
  const previous=f.button(control(next,'Previous'));await f.route.handle(previous);assert.match(previous.edits[0].content,/UI preview 1\/3/);
  const again=f.button(control(previous,'Next'));await f.route.handle(again);const home=f.button(control(again,'Home'));await f.route.handle(home);assert.match(home.edits[0].content,/UI preview 1\/3/);
  for(const payload of [...entry.edits,...next.edits,...home.edits]){assert.deepEqual(payload.allowedMentions,{parse:[]});assert.deepEqual(payload.embeds,[]);assert.deepEqual(payload.attachments,[]);}
});
test('current member lookup is forced and repeated instead of positively cached',async t=>{
  const f=setup(t);await f.route.handle(f.button());const reads=f.state.fetches.filter(v=>v[0]==='member');assert.equal(reads.length,2);
  for(const [,options] of reads)assert.deepEqual(options,{user:A,force:true,cache:false});
});
test('any current server member can open the UI without an enrollment or extra allowlist',async t=>{
  const f=setup(t),one=f.button(),two=f.button('fws:open',{user:{id:B},outputMessageId:M2});await f.route.handle(one);await f.route.handle(two);
  assert.match(one.edits[0].content,/UI preview/);assert.match(two.edits[0].content,/UI preview/);
});
test('parent not ready and unrelated namespaces produce no member fetches',async t=>{
  const f=setup(t);f.state.ready=false;const i=f.button();await f.route.handle(i);assert.equal(i.replies[0].flags,64);assert.equal(f.state.fetches.length,0);
  assert.equal(await f.route.handle(f.button('cert:initial:home')),false);assert.equal(f.state.fetches.length,0);
});
test('wrong channel and wrong server are not admitted',async t=>{
  const f=setup(t);for(const extra of [{channelId:A},{guildId:A}]){const i=f.button('fws:open',extra);await f.route.handle(i);assert.equal(i.replies[0].flags,64);}assert.equal(f.state.fetches.length,0);
});
test('nonmembers unavailable guilds and foreign member guilds receive no preview',async t=>{
  for(const patch of [{present:false},{available:false},{memberGuild:A}]){const f=setup(t);Object.assign(f.state,patch);const i=f.button();await f.route.handle(i);assert.equal(JSON.stringify(i.edits).includes('UI preview'),false);}
});
test('membership loss after opening retires the next view',async t=>{
  const f=setup(t),entry=f.button();await f.route.handle(entry);f.state.present=false;const next=f.button(control(entry,'Next'));await f.route.handle(next);assert.deepEqual(next.edits.at(-1).components,[]);assert.equal(JSON.stringify(next.edits).includes('UI preview'),false);
});
test('readiness loss during member read withholds the preview',async t=>{
  const f=setup(t);f.state.afterMember=()=>{f.state.ready=false;};const i=f.button();await f.route.handle(i);assert.equal(JSON.stringify(i.edits).includes('UI preview'),false);
});
test('wrong actor or public source marker cannot spend the private controls',async t=>{
  const f=setup(t),entry=f.button();await f.route.handle(entry);const next=control(entry,'Next'),reads=f.state.fetches.length;
  for(const extra of [{user:{id:B}},{message:{id:M,flags:{has:()=>false}}}]){const i=f.button(next,extra);await f.route.handle(i);assert.equal(i.edits.length,0);assert.equal(i.replies[0].flags,64);}assert.equal(f.state.fetches.length,reads);
});
test('SDK errors are neutral and contain no diagnostic detail',async t=>{
  const f=setup(t);f.state.error=true;const i=f.button();await f.route.handle(i);assert.equal(JSON.stringify(i.edits).includes('PRIVATE SDK DETAIL'),false);assert.equal(JSON.stringify(i.edits).includes('UI preview'),false);
});
test('disposal blocks future reads and leaves shared client ownership unchanged',async t=>{
  const f=setup(t),entry=f.button();await f.route.handle(entry);const reads=f.state.fetches.length;assert.deepEqual(await f.route.dispose(),{drained:true});
  await f.route.handle(f.button(control(entry,'Next')));assert.equal(f.state.fetches.length,reads);
});
test('asynchronous readiness is denied rather than awaited or treated as true',async t=>{
  const f=setup(t,{isReady:async()=>true}),i=f.button();await f.route.handle(i);assert.equal(f.state.fetches.length,0);assert.equal(i.replies[0].flags,64);
});
test('startup flag is off unless explicitly true for the confirmed guild',()=>{
  assert.equal(readGeneralChatUiReviewFlag({}),false);assert.equal(readGeneralChatUiReviewFlag({GENERAL_CHAT_UI_REVIEW_ENABLED:'false',GUILD_ID:A}),false);
  assert.equal(readGeneralChatUiReviewFlag({GENERAL_CHAT_UI_REVIEW_ENABLED:'true',GUILD_ID:TARGET.guildId}),true);
  for(const env of [{GENERAL_CHAT_UI_REVIEW_ENABLED:'yes',GUILD_ID:TARGET.guildId},{GENERAL_CHAT_UI_REVIEW_ENABLED:true,GUILD_ID:TARGET.guildId},{GENERAL_CHAT_UI_REVIEW_ENABLED:'true',GUILD_ID:A}])assert.throws(()=>readGeneralChatUiReviewFlag(env));
});
