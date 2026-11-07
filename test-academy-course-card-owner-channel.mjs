import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombinedRegistrationRouter} from './certification-combined-registration-router.mjs';
import {createGeneralRegistrationPolicy} from './certification-general-registration.mjs';
import {academyCardPayload} from './academy-course-card-ui.mjs';
const O='100000000000000001',S='100000000000000002',G='100000000000000003',C='100000000000000004',L='100000000000000005',B='100000000000000006',V='100000000000000007';
const settings=Object.freeze({combined:true,enabled:true,generalMembers:true,ownerId:O,guildId:G,adminChannelId:C,verifiedRoleId:V,studentIds:Object.freeze([])});
const policy=createGeneralRegistrationPolicy(settings,{ownerDecisionsEnabled:true});
const ids=['cert:initial:home','cert:initial:status','cert:initial:help','cert:course:catalog:0','cert:cr:catalog:0','cert:admin:overview:0','cert:courselife:assign:'+S,'cert:invite:start','cert:register:open','cert:unavailable:fixture'];
const payload=()=>({content:'Fixture console',embeds:[{title:'Fixture console',description:'Read-only presentation fixture'}],components:[{type:1,components:ids.slice(0,5).map((custom_id,n)=>({type:2,style:2,custom_id,label:'Control '+n}))},{type:1,components:ids.slice(5).map((custom_id,n)=>({type:2,style:2,custom_id,label:'Control '+(n+5)}))}],allowedMentions:{parse:[]}});
const flat=items=>(items||[]).flatMap(x=>[x,...flat(x.components)]);
const controls=p=>flat(p.components).filter(x=>x.type===2);
const clone=x=>JSON.parse(JSON.stringify(x));
async function fixture(t,{mode='editReply',actor=O,channel=L,privateSource=true}={}) {
 const calls=[],hits={base:0,registration:0,learner:0,decision:0};
 const base=async i=>{hits.base++;const p=payload(),before=JSON.stringify(p);const card=mode.startsWith('card-'),method=card?mode.slice(5):mode;
  if(method==='editReply')await i.deferReply({flags:64});
  if(card)await i[Symbol.for('neptuneguard.academy.course-card-transport')](method,p,academyCardPayload);
  else if(method==='unsafe-edit')await i.editReply(p);
  else if(method==='unsafe-update')await i.update(p);
  else await i[method](p);
  assert.equal(JSON.stringify(p),before);return true;};
 base.initialize=async()=>{};base.dispose=async()=>{};
 const forbidden=name=>async()=>{hits[name]++;assert.fail('No mutation or decision fixture should be dispatched');};
 const decisions=forbidden('decision');decisions.ready=true;decisions.initialize=async()=>({ready:true});decisions.dispose=async()=>{};
 const route=createCombinedRegistrationRouter({settings,policy,base,registration:forbidden('registration'),learner:forbidden('learner'),ownerDecisions:decisions});
 t.after(()=>route.dispose());await route.initialize();
 const i={customId:'cert:initial:home',user:{id:actor,bot:false},member:{id:actor,guild:{id:G},user:{id:actor,bot:false},pending:false,roles:{cache:{has:id=>id===V}}},guildId:G,guild:{id:G},channelId:channel,client:{user:{id:B}},message:{author:{id:B},interactionMetadata:{user:{id:actor}},flags:{has:n=>privateSource&&n===64}},deferred:false,replied:false,ephemeral:false,isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,
  async deferReply(p){assert.equal(p.flags,64);this.deferred=true;this.ephemeral=true;},
  async reply(p){this.replied=true;calls.push(['reply',clone(p)]);},async followUp(p){calls.push(['followUp',clone(p)]);},async editReply(p){calls.push(['editReply',clone(p)]);},async update(p){this.replied=true;calls.push(['update',clone(p)]);}};
 return {route,i,calls,hits};
}
for(const actor of [O,S])for(const channel of [C,L])for(const mode of ['reply','followUp','editReply','update','card-reply','card-editReply','card-update'])test(`controls actor=${actor===O?'owner':'learner'} channel=${channel===C?'admin':'outside'} ${mode}`,async t=>{
 const f=await fixture(t,{actor,channel,mode});await f.route(f.i);assert.deepEqual(f.hits,{base:1,registration:0,learner:0,decision:0});assert.equal(f.calls.length,1);
 const p=f.calls[0][1],buttons=controls(p);assert.equal(buttons.length,ids.length);assert.deepEqual(p.allowedMentions,{parse:[]});assert.equal(new Set(buttons.map(b=>b.custom_id)).size,buttons.length);
 ids.forEach((id,n)=>{const originalAllowed=/^cert:(?:course|cr):/.test(id)||(actor===O&&id.startsWith('cert:courselife:'))||policy.allowsButton(actor,id)||(actor!==O&&/^cert:(?:initial:(?:home|status|help)|learner:(?:home|status))$/.test(id));
  const allowed=originalAllowed&&(actor!==O||channel===C||/^cert:initial:(?:home|status|help)$/.test(id));
  assert.equal(buttons[n].label,'Control '+n);assert.equal(buttons[n].disabled===true,!allowed,id);if(allowed)assert.equal(buttons[n].custom_id,id);else assert.match(buttons[n].custom_id,/^cert:combined:disabled:/);
 });
 if(mode.startsWith('card-')){assert.equal(p.flags&32768,32768);assert.ok(!('content'in p));assert.ok(!('embeds'in p));}else assert.equal(p.content,'Fixture console');
 if(mode==='reply'||mode==='followUp'||mode==='card-reply')assert.equal(p.flags&64,64);
});
for(const id of ['cert:course:catalog:0','cert:cr:catalog:0','cert:courselife:assign:'+S,'cert:review:open:'+S,'cert:register:open'])test('owner outside admin remains denied '+id,async t=>{const f=await fixture(t);f.i.customId=id;await f.route(f.i);assert.deepEqual(f.hits,{base:0,registration:0,learner:0,decision:0});assert.equal(f.calls.length,1);assert.equal(f.calls[0][1].flags,64);assert.match(f.calls[0][1].content,/No operation was admitted/);});
for(const page of ['home','status','help'])test('owner own initial '+page+' remains admitted outside admin',async t=>{const f=await fixture(t);f.i.customId='cert:initial:'+page;await f.route(f.i);assert.equal(f.hits.base,1);assert.equal(controls(f.calls[0][1]).find(b=>b.label==='Control 3').disabled,true);});
for(const actor of [O,S])test('catalog dispatch remains admitted in admin actor='+actor,async t=>{const f=await fixture(t,{actor,channel:C});f.i.customId='cert:course:catalog:0';await f.route(f.i);assert.equal(f.hits.base,1);assert.deepEqual([f.hits.registration,f.hits.learner,f.hits.decision],[0,0,0]);});
test('verified learner catalog dispatch outside admin remains admitted without fixture enrollment data',async t=>{const f=await fixture(t,{actor:S});f.i.customId='cert:course:catalog:0';await f.route(f.i);assert.equal(f.hits.base,1);});
for(const bad of ['origin','author','guild','bot','pending','role'])test('existing private/member boundary remains closed '+bad,async t=>{const f=await fixture(t,{actor:S});if(bad==='origin')f.i.message.interactionMetadata.user.id=O;if(bad==='author')f.i.message.author.id=S;if(bad==='guild')f.i.guildId=L;if(bad==='bot')f.i.user.bot=true;if(bad==='pending')f.i.member.pending=true;if(bad==='role')f.i.member.roles.cache.has=()=>false;await f.route(f.i);assert.deepEqual(f.hits,{base:0,registration:0,learner:0,decision:0});assert.match(f.calls[0][1].content,/No operation was admitted/);});
for(const mode of ['unsafe-edit','unsafe-update'])test('public source cannot bypass private transport '+mode,async t=>{const f=await fixture(t,{mode,privateSource:false});await assert.rejects(f.route(f.i),/Private reply required|Own private message required/);assert.equal(f.calls.length,0);});
test('forged disabled placeholder remains unadmitted',async t=>{const f=await fixture(t);f.i.customId='cert:combined:disabled:0:3';await f.route(f.i);assert.equal(f.hits.base,0);assert.match(f.calls[0][1].content,/No operation was admitted/);});
