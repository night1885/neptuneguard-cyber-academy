import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegistrationPilotPolicy} from './certification-registration-pilot-guard.js';
import {createCombinedRegistrationRouter} from './certification-combined-registration-router.mjs';
const O='100000000000000001',S='100000000000000002',G='100000000000000003',C='100000000000000004',B='100000000000000005',X='100000000000000006',T='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const tick=()=>new Promise(r=>setImmediate(r));
function held(){let release;return {promise:new Promise(r=>release=r),release:()=>release()};}
function fixture({action}={}){
 const actions=[],events=[];
 const settings=Object.freeze({enabled:true,combined:true,ownerId:O,guildId:G,adminChannelId:C,studentIds:Object.freeze([S])});
 const policy=createRegistrationPilotPolicy(settings,{ownerDecisionsEnabled:true});
 const payload={content:'fixture',allowedMentions:{parse:['everyone']},components:[{type:1,components:[
  {type:2,style:2,label:'Legacy access',custom_id:'cert:access:suspend:'+S},
  {type:2,style:2,label:'Courses',custom_id:'cert:course:catalog:0'},
  {type:2,style:2,label:'Assignments',custom_id:'cert:courselife:open:'+S+':0'}]},
  {type:1,components:[{type:3,custom_id:'cert:admin:section',options:[{label:'Courses',value:'courses'},{label:'Unsafe',value:'unsafe'}]}]},
  {type:1,components:[{type:3,custom_id:'cert:courselife:assign:'+S,options:[{label:'Fixture',value:'fixture'}]}]}]};
 const make=name=>Object.assign(async i=>{actions.push(name);if(action)return action(i,name);await i.deferReply({flags:0});await i.editReply(payload);return true;},
  {ready:true,async initialize(){events.push('initialize:'+name);return {ready:true};},async dispose(){events.push('dispose:'+name);}});
 const base=make('base'),ownerDecisions=make('decision');
 const route=createCombinedRegistrationRouter({settings,policy,base,ownerDecisions,registration:make('registration'),learner:make('learner')});
 const interaction=(customId,actor=S,type='button')=>({customId,user:{id:actor},client:{user:{id:B}},guildId:G,guild:{id:G},channelId:C,outputs:[],ephemeral:false,deferred:false,replied:false,
  isButton:()=>type==='button',isModalSubmit:()=>type==='modal',isStringSelectMenu:()=>type==='menu',fields:{getTextInputValue:()=>S},
  async reply(p){assert.equal(p.flags,64);this.replied=true;this.outputs.push(p);},async followUp(p){assert.equal(p.flags,64);this.outputs.push(p);},
  async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},async editReply(p){this.outputs.push(p);},async update(p){this.outputs.push(p);},async deferUpdate(){this.deferred=true;},async showModal(p){this.modal=p;}});
 const privateMessage=i=>{i.message={flags:{has:value=>value===64},author:{id:B},interactionMetadata:{user:{id:i.user.id}}};return i;};
 return {route,base,ownerDecisions,actions,events,payload,interaction,privateMessage};
}
test('combined route admits nothing before readiness',async()=>{const f=fixture(),i=f.interaction('cert:course:catalog:0');await f.route(i);assert.deepEqual(f.actions,[]);assert.equal(i.outputs[0].flags,64);await f.route.dispose();});
for(const [id,actor,target,type]of [
 ['cert:register:open',O,'registration'],['cert:review:open:'+S,O,'decision'],['cert:invite:start',S,'learner'],
 ['cert:course:catalog:0',S,'base'],['cert:course:catalog:0',X,'base'],['cert:cr:entry',S,'base'],
 ['cert:courselife:assign:'+S,O,'base','menu'],['cert:students:detail:'+S,O,'base'],['cert:initial:home',S,'base'],['cert:learner:home',S,'base']
])test('combined dispatch: '+id+' actor '+actor,async()=>{const f=fixture();await f.route.initialize();await f.route(f.interaction(id,actor,type));assert.deepEqual(f.actions,[target]);await f.route.dispose();});
for(const [id,actor]of [
 ['cert:register:open',S],['cert:invite:start',X],['cert:review:open:'+S,S],['cert:courselife:open:'+S+':0',S],['cert:review:open:'+X,O],
 ['cert:owneraccess:confirm:'+T,O],['cert:lab:approve:fixture',O],['cert:enroll:approve:'+S,O],['cert:access:suspend:'+S,O]
])test('combined denied route: '+id+' actor '+actor,async()=>{const f=fixture();await f.route.initialize();const i=f.interaction(id,actor);await f.route(i);assert.deepEqual(f.actions,[]);assert.equal(i.outputs[0].flags,64);await f.route.dispose();});
test('registration modal target outside the server-held scope is denied',async()=>{const f=fixture();await f.route.initialize();const i=f.interaction('cert:register:submit',O,'modal');i.fields.getTextInputValue=()=>X;await f.route(i);assert.deepEqual(f.actions,[]);await f.route.dispose();});
test('wrong guild or owner channel cannot enter a handler',async()=>{const f=fixture();await f.route.initialize();const a=f.interaction('cert:course:catalog:0');a.guildId=O;await f.route(a);const b=f.interaction('cert:register:open',O);b.channelId=S;await f.route(b);assert.deepEqual(f.actions,[]);await f.route.dispose();});
test('ambiguous interaction kinds are denied',async()=>{const f=fixture();await f.route.initialize();const i=f.interaction('cert:course:catalog:0');i.isModalSubmit=()=>true;await f.route(i);assert.deepEqual(f.actions,[]);await f.route.dispose();});
for(const bad of ['origin','author','missing-origin'])test('private source provenance denied: '+bad,async()=>{const f=fixture();await f.route.initialize();const i=f.privateMessage(f.interaction('cert:course:catalog:0'));if(bad==='origin')i.message.interactionMetadata.user.id=O;if(bad==='author')i.message.author.id=O;if(bad==='missing-origin')delete i.message.interactionMetadata;await f.route(i);assert.deepEqual(f.actions,[]);await f.route.dispose();});
test('owner decision session dispatch requires its own private bot message',async()=>{const f=fixture();await f.route.initialize();await f.route(f.privateMessage(f.interaction('cert:review:confirm:'+T,O)));assert.deepEqual(f.actions,['decision']);await f.route.dispose();});
test('a public owner decision session control is not admitted',async()=>{const f=fixture();await f.route.initialize();await f.route(f.interaction('cert:review:confirm:'+T,O));assert.deepEqual(f.actions,[]);await f.route.dispose();});
test('owner presentation preserves courses and assignment controls but removes unsafe controls and mentions',async()=>{const f=fixture();await f.route.initialize();const i=f.interaction('cert:students:detail:'+S,O);await f.route(i);const p=i.outputs.at(-1),buttons=p.components[0].components;assert.equal(buttons[0].disabled,true);assert.equal(buttons[1].custom_id,'cert:course:catalog:0');assert.equal(buttons[2].custom_id,'cert:courselife:open:'+S+':0');assert.deepEqual(p.allowedMentions,{parse:[]});assert.deepEqual(p.components[1].components[0].options.map(o=>o.value),['courses']);assert.notEqual(p.components[2].components[0].disabled,true);assert.equal(f.payload.components[0].components[0].disabled,undefined);await f.route.dispose();});
test('learner presentation disables owner-only assignment controls',async()=>{const f=fixture();await f.route.initialize();const i=f.interaction('cert:initial:home');await f.route(i);const p=i.outputs.at(-1);assert.equal(p.components[0].components[2].disabled,true);assert.equal(p.components[2].components[0].disabled,true);await f.route.dispose();});
test('public message updates are blocked by the adapter',async()=>{const f=fixture({action:async i=>{await i.update({content:'fixture'});return true;}});await f.route.initialize();const i=f.interaction('cert:course:catalog:0');await assert.rejects(f.route(i),/Own private message required/);assert.deepEqual(i.outputs,[]);await f.route.dispose();});
test('editing a reply without private acknowledgment is blocked',async()=>{const f=fixture({action:async i=>{await i.editReply({content:'fixture'});return true;}});await f.route.initialize();await assert.rejects(f.route(f.interaction('cert:course:catalog:0')),/Private reply required/);await f.route.dispose();});
test('unadmitted registration modal is blocked',async()=>{const f=fixture({action:async i=>{await i.showModal({custom_id:'cert:access:reason'});return true;}});await f.route.initialize();await assert.rejects(f.route(f.interaction('cert:register:open',O)),/Modal not admitted/);await f.route.dispose();});
test('native course request modal namespace remains available to its handler',async()=>{const f=fixture({action:async i=>{await i.showModal({custom_id:'cert:cr:reason:'+T});return true;}});await f.route.initialize();const i=f.interaction('cert:cr:entry');await f.route(i);assert.equal(i.modal.custom_id,'cert:cr:reason:'+T);await f.route.dispose();});
test('failed decision readiness keeps combined admission closed',async()=>{const f=fixture();f.ownerDecisions.ready=false;await assert.rejects(f.route.initialize(),/Decision readiness unconfirmed/);await f.route(f.interaction('cert:course:catalog:0'));assert.deepEqual(f.actions,[]);await f.route.dispose();});
test('initialization and disposal are idempotent',async()=>{const f=fixture(),first=f.route.initialize();assert.equal(f.route.initialize(),first);await first;assert.deepEqual(f.events,['initialize:base','initialize:decision']);const closing=f.route.dispose();assert.equal(f.route.dispose(),closing);await closing;assert.deepEqual(f.events.slice(2).sort(),['dispose:base','dispose:decision']);});
test('dispose during startup waits and does not initialize decisions afterward',async()=>{const f=fixture(),gate=held();f.base.initialize=async()=>{f.events.push('initialize:base');await gate.promise;};const starting=f.route.initialize();await tick();const closing=f.route.dispose();await tick();assert.equal(f.events.includes('dispose:base'),false);gate.release();await assert.rejects(starting,/Combined startup stopped/);await closing;assert.equal(f.events.includes('initialize:decision'),false);});
test('dispose drains admitted callbacks before disposing owned handlers',async()=>{const gate=held(),f=fixture({action:async i=>{await gate.promise;await i.reply({content:'fixture'});return true;}});await f.route.initialize();const running=f.route(f.interaction('cert:course:catalog:0'));await tick();const closing=f.route.dispose();await tick();assert.equal(f.events.includes('dispose:base'),false);gate.release();await Promise.all([running,closing]);assert.equal(f.events.includes('dispose:base'),true);});
test('handler disposal failures are observable',async()=>{const f=fixture();await f.route.initialize();f.base.dispose=async()=>{throw Error('fixture disposal');};await assert.rejects(f.route.dispose(),/Combined runtime drain or disposal failed/);assert.equal(f.events.includes('dispose:decision'),true);});
test('an admitted callback returning false is not reported handled',async()=>{const f=fixture({action:async()=>false});await f.route.initialize();await assert.rejects(f.route(f.interaction('cert:course:catalog:0')),/Admitted combined action not handled/);await f.route.dispose();});
test('disposed routes reject initialization and hold new interactions',async()=>{const f=fixture();await f.route.initialize();await f.route.dispose();await assert.rejects(f.route.initialize(),/Combined runtime disposed/);await f.route(f.interaction('cert:course:catalog:0'));assert.deepEqual(f.actions,[]);});
