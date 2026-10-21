import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { createRegistrationPilotHandlers } from './certification-registration-pilot-handlers.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner='1'.repeat(18),student='2'.repeat(18),guild='3'.repeat(18),channel='4'.repeat(18),outsider='5'.repeat(18);
const settings={enabled:true,ownerId:owner,guildId:guild,adminChannelId:channel,studentIds:[student]};
const policy=createRegistrationPilotPolicy(settings);
const config={enabled:true,ownerId:owner,enrollmentSubmissionEnabled:false,registrationPilotEnabled:true,registrationPilotPolicy:policy,activeAgreementVersion:'fixture-v1',activeAgreementSha256:'a'.repeat(64)};
function interaction(customId='cert:initial:home',{actor=student,server=guild,privateMessage=false,origin,type='button'}={}){
  const messages=[],deferrals=[];
  return {customId,user:{id:actor},guildId:server,messages,deferrals,deferred:false,replied:false,
    isButton:()=>type==='button',isModalSubmit:()=>type==='modal',isStringSelectMenu:()=>false,
    message:{flags:{has:()=>privateMessage},interactionMetadata:origin?{user:{id:origin}}:undefined},
    async reply(p){messages.push(p);},async followUp(p){messages.push(p);},async editReply(p){messages.push(p);},
    async deferReply(p){this.deferred=true;deferrals.push(p);},async deferUpdate(){this.deferred=true;deferrals.push('update');}};
}
function fixture({status='awaiting_acknowledgment',invited=true,inviter=owner,readError=false,duplicate=false,delay=false,cfg=config,server=guild,registrationResult=true,invitationResult=true}={}){
  const queries=[],factories=[],invocations=[];let release;
  const writePool={async query(){assert.fail('Status must not use writable query interface');},async connect(){assert.fail('Status must not check out a writable client');}};
  const readPool={async query(sql,params){queries.push({sql,params});if(readError)throw new Error('PRIVATE_SENTINEL');
    if(sql===PENDING_REGISTRATION_INVITATION_SQL)return {rows:invited&&params[1]===inviter?[{invited:1}]:[]};
    assert.equal(sql,'SELECT status FROM certification_enrollments WHERE discord_user_id=$1');
    if(delay)return new Promise(resolve=>{release=()=>resolve({rows:[{status}]});});
    return {rows:status===null?[]:duplicate?[{status},{status}]:[{status}]};}};
  const createRegistration=(pool,scoped,target)=>{factories.push({name:'registration',pool,scoped,target});return async i=>{invocations.push('registration');return registrationResult;};};
  const createInvitation=(pool,scoped,target)=>{factories.push({name:'invitation',pool,scoped,target});return async i=>{invocations.push(i.customId);return invitationResult;};};
  const args={readPool,writePool,config:cfg,guildId:server,createRegistration,createInvitation};
  const handlers=createRegistrationPilotHandlers(args);
  return {handlers,args,queries,factories,invocations,writePool,readPool,release(){release();}};
}
test('construction scopes only native factories to writable pool without querying',()=>{const f=fixture();assert.equal(f.queries.length,0);assert.equal(f.invocations.length,0);assert.equal(f.factories.length,2);for(const item of f.factories){assert.equal(item.pool,f.writePool);assert.ok(Object.isFrozen(item.scoped));assert.equal(item.scoped.registrationPilotPolicy,policy);assert.equal(item.target,guild);}assert.ok(Object.isFrozen(f.handlers));});
for(const change of [{readPool:null},{writePool:null},{createRegistration:null},{createInvitation:null},{config:{}},{config:{...config,registrationPilotEnabled:false}},{config:{...config,activeAgreementVersion:''}},{config:{...config,activeAgreementSha256:'x'}},{guildId:10000000000000000},{guildId:'x'}])test('invalid factory context '+Object.keys(change)[0],()=>{const f=fixture();assert.throws(()=>createRegistrationPilotHandlers({...f.args,...change}));});
test('the same read and write pool is rejected',()=>{const f=fixture();assert.throws(()=>createRegistrationPilotHandlers({...f.args,readPool:f.writePool}));});
for(const name of ['createRegistration','createInvitation'])test('factory must return function '+name,()=>{const f=fixture();assert.throws(()=>createRegistrationPilotHandlers({...f.args,[name]:()=>null}));});
for(const status of [null,'awaiting_acknowledgment','pending','approved','denied','suspended','revoked','unexpected'])test('status only never offers access: '+status,async()=>{const f=fixture({status}),i=interaction();await f.handlers.learner(i);assert.deepEqual(i.deferrals,[{flags:64}]);const p=i.messages[0];assert.equal(p.embeds[0].fields.find(field=>field.name==='Course and lab access').value,'Not enabled by this registration pilot');assert.deepEqual(p.allowedMentions,{parse:[]});const controls=p.components[0].components;assert.ok(!controls.some(c=>c.custom_id.startsWith('cert:learner:')||c.custom_id.startsWith('cert:section:')));assert.equal(controls[0].disabled,status!=='awaiting_acknowledgment');assert.equal(f.invocations.length,0);});
for(const options of [{invited:false},{inviter:outsider}])test('missing or foreign invitation disables acknowledgment '+Object.keys(options)[0],async()=>{const f=fixture(options),i=interaction();await f.handlers.learner(i);assert.equal(i.messages[0].components[0].components[0].disabled,true);});
test('configuration owner is snapshotted for read-side invitation lookup',async()=>{const cfg={...config},f=fixture({cfg});cfg.ownerId=outsider;await f.handlers.learner(interaction());assert.deepEqual(f.queries.find(q=>q.sql===PENDING_REGISTRATION_INVITATION_SQL).params,[student,owner]);});
const denied=[['cert:initial:home',{actor:outsider}],['cert:initial:home',{actor:owner}],['cert:initial:home',{server:outsider}],['cert:admin:overview:0',{}],['cert:submit:start',{}],['cert:learner:home',{}],['cert:initial:home',{type:'modal'}],['cert:invite:start',{actor:outsider}],['cert:initial:home',{privateMessage:true,origin:outsider}]];
for(const [route,options]of denied)test('direct learner callback denies '+route+' '+JSON.stringify(options),async()=>{const f=fixture(),i=interaction(route,options);await f.handlers.learner(i);assert.equal(f.queries.length,0);assert.equal(f.invocations.length,0);assert.equal(i.messages[0].flags,64);});
test('mismatched factory guild fails closed without reads',async()=>{const f=fixture({server:outsider});await f.handlers.learner(interaction());assert.equal(f.queries.length,0);assert.equal(f.invocations.length,0);});
test('ambiguous methods fail closed',async()=>{const f=fixture(),i=interaction();i.isModalSubmit=()=>true;await f.handlers.learner(i);assert.equal(f.queries.length,0);});
test('acknowledged denial sends private followup, never edits source',async()=>{const f=fixture(),i=interaction('cert:learner:home');i.replied=true;i.editReply=()=>assert.fail();await f.handlers.learner(i);assert.equal(i.messages[0].flags,64);});
for(const [id,type]of [['cert:invite:start','button'],['cert:invite:send:01234567-89ab-4cde-8fab-0123456789ab','modal']])test('admitted invitation delegates without status query '+id,async()=>{const f=fixture(),i=interaction(id,{type});await f.handlers.learner(i);assert.deepEqual(f.invocations,[id]);assert.equal(f.queries.length,0);});
test('native invitation false result is an error, not fallback admission',async()=>{const f=fixture({invitationResult:false});await assert.rejects(f.handlers.learner(interaction('cert:invite:start')));});
test('own private status response updates in place',async()=>{const f=fixture(),i=interaction('cert:initial:status',{privateMessage:true,origin:student});await f.handlers.learner(i);assert.deepEqual(i.deferrals,['update']);});
test('public or unattributed response uses new private deferral',async()=>{for(const options of [{privateMessage:false,origin:student},{privateMessage:true}]){const f=fixture(),i=interaction('cert:initial:status',options);await f.handlers.learner(i);assert.deepEqual(i.deferrals,[{flags:64}]);}});
test('help uses component entry and excludes slash-command instructions',async()=>{const f=fixture(),i=interaction('cert:initial:help');await f.handlers.learner(i);assert.match(i.messages[0].embeds[0].description,/separately approved pilot entry/);assert.ok(!JSON.stringify(i.messages).includes('/start'));});
test('rate limit prevents sixth status query',async()=>{const f=fixture({status:'pending'});let i;for(let n=0;n<6;n++){i=interaction('cert:initial:status');await f.handlers.learner(i);}assert.equal(f.queries.length,5);assert.match(i.messages[0].content,/rate limited/);});
test('busy actor cannot overlap status reads',async()=>{const f=fixture({delay:true,status:'pending'}),first=interaction(),pending=f.handlers.learner(first);for(let n=0;n<20&&!f.queries.length;n++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.queries.length,1);const second=interaction();await f.handlers.learner(second);assert.equal(f.queries.length,1);assert.match(second.messages[0].content,/busy/);f.release();await pending;});
for(const options of [{readError:true},{duplicate:true}])test('status failure is private and omits exception data '+Object.keys(options)[0],async()=>{const f=fixture(options),i=interaction();await f.handlers.learner(i);assert.match(i.messages[0].content,/could not be checked/);assert.deepEqual(i.messages[0].components,[]);assert.ok(!JSON.stringify(i.messages).includes('PRIVATE_SENTINEL'));});
test('actual outer core and new learner handler compose',async()=>{const f=fixture(),route=createRegistrationPilotRouter({settings,readViews:async()=>true,...f.handlers}),i=interaction();await route(i);assert.match(i.messages[0].content,/Registration pilot/);assert.equal(i.messages[0].components[0].components[0].custom_id,'cert:invite:start');});
