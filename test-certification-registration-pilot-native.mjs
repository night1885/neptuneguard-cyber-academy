import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ActionRowBuilder, ModalBuilder, EmbedBuilder } from 'discord.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { loadCertificationConfig } from './certification-config.js';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { createRegistrationPilotHandlers } from './certification-registration-pilot-handlers.js';
import { createOwnerRegistrationHandler } from './certification-owner-registration-ui.js';
import { createInvitationInteractionHandler } from './certification-invitation-interactions.js';
import { createReadOnlyPreviewPool } from './certification-read-only-preview.js';
import { PENDING_REGISTRATION_INVITATION_SQL } from './certification-registration-invitation.js';
const owner='1'.repeat(18),student='2'.repeat(18),other='6'.repeat(18),outsider='5'.repeat(18),guild='3'.repeat(18),channel='4'.repeat(18);
const content='Disposable native pilot agreement. '.repeat(55),hash=createHash('sha256').update(content).digest('hex');
const json=x=>typeof x?.toJSON==='function'?x.toJSON():x;
function packet(payload){const p={...payload};if(p.components)p.components=p.components.map(row=>new ActionRowBuilder(json(row)).toJSON());if(p.embeds)p.embeds=p.embeds.map(embed=>new EmbedBuilder(json(embed)).toJSON());return JSON.parse(JSON.stringify(p));}
function interaction(customId,{actor=owner,type='button',server=guild,fields={}}={}){
  const messages=[],forms=[],deferrals=[];
  return {customId,user:{id:actor},guildId:server,messages,forms,deferrals,deferred:false,replied:false,
    isButton:()=>type==='button',isModalSubmit:()=>type==='modal',isStringSelectMenu:()=>false,
    fields:{getTextInputValue(key){assert.ok(Object.hasOwn(fields,key),'Unexpected modal field '+key);return fields[key];}},
    client:{users:{fetch(){assert.fail('No learner DM is permitted');}}},
    async reply(p){assert.equal(p.flags,64);this.replied=true;messages.push(packet(p));},
    async followUp(p){assert.equal(p.flags,64);messages.push(packet(p));},
    async editReply(p){assert.ok(this.deferred||this.replied);this.replied=true;messages.push(packet(p));},
    async deferReply(p){assert.equal(p.flags,64);this.deferred=true;deferrals.push(p);},
    async showModal(p){assert.ok(!this.deferred&&!this.replied);forms.push(new ModalBuilder(json(p)).toJSON());this.replied=true;}};
}
function fixture(){
  let records=new Map(),events=[],failSubmissionAudit=false;
  const trace=[],releases=[];
  async function query(sql,params,client){trace.push({sql,params,readOnly:client.readOnly});
    if(sql==='BEGIN'||sql==='BEGIN READ ONLY'){client.saved={records:structuredClone(records),events:structuredClone(events)};client.readOnly=sql==='BEGIN READ ONLY';return {rows:[]};}
    if(sql==='ROLLBACK'){records=client.saved.records;events=client.saved.events;return {rows:[]};}
    if(sql==='COMMIT')return {rows:[]};
    if(client.readOnly&&/^(INSERT|UPDATE|DELETE)/.test(sql)){const e=new Error('Fixture read-only denial');e.code='25006';throw e;}
    if(sql===PENDING_REGISTRATION_INVITATION_SQL){const r=records.get(params[0]);return {rows:r?.status==='awaiting_acknowledgment'&&r.student_id==null&&r.approved_by==null&&r.approved_at==null&&r.acknowledgment_name==null&&r.signature_reference==null&&events.some(e=>e.actor===params[1]&&e.subject===params[0]&&e.action==='student_registered_by_owner')?[{invited:1}]:[]};}
    if(sql.startsWith('SELECT content'))return {rows:params[0]==='native-fixture-v1'?[{content,content_sha256:hash}]:[]};
    if(sql.startsWith('SELECT status')){const r=records.get(params[0]);return {rows:r?[{status:r.status}]:[]};}
    if(sql.startsWith('SELECT * FROM certification_enrollments')||sql.startsWith('SELECT discord_user_id')){const r=records.get(params[0]);return {rows:r?[structuredClone(r)]:[]};}
    if(sql.startsWith('INSERT INTO certification_enrollments')){if(records.has(params[0]))return {rows:[]};const r={discord_user_id:params[0],status:'awaiting_acknowledgment',student_id:null,approved_by:null,approved_at:null,acknowledgment_name:null,signature_reference:null};records.set(params[0],r);return {rows:[structuredClone(r)]};}
    if(sql.startsWith('UPDATE certification_enrollments')){const r=records.get(params[0]);assert.ok(r);Object.assign(r,{status:'pending',agreement_version:params[1],agreement_content_sha256:params[2],comprehension_check_version:params[3],age_declaration_version:params[4],signature_method:'discord_account',age_eligible:true,age_declared_at:'fixture',acknowledged_at:'fixture',learner_confirmed_read_at:'fixture',comprehension_passed_at:'fixture'});return {rows:[],rowCount:1};}
    if(sql.startsWith('INSERT INTO certification_audit_events')){const registration=sql.includes("'student_registered_by_owner'");if(!registration&&failSubmissionAudit)throw new Error('Fixture submission audit failure');events.push({actor:params[0],subject:registration?params[1]:params[0],action:registration?'student_registered_by_owner':'enrollment_submitted'});return {rows:[],rowCount:1};}
    assert.fail('Unexpected native-flow SQL');
  }
  const db={async query(sql,params){return query(sql,params,{readOnly:false});},async connect(){const client={readOnly:false,saved:null};return {query:(sql,params)=>query(sql,params,client),release(discard){releases.push(discard);}};},async end(){}};
  const env={CERTIFICATION_REGISTRATION_PILOT:'true',CERTIFICATION_ENABLED:'true',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSES_ENABLED:'false',ACADEMY_OWNER_ID:owner,ACADEMY_ADMIN_CHANNEL_ID:channel,GUILD_ID:guild,CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS:student+','+other,
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'native-fixture-v1',agreementSha256:hash,comprehensionCheck:{version:'native-check',questions:[{prompt:'Type A.'}],correctAnswers:['A']}})};
  const settings=readRegistrationPilotOptions(env),base=loadCertificationConfig(env),policy=createRegistrationPilotPolicy(settings),config=Object.freeze({...base,registrationPilotEnabled:true,registrationPilotPolicy:policy}),readPool=createReadOnlyPreviewPool(db);
  const handlers=createRegistrationPilotHandlers({readPool,writePool:db,config,guildId:guild,createRegistration:createOwnerRegistrationHandler,createInvitation:createInvitationInteractionHandler});
  const route=createRegistrationPilotRouter({settings,readViews:async()=>false,...handlers});
  return {route,db,base,trace,releases,get records(){return structuredClone(records);},get events(){return structuredClone(events);},set failSubmissionAudit(v){failSubmissionAudit=v;},writes(){return trace.filter(e=>/^(INSERT|UPDATE|DELETE)/.test(e.sql)).length;}};
}
const controls=i=>i.messages.at(-1)?.components?.flatMap(row=>row.components)||[];
async function register(f,handler=f.route){
  const open=interaction('cert:register:open');await handler(open);assert.equal(open.forms[0].custom_id,'cert:register:submit');
  const form=interaction('cert:register:submit',{type:'modal',fields:{discord_user_id:student}});await handler(form);
  const id=controls(form).find(c=>c.custom_id?.startsWith('cert:register:confirm:')).custom_id;
  const confirm=interaction(id);await handler(confirm);assert.equal(f.records.get(student).status,'awaiting_acknowledgment');return {confirm,id};
}
async function agreementForm(f){
  let i=interaction('cert:invite:start',{actor:student});await f.route(i);
  for(let page=0;page<50;page++){
    const buttons=controls(i),form=buttons.find(c=>!c.disabled&&c.custom_id?.startsWith('cert:invite:form:'));
    if(form){const modal=interaction(form.custom_id,{actor:student});await f.route(modal);assert.equal(modal.forms.length,1);return modal.forms[0].custom_id;}
    const next=buttons.find(c=>!c.disabled&&c.custom_id?.startsWith('cert:invite:next:'));assert.ok(next,'Expected agreement navigation');i=interaction(next.custom_id,{actor:student});await f.route(i);
  }
  assert.fail('Agreement did not reach final form');
}
async function send(f,id,fields={age:'Yes',read:'AGREE',answer0:'A'}){const i=interaction(id,{actor:student,type:'modal',fields});await f.route(i);return i;}
test('actual runtime module imports with SDK dependencies without starting a client',()=>{assert.equal(typeof attachCertificationRuntime,'function');});
test('actual parser/core/handlers/native SDK services complete registration to pending only',async()=>{
  const f=fixture();assert.equal(f.trace.length,0);const {confirm,id}=await register(f);assert.match(confirm.messages.at(-1).content,/separately approved and published/);assert.ok(!confirm.messages.at(-1).content.includes('/start'));
  const beforeReplay=f.writes();await f.route(interaction(id));assert.equal(f.writes(),beforeReplay);
  const status=interaction('cert:initial:home',{actor:student});await f.route(status);assert.equal(controls(status)[0].disabled,false);
  const modalId=await agreementForm(f),outcome=await send(f,modalId),record=f.records.get(student);
  assert.match(outcome.messages.at(-1).content,/submitted for admin review/);assert.equal(record.status,'pending');assert.equal(record.student_id,null);assert.equal(record.approved_by,null);assert.equal(record.approved_at,null);assert.deepEqual(f.events.map(e=>e.action),['student_registered_by_owner','enrollment_submitted']);
  const pending=interaction('cert:initial:status',{actor:student});await f.route(pending);assert.equal(controls(pending)[0].disabled,true);assert.ok(!controls(pending).some(c=>c.custom_id?.startsWith('cert:learner:')));assert.ok(f.trace.filter(e=>e.sql.startsWith('SELECT status')).every(e=>e.readOnly));
  assert.ok(!f.trace.some(e=>e.sql.includes('certification_course_enrollments')||e.sql.includes('certification_lab_requests')||e.sql.includes('learner_profiles')));
});
test('normal registration instruction remains unchanged with real SDK builders',async()=>{const f=fixture(),legacy=createOwnerRegistrationHandler(f.db,f.base,guild),{confirm}=await register(f,legacy);assert.ok(confirm.messages.at(-1).content.includes('run /start'));});
test('negative age declaration and wrong comprehension answer do not submit records',async()=>{for(const fields of [{age:'No',read:'AGREE',answer0:'A'},{age:'Yes',read:'AGREE',answer0:'wrong'}]){const f=fixture();await register(f);const id=await agreementForm(f),before=f.writes();await send(f,id,fields);assert.equal(f.records.get(student).status,'awaiting_acknowledgment');assert.equal(f.writes(),before);assert.equal(f.events.length,1);}});
test('listed second learner cannot borrow another learner acknowledgment session',async()=>{const f=fixture();await register(f);const start=interaction('cert:invite:start',{actor:student});await f.route(start);const token=controls(start)[0].custom_id.split(':').at(-1),before=f.writes();const attack=interaction('cert:invite:form:'+token,{actor:other});await f.route(attack);assert.equal(attack.forms.length,0);assert.equal(f.writes(),before);assert.match(attack.messages.at(-1).content,/Session expired/);assert.equal(f.records.get(student).status,'awaiting_acknowledgment');});
test('unlisted, foreign-guild and unrelated routes never reach SQL',async()=>{const f=fixture();for(const [id,options]of [['cert:register:open',{actor:outsider}],['cert:invite:start',{actor:outsider}],['cert:invite:start',{actor:owner}],['cert:initial:home',{actor:student,server:outsider}],['cert:submit:start',{actor:student}],['cert:enrollment:approve:'+student,{}],['cert:access:suspend:'+student,{}],['cert:section:open:training-readiness',{actor:student}]])await f.route(interaction(id,options));assert.equal(f.trace.length,0);});
test('submission audit failure preserves awaiting fixture state and requests rollback',async()=>{const f=fixture();await register(f);const id=await agreementForm(f);f.failSubmissionAudit=true;const outcome=await send(f,id);assert.match(outcome.messages.at(-1).content,/could not be completed/);assert.equal(f.records.get(student).status,'awaiting_acknowledgment');assert.equal(f.events.length,1);assert.equal(f.trace.at(-1).sql,'ROLLBACK');});
