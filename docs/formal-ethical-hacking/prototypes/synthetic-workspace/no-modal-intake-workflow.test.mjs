import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoModalIntakeBoundary as create } from './no-modal-intake-boundary.mjs';

// Detached scripted doubles only; no Discord transport or storage integration.
const guildId='100000000000000001', channelId='100000000000000002';
const actorId='100000000000000003', messageId='100000000000000004';
const token='12345678-1234-1234-1234-123456789abc';
function fixture() {
  let now=1000;
  const calls=[], edits=[], replies=[];
  const message={id:messageId,flags:{has:n=>n===64}};
  const coordinator={
    prepare:async(...a)=>{calls.push(['prepare',...a]);return {ok:true,channelId};},
    preview:async(...a)=>{calls.push(['preview',...a]);return {ok:true,channelId,sourceMessageId:messageId,token,digest:'a'.repeat(64),body:'PRIVATE_BODY'};},
    submit:async(...a)=>{calls.push(['submit',...a]);return {ok:true,expiresAtMs:now+1};},
    dispose:()=>calls.push(['dispose'])
  };
  const boundary=create({enabled:true,guildId,entryChannelId:channelId,isReady:()=>true,coordinator,readNow:()=>now});
  const interaction=(customId='nmi:prepare',overrides={})=>({customId,guildId,channelId,user:{id:actorId},message,isButton:()=>true,
    deferReply:async p=>assert.deepEqual(p,{flags:64}),deferUpdate:async()=>{},
    reply:async p=>replies.push(p),editReply:async p=>{edits.push(p);return message;},...overrides});
  return {boundary,coordinator,calls,edits,replies,interaction,setNow:n=>{now=n;}};
}
test('disabled boundary ignores intake without providers',async()=>{
  assert.equal(await create().handle({customId:'nmi:prepare'}),false);
});
test('prepare, metadata-only preview and exact-token submit',async()=>{
  const f=fixture();
  for(const id of ['nmi:prepare','nmi:preview',`nmi:submit:${token}`]) assert.equal(await f.boundary.handle(f.interaction(id)),true);
  assert.deepEqual(f.calls.map(x=>x[0]),['prepare','preview','submit']);
  assert.deepEqual(f.calls[2],['submit',{actorId,guildId},token,token]);
  assert.equal(f.edits[1].components[0].components[0].custom_id,`nmi:submit:${token}`);
  assert.ok(!JSON.stringify(f.edits).includes('PRIVATE_BODY'));
  for(const p of f.edits) {assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(p.embeds,[]);}
});
test('foreign actor cannot reuse bound controls',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());
  await f.boundary.handle(f.interaction('nmi:preview',{user:{id:'100000000000000005'}}));
  assert.equal(f.calls.length,1);assert.equal(f.replies[0].flags,64);
});
test('control expires at five-minute boundary',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());f.setNow(301000);
  await f.boundary.handle(f.interaction('nmi:preview'));
  assert.equal(f.calls.length,1);assert.equal(f.replies.length,1);
});
test('wrong guild and channel are denied before coordinator calls',async()=>{
  for(const overrides of [{guildId:'100000000000000006'},{channelId:'100000000000000006'}]) {
    const f=fixture();await f.boundary.handle(f.interaction('nmi:prepare',overrides));
    assert.equal(f.calls.length,0);assert.equal(f.replies.length,1);
  }
});
test('expired acknowledgement is not displayed as success',async()=>{
  const f=fixture();await f.boundary.handle(f.interaction());
  f.coordinator.submit=async()=>({ok:true,expiresAtMs:1000});
  await f.boundary.handle(f.interaction(`nmi:submit:${token}`));
  assert.equal(f.edits.at(-1).content,'Evidence intake is unavailable.');
  assert.deepEqual(f.edits.at(-1).components,[]);
});
test('dispose blocks subsequent coordinator use',async()=>{
  const f=fixture();f.boundary.dispose();await f.boundary.handle(f.interaction());
  assert.deepEqual(f.calls,[['dispose']]);assert.equal(f.replies.length,1);
});
