import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombinedRegistrationRouter } from './certification-combined-registration-router.mjs';
import { createGeneralRegistrationPolicy } from './certification-general-registration.mjs';
import { createAdministratorCompletionCourseRouter } from './certification-admin-completion-runtime.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';
const O='100000000000000001',A='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',R='100000000000000006',S='100000000000000007';
const flatten=xs=>xs.flatMap(x=>[x,...(x.components?flatten(x.components):[])]);
async function fixture(){
 const state={admin:true,calls:[],legacy:[],clock:1000};
 const settings=Object.freeze({enabled:true,combined:true,generalMembers:true,ownerId:O,guildId:G,adminChannelId:C,verifiedRoleId:R,studentIds:Object.freeze([])});
 const config={enabled:true,ownerId:O};
 const base=createAdministratorCompletionCourseRouter({}, {}, config,G,{verifiedRoleId:R,now:()=>state.clock,createBaseRouter:()=>async i=>{await i.deferUpdate();await i.editReply({content:'',embeds:[{title:'NeptuneGuard — Initial student console',description:'Synthetic console fixture; not a live learner.'}],components:[]});return true;}},{createVerifier:()=>async()=>state.admin,createCompletion:(_p,_c,options)=>({async completeCourse(...args){assert.equal(await options.verifyAdministrator(args[0]),true);state.calls.push(args);return {alreadyCompleted:false};}}),createNavigation:async()=>({handle:async()=>false,handleAdmin:async i=>{state.legacy.push(i.customId);return false;},decorateAdminInteraction:i=>i,dispose(){}})});
 const noMutation=async()=>assert.fail('No registration or enrollment decision expected');
 const decisions=Object.assign(noMutation,{ready:true,initialize:async()=>({ready:true}),dispose:async()=>{}});
 const route=createCombinedRegistrationRouter({settings,policy:createGeneralRegistrationPolicy(settings,{ownerDecisionsEnabled:true}),base,registration:noMutation,learner:noMutation,ownerDecisions:decisions});
 function interaction(customId,{actor=A,card=false,modal=false}={}){return {customId,user:{id:actor,bot:false},guildId:G,guild:{id:G},channelId:C,client:{user:{id:B}},member:{id:actor,guild:{id:G},user:{id:actor,bot:false},pending:false,roles:{cache:new Set([R])}},message:{author:{id:B},interactionMetadata:{user:{id:actor}},flags:{has:n=>n===64||(card&&n===32768)}},deferred:false,replied:false,outputs:[],isButton:()=>!modal,isModalSubmit:()=>modal,isStringSelectMenu:()=>false,fields:{getTextInputValue:name=>name==='student'?S:COURSE_SECTION_KEYS[0]},async deferReply(){this.deferred=true;},async deferUpdate(){this.deferred=true;},async editReply(p){this.outputs.push(p);},async reply(p){this.replied=true;this.outputs.push(p);},async followUp(p){this.outputs.push(p);},async showModal(p){this.modal=p;}};}
 await route.initialize();return {route,state,interaction};
}
for(const actor of [O,A])for(const card of [false,true])test(`combined completion entry and modal actor=${actor} card=${card}`,async()=>{
 const f=await fixture();try{const home=f.interaction('cert:initial:home',{actor,card});await f.route(home);const controls=flatten(home.outputs.at(-1).components).filter(c=>c.type===2);const entry=controls.filter(c=>c.custom_id==='cert:admincomplete:open');assert.equal(entry.length,1);assert.notEqual(entry[0].disabled,true);if(card)assert.equal(home.outputs.at(-1).flags,32768);const open=f.interaction(entry[0].custom_id,{actor,card});await f.route(open);assert.equal(open.modal.custom_id,'cert:admincomplete:form');assert.equal(f.state.calls.length,0);}finally{await f.route.dispose();}
});
const confirmation=i=>flatten(i.outputs.at(-1).components).find(c=>c.custom_id?.startsWith('cert:admincomplete:confirm:')).custom_id;
for(const cancel of [false,true])test(`combined modal confirmation cancel=${cancel}`,async()=>{
 const f=await fixture();try{const form=f.interaction('cert:admincomplete:form',{modal:true});await f.route(form);const token=confirmation(form);assert.equal(f.state.calls.length,0);await f.route(f.interaction(cancel?token.replace(':confirm:',':cancel:'):token));assert.equal(f.state.calls.length,cancel?0:1);if(!cancel)assert.deepEqual(f.state.calls[0],[A,S,COURSE_SECTION_KEYS[0]]);await f.route(f.interaction(token));assert.equal(f.state.calls.length,cancel?0:1);}finally{await f.route.dispose();}
});
test('ordinary learner cannot open completion form or record completion',async()=>{
 const f=await fixture();try{f.state.admin=false;const open=f.interaction('cert:admincomplete:open');await f.route(open);assert.equal(open.modal,undefined);const form=f.interaction('cert:admincomplete:form',{modal:true});await f.route(form);assert.ok(!flatten(form.outputs.at(-1).components).some(c=>c.custom_id?.startsWith('cert:admincomplete:confirm:')));assert.equal(f.state.calls.length,0);}finally{await f.route.dispose();}
});
for(const denial of ['permission-loss','expiry','wrong-actor','wrong-guild','wrong-origin','disposal'])test(`combined confirmation denied: ${denial}`,async()=>{
 const f=await fixture();try{const form=f.interaction('cert:admincomplete:form',{modal:true});await f.route(form);const token=confirmation(form),i=f.interaction(token);if(denial==='permission-loss')f.state.admin=false;if(denial==='expiry')f.state.clock+=300000;if(denial==='wrong-actor'){i.user.id=S;i.member.id=S;i.member.user.id=S;i.message.interactionMetadata.user.id=S;}if(denial==='wrong-guild')i.guildId=S;if(denial==='wrong-origin')i.message.interactionMetadata.user.id=S;if(denial==='disposal')await f.route.dispose();await f.route(i);assert.equal(f.state.calls.length,0);}finally{await f.route.dispose();}
});
for(const id of ['cert:admincomplete:request:'+S+':'+COURSE_SECTION_KEYS[0],'cert:admincomplete:confirm:bad','cert:admincomplete:unsafe','cert:courselife:assign:'+S])test('combined rejects unadmitted action '+id,async()=>{
 const f=await fixture();try{const i=f.interaction(id);await f.route(i);assert.match(i.outputs.at(-1).content,/No operation was admitted/);assert.equal(f.state.calls.length,0);assert.ok(!f.state.legacy.includes(id));}finally{await f.route.dispose();}
});
test('non-owner admin cannot use completion to admit another modal',async()=>{
 const f=await fixture();try{const i=f.interaction('cert:admincomplete:form',{modal:true});i.customId='cert:admincomplete:form:other';await f.route(i);assert.equal(i.modal,undefined);assert.equal(f.state.calls.length,0);}finally{await f.route.dispose();}
});
