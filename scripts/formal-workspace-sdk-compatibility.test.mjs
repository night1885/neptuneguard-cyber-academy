import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, Message, MessageComponentInteraction, version } from 'discord.js';
import { createWorkspace } from '../docs/formal-ethical-hacking/authoring/discord-workspace-prototype/navigation.mjs';
const A='11111111111111111',G='22222222222222222',C='33333333333333333',APP='55555555555555555';
const SOURCE='44444444444444444',PRIVATE='88888888888888888';
const user=id=>({id,username:'synthetic',discriminator:'0',avatar:null,global_name:null});
function fixture(t) {
  assert.equal(version,'14.27.0','Review a changed lockfile SDK explicitly');
  const client=new Client({intents:[]});t.after(()=>client.destroy());
  client.guilds.cache.set(G,{id:G,members:{resolve:()=>null}});
  const calls=[],edits=[];let serial=0;
  for(const verb of ['get','put','patch','delete']) Object.defineProperty(client.rest,verb,{configurable:true,value:async()=>{throw new Error('Unexpected REST call in offline SDK test');}});
  Object.defineProperty(client.rest,'post',{configurable:true,value:async(path,options)=>{
    assert.match(path,/^\/interactions\/[0-9]{17,20}\/synthetic-token\/callback$/);
    assert.equal(options.auth,false);assert.ok([4,5,6].includes(options.body.type));
    if([4,5].includes(options.body.type)) assert.equal(options.body.data.flags & 64,64);
    calls.push(options.body);return {};
  }});
  const rawMessage=(id,privateFlag,actor=A)=>({id,channel_id:C,guild_id:G,type:0,
    author:{...user(APP),bot:true},content:'',embeds:[],components:[],attachments:[],reactions:[],mentions:[],mention_roles:[],mention_everyone:false,
    flags:privateFlag?64:0,pinned:false,tts:false,interaction_metadata:{id:'77777777777777777',type:2,user:user(actor),authorizing_integration_owners:{0:G}}});
  function button(customId,{actor=A,messageId=PRIVATE,privateFlag=true}={}) {
    const i=new MessageComponentInteraction(client,{id:String(66666666666666666n+BigInt(serial++)),application_id:APP,token:'synthetic-token',type:3,version:1,
      guild_id:G,channel:{id:C,type:0},user:user(actor),locale:'en-US',guild_locale:'en-US',entitlements:[],authorizing_integration_owners:{0:G},
      app_permissions:'0',context:0,attachment_size_limit:1048576,data:{custom_id:customId,component_type:2},message:rawMessage(messageId,privateFlag,actor)});
    Object.defineProperty(i.webhook,'editMessage',{configurable:true,value:async(target,payload)=>{
      assert.equal(target,'@original');edits.push(payload);return new Message(client,rawMessage(PRIVATE,true));
    }});
    return i;
  }
  let allowed=true;
  const workspace=createWorkspace({enabled:true,guildId:G,entryChannelId:C,courseId:'formal-ethical-hacking',pages:2,
    makeToken:()=> 'a'.repeat(32),authorize:async()=>allowed,render:async({page})=>`Synthetic review page ${page}`});
  t.after(()=>workspace.dispose());
  const open=()=>button('fws:open',{messageId:SOURCE,privateFlag:false});
  const next=()=>edits.at(-1).components[0].components.find(b=>b.label==='Next').custom_id;
  return {workspace,button,open,next,calls,edits,revoke:()=>{allowed=false;}};
}
test('real SDK private entry then Next uses the existing controller and original message',async t=>{
  const f=fixture(t),entry=f.open();assert.equal(await f.workspace.handle(entry),true);
  assert.equal(entry.ephemeral,true);assert.equal(entry.deferred,true);assert.equal(entry.replied,true);
  assert.equal(f.calls[0].type,5);assert.equal(f.edits[0].content,'Synthetic review page 0');
  const next=f.button(f.next());assert.equal(next.message.id,PRIVATE);assert.equal(next.message.flags.has(64),true);
  assert.equal(await f.workspace.handle(next),true);assert.equal(f.calls[1].type,6);assert.equal(f.edits[1].content,'Synthetic review page 1');
  assert.equal(next.deferred,true);assert.equal(next.replied,true);assert.deepEqual(f.edits[1].allowedMentions,{parse:[]});
});
test('SDK wrong-actor control produces private denial without editing owner workspace',async t=>{
  const f=fixture(t);await f.workspace.handle(f.open());const control=f.next();
  await f.workspace.handle(f.button(control,{actor:'99999999999999999'}));
  assert.equal(f.edits.length,1);assert.equal(f.calls.at(-1).type,4);assert.equal(f.calls.at(-1).data.flags & 64,64);
});
test('revoked authority clears the bound private view using SDK editReply',async t=>{
  const f=fixture(t);await f.workspace.handle(f.open());const control=f.next();f.revoke();
  await f.workspace.handle(f.button(control));assert.equal(f.calls.at(-1).type,6);
  assert.deepEqual(f.edits.at(-1).embeds,[]);assert.deepEqual(f.edits.at(-1).components,[]);assert.deepEqual(f.edits.at(-1).attachments,[]);
  assert.equal(f.edits.at(-1).content.includes('Synthetic review page'),false);
});
test('SDK callback failure does not publish protected entry content',async t=>{
  const f=fixture(t),entry=f.open();Object.defineProperty(entry.client.rest,'post',{configurable:true,value:async()=>{throw new Error('Simulated callback loss');}});
  assert.equal(await f.workspace.handle(entry),true);assert.equal(f.edits.length,0);assert.equal(entry.deferred,false);
});
