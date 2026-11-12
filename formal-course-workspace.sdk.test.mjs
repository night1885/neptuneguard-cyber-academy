import test from 'node:test';
import assert from 'node:assert/strict';
import {Client,Message,MessageComponentInteraction,ActionRowBuilder,ButtonBuilder,version} from 'discord.js';
import {createStudentCourseSet} from './formal-student-packages.mjs';
import {createFormalCourseWorkspace} from './formal-course-workspace.mjs';
const A='11111111111111111',B='22222222222222222',G='33333333333333333',C='44444444444444444',E='55555555555555555',BOT='66666666666666666',M='77777777777777777',ROLE='88888888888888888';
const user=id=>({id,username:'synthetic',discriminator:'0',avatar:null,global_name:null});
function fixture(t){
 assert.equal(version,'14.27.0','Review SDK lockfile changes explicitly');
 const f={edits:[],callbacks:[],saved:null},client=new Client({intents:[]});t.after(()=>client.destroy());
 client.guilds.cache.set(G,{id:G,members:{resolve:()=>null,fetch:async id=>({id,roles:{cache:new Set([ROLE])}})}});
 for(const verb of ['get','put','patch','delete','request'])Object.defineProperty(client.rest,verb,{configurable:true,value:async()=>{throw new Error('Unexpected real REST operation');}});
 Object.defineProperty(client.rest,'post',{configurable:true,value:async(path,options)=>{assert.match(path,/^\/interactions\/[0-9]{17,20}\/synthetic-token\/callback$/);assert.equal(options.auth,false);assert.ok([4,5,6].includes(options.body.type));if([4,5].includes(options.body.type))assert.equal(options.body.data.flags&64,64);f.callbacks.push(options.body);return{};}});
 const rawMessage=(id,privateFlag,actor)=>({id,channel_id:C,guild_id:G,type:0,author:{...user(BOT),bot:true},content:'',embeds:[],components:[],attachments:[],reactions:[],mentions:[],mention_roles:[],mention_everyone:false,flags:privateFlag?64:0,pinned:false,tts:false,interaction_metadata:{id:'99999999999999999',type:2,user:user(actor),authorizing_integration_owners:{0:G}}});
 let serial=0;
 f.button=(customId,{actor=A,messageId=M,privateFlag=true}={})=>{
  const i=new MessageComponentInteraction(client,{id:String(10101010101010101n+BigInt(serial++)),application_id:BOT,token:'synthetic-token',type:3,version:1,guild_id:G,channel:{id:C,type:0},user:user(actor),locale:'en-US',guild_locale:'en-US',entitlements:[],authorizing_integration_owners:{0:G},app_permissions:'0',context:0,attachment_size_limit:1048576,data:{custom_id:customId,component_type:2},message:rawMessage(messageId,privateFlag,actor)});
  Object.defineProperty(i.webhook,'editMessage',{configurable:true,value:async(target,payload)=>{assert.equal(target,'@original');assert.deepEqual(payload.allowedMentions,{parse:[]});for(const row of payload.components){assert.equal(ActionRowBuilder.from(row).toJSON().components.length,row.components.length);for(const b of row.components){const out=ButtonBuilder.from(b).toJSON();assert.equal(out.custom_id,b.custom_id);assert.equal(out.url,undefined);assert.ok(out.custom_id.length<=100);}}f.edits.push(payload);return new Message(client,rawMessage(M,true,actor));}});
  return i;
 };
 const packageSet=createStudentCourseSet([{courseKey:'ethical-hacking',title:'Synthetic course',audience:'student',reviewRef:'SYNTHETIC-ONLY',lessons:[{key:'L1',title:'Synthetic lesson',pages:['SYNTHETIC STUDENT CONTENT']}]}]);
 f.controller=createFormalCourseWorkspace({enabled:true,guildId:G,entryChannelId:C,entryMessageId:E,botUserId:BOT,verifiedRoleId:ROLE},{packageSet,now:()=>1000,isReady:()=>true,authorizeCourse:async ctx=>({...ctx,studentId:'SYNTHETIC-STUDENT'}),bookmarks:{load:async()=>f.saved??{status:'empty',revision:packageSet.describe('ethical-hacking').revision,version:0},save:async p=>(f.saved={status:'saved',revision:p.revision,lessonKey:p.lessonKey,pageIndex:p.pageIndex,version:p.expectedVersion+1})}});t.after(()=>f.controller.dispose());
 f.open=()=>f.button('fws:open:ethical-hacking',{messageId:E,privateFlag:false});f.control=label=>f.edits.at(-1).components.flatMap(r=>r.components).find(b=>b.label===label).custom_id;return f;
}
test('installed SDK private open, bound navigation, Save and Resume with simulated callbacks',async t=>{const f=fixture(t),entry=f.open();await f.controller.handle(entry);assert.equal(entry.ephemeral,true);assert.equal(f.callbacks[0].type,5);await f.controller.handle(f.button(f.control('Start course')));assert.match(f.edits.at(-1).content,/SYNTHETIC STUDENT CONTENT/);assert.equal(f.callbacks.at(-1).type,6);await f.controller.handle(f.button(f.control('Save position')));assert.equal(f.saved.version,1);await f.controller.handle(f.open());await f.controller.handle(f.button(f.control('Resume')));assert.match(f.edits.at(-1).content,/SYNTHETIC STUDENT CONTENT/);assert.equal(JSON.stringify(f.edits).includes('SYNTHETIC-STUDENT'),false);});
test('installed SDK foreign actor denial is private and does not edit owner view',async t=>{const f=fixture(t);await f.controller.handle(f.open());const n=f.edits.length;await f.controller.handle(f.button(f.control('Start course'),{actor:B}));assert.equal(f.edits.length,n);assert.equal(f.callbacks.at(-1).type,4);assert.equal(f.callbacks.at(-1).data.flags&64,64);});
