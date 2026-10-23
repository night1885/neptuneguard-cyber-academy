import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { randomUUID,createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { createProvenancePilotHandlers } from './certification-provenance-pilot-handlers.js';
import { createRegistrationPilotPolicy,createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';
import { createReadOnlyPreviewPool } from './certification-read-only-preview.js';
import { validateRuntimeCertificationSchema } from './certification-pilot-runtime-readiness.js';
import { validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
import { registrationAcknowledgmentUpdateColumns } from './certification-registration-provenance-readiness.js';
import { handleConsoleStudent } from './certification-console-student.js';
import { handleConsoleSettings } from './certification-console-settings.js';
const databaseUrl=process.env.CERTIFICATION_TEST_DATABASE_URL;
const enabled=process.env.CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DDL==='true';
const migrations=['001-certification.sql','002-typed-acknowledgment.sql','003-enrollment-submission-metadata.sql','004-immutable-agreement-versions.sql','005-account-acknowledgment-age.sql','006-application-closure-metadata.sql','007-course-enrollment-lifecycle.sql','008-lab-status-reason.sql','009-active-registration-provenance.sql','010-manual-review-enrollment.sql'];
const owner='1'.repeat(18),student='2'.repeat(18),other='6'.repeat(18),outsider='5'.repeat(18),guild='3'.repeat(18),channel='4'.repeat(18);
const prompt='Explain the permission required before starting an authorized training lab.';
const guide='PRIVATE REVIEW GUIDE FIXTURE',response='Learner response fixture unmatched';
const updates=Object.freeze([...registrationAcknowledgmentUpdateColumns,'comprehension_submitted_at','comprehension_review_snapshot']);
const columnIdentifier=key=>typeof key==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(key);
const sqlState=error=>typeof error?.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'unknown';
function trackedPool(Pool,options,label,state){
  const pool=new Pool(options);
  pool.on('error',error=>state.errors.push({pool:label,phase:state.phase,code:sqlState(error)}));
  return pool;
}
test('native fixture captures sanitized pool errors instead of ignoring them',()=>{
  class FakePool extends EventEmitter{}
  const state={phase:'readiness',errors:[]};
  const pool=trackedPool(FakePool,{},'app',state);
  pool.emit('error',Object.assign(new Error('PRIVATE CONNECTION DETAILS'),{code:'57P01'}));
  assert.deepEqual(state.errors,[{pool:'app',phase:'readiness',code:'57P01'}]);
  assert.throws(()=>assert.deepEqual(state.errors,[]));
  assert.ok(!JSON.stringify(state.errors).includes('PRIVATE'));
  state.phase='cleanup';
  pool.emit('error',Object.assign(new Error('PRIVATE'),{code:'PRIVATE CONNECTION DETAILS'}));
  assert.deepEqual(state.errors[1],{pool:'app',phase:'cleanup',code:'unknown'});
});
test('native fixture admits reviewed digit-containing columns and rejects unsafe identifiers',()=>{
  assert.ok(updates.every(columnIdentifier));
  assert.ok(columnIdentifier('agreement_content_sha256'));
  for(const value of ['',null,'2column','name;DROP TABLE x','public.column','name,other','name WITH GRANT OPTION','name--comment','name\\nother','x'.repeat(64)])assert.equal(columnIdentifier(value),false);
});
const controls=i=>i.messages.at(-1)?.components?.flatMap(row=>row.components)||[];
test('native manual-review invitation, submission and private owner inspection with real PostgreSQL',
  {skip:!databaseUrl||!enabled,timeout:90000},async context=>{
  const url=new URL(databaseUrl);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname));
  assert.equal(url.pathname,'/certification_test');assert.equal(url.search,'');assert.equal(url.hash,'');
  const name=`cert_native_${randomUUID().replaceAll('-','')}`,role=`cert_native_${randomUUID().replaceAll('-','')}`,password=randomUUID();
  assert.match(name,/^cert_native_[a-f0-9]{32}$/);assert.match(role,/^cert_native_[a-f0-9]{32}$/);
  const state={phase:'setup',errors:[]};
  const stage=value=>{state.phase=value;context.diagnostic(`Native fixture phase: ${value}`);};
  context.after(()=>assert.deepEqual(state.errors,[],'Unexpected PostgreSQL pool or cleanup errors (sanitized)'));
  const admin=trackedPool(pg.Pool,{connectionString:databaseUrl,max:1,connectionTimeoutMillis:5000},'admin',state);
  let created=false,roleCreated=false,db,app,readPool,route;
  const learnerPackets=[];
  function interaction(customId,{actor=owner,type='button',server=guild,fields={}}={}){
    const messages=[],forms=[];
    const capture=p=>{const value=JSON.parse(JSON.stringify(p));messages.push(value);if(actor!==owner)learnerPackets.push(value);};
    return{customId,user:{id:actor},guildId:server,channelId:channel,messages,forms,deferred:false,replied:false,
      isButton:()=>type==='button',isModalSubmit:()=>type==='modal',isStringSelectMenu:()=>false,
      fields:{getTextInputValue(key){assert.ok(Object.hasOwn(fields,key));return fields[key];}},
      client:{users:{fetch(){assert.fail('Native acceptance must not send DMs');}}},
      async reply(p){assert.equal(p.flags,64);this.replied=true;capture(p);},
      async followUp(p){assert.equal(p.flags,64);capture(p);},
      async editReply(p){assert.ok(this.deferred||this.replied);capture(p);},
      async deferReply(p){assert.equal(p.flags,64);this.deferred=true;},
      async showModal(p){const value=typeof p?.toJSON==='function'?p.toJSON():p;forms.push(value);if(actor!==owner)learnerPackets.push(value);this.replied=true;}};
  }
  async function register(id){
    const i=interaction('cert:register:submit',{type:'modal',fields:{discord_user_id:id}});await route(i);
    const confirm=controls(i).find(x=>x.custom_id?.startsWith('cert:register:confirm:'));assert.ok(confirm&&!confirm.disabled);
    await route(interaction(confirm.custom_id));
  }
  async function form(id){
    let i=interaction('cert:invite:start',{actor:id});await route(i);
    assert.ok(JSON.stringify(i.messages).includes(prompt));
    for(let n=0;n<20;n++){
      const next=controls(i).find(x=>!x.disabled&&/^cert:invite:(form|next):/.test(x.custom_id||''));assert.ok(next);
      i=interaction(next.custom_id,{actor:id});await route(i);
      if(i.forms.length){assert.ok(JSON.stringify(i.forms[0]).includes(prompt));return i.forms[0].custom_id;}
    }
    assert.fail('Missing native manual-review form');
  }
  try{
    stage('admin-connection');
    assert.equal((await admin.query('SELECT current_database() AS name')).rows[0].name,'certification_test');
    stage('database-create');
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created=true;url.pathname=`/${name}`;
    db=trackedPool(pg.Pool,{connectionString:url.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'},'setup',state);
    for(const file of migrations){stage(`migration:${file}`);await db.query(await readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));}
    stage('fixture-and-restricted-role');
    const content='Native manual-review agreement fixture.',hash=createHash('sha256').update(content).digest('hex');
    await db.query('INSERT INTO certification_agreements(version,content,content_sha256) VALUES($1,$2,$3)',['native-v1',content,hash]);
    await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);roleCreated=true;
    await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await db.query(`GRANT CONNECT ON DATABASE "${name}" TO "${role}"`);
    await db.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
    await db.query(`GRANT SELECT ON public.certification_enrollments,public.certification_agreements,public.certification_lab_requests,public.certification_course_enrollments TO "${role}"`);
    await db.query(`GRANT UPDATE(version) ON public.certification_agreements TO "${role}"`);
    await db.query(`GRANT INSERT(discord_user_id,status,registration_owner_id) ON public.certification_enrollments TO "${role}"`);
    assert.ok(updates.every(columnIdentifier));
    await db.query(`GRANT UPDATE(${updates.join(',')}) ON public.certification_enrollments TO "${role}"`);
    await db.query(`GRANT INSERT(actor_discord_user_id,subject_discord_user_id,action,details) ON public.certification_audit_events TO "${role}"`);
    await db.query(`GRANT USAGE ON SEQUENCE public.certification_audit_events_event_id_seq TO "${role}"`);
    const connection=new URL(url);connection.username=role;connection.password=password;
    app=trackedPool(pg.Pool,{connectionString:connection.href,max:1,connectionTimeoutMillis:5000,options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=5000'},'app',state);
    readPool=createReadOnlyPreviewPool(app);
    const settings={enabled:true,ownerId:owner,guildId:guild,adminChannelId:channel,studentIds:[student,other]};
    const config=Object.freeze({enabled:true,manualReviewEnabled:true,ownerId:owner,adminChannelId:channel,enrollmentSubmissionEnabled:false,
      activeAgreementVersion:'native-v1',activeAgreementSha256:hash,comprehensionCheck:{version:'native-check-v1',questions:[{prompt}],correctAnswers:[guide]},
      registrationPilotEnabled:true,registrationPilotPolicy:createRegistrationPilotPolicy(settings)});
    stage('readiness');
    await validateRuntimeCertificationSchema(readPool,{pilotConnection:{connectionString:connection.href}});
    await validateActiveEnrollmentAgreement(readPool,config);
    const handlers=createProvenancePilotHandlers({readPool,writePool:app,config,guildId:guild});
    const readViews=async i=>(await handleConsoleStudent(i,readPool,config,guild))||(await handleConsoleSettings(i,config,guild));
    route=createRegistrationPilotRouter({settings,readViews,...handlers});
    stage('registration');
    await register(student);await register(other);
    stage('form-opening');
    const modal=await form(student);
    stage('submission');
    const submitted=interaction(modal,{actor:student,type:'modal',fields:{age:'Yes',read:'AGREE',answer0:response}});await route(submitted);
    const record=(await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1',[student])).rows[0];
    assert.equal(record.status,'pending');assert.equal(record.registration_owner_id,null);assert.equal(record.age_eligible,true);
    assert.ok(record.comprehension_submitted_at);assert.equal(record.comprehension_review_snapshot.items[0].response,response);
    assert.equal(record.comprehension_review_snapshot.items[0].expectedAnswer,guide);
    for(const key of ['comprehension_passed_at','student_id','approved_by','approved_at'])assert.equal(record[key],null);
    const audit=()=>db.query("SELECT details FROM certification_audit_events WHERE subject_discord_user_id=$1 AND action='enrollment_submitted'",[student]);
    const events=(await audit()).rows;assert.equal(events.length,1);
    for(const value of [prompt,response,guide])assert.ok(!JSON.stringify(events).includes(value));
    stage('replay-and-owner-inspection');
    await route(interaction(modal,{actor:student,type:'modal',fields:{age:'Yes',read:'AGREE',answer0:'Changed replay answer'}}));
    assert.equal((await audit()).rows.length,1);
    const review=interaction(`cert:students:detail:${student}`);await route(review);
    for(const value of [prompt,response,guide])assert.ok(JSON.stringify(review.messages).includes(value));
    assert.ok(controls(review).filter(x=>/approve|deny|suspend|revoke|reinstate/i.test(x.label||'')).every(x=>x.disabled===true));
    const configuration=interaction('cert:console:settings');await route(configuration);assert.ok(JSON.stringify(configuration.messages).includes(guide));
    stage('negative-authorization-and-age');
    await route(interaction('cert:console:settings',{actor:student}));
    await route(interaction(`cert:students:detail:${student}`,{actor:student}));
    await route(interaction('cert:invite:start',{actor:outsider}));
    const noAge=await form(other);await route(interaction(noAge,{actor:other,type:'modal',fields:{age:'No',read:'AGREE',answer0:response}}));
    const denied=(await db.query('SELECT status,registration_owner_id,comprehension_submitted_at,comprehension_review_snapshot FROM certification_enrollments WHERE discord_user_id=$1',[other])).rows[0];
    assert.deepEqual(denied,{status:'awaiting_acknowledgment',registration_owner_id:owner,comprehension_submitted_at:null,comprehension_review_snapshot:null});
    assert.ok(!JSON.stringify(learnerPackets).includes(guide));
    stage('permission-boundaries');
    const permissions=(await app.query("SELECT bool_or(has_column_privilege(current_user,'public.certification_enrollments',name,'UPDATE') OR has_column_privilege(current_user,'public.certification_enrollments',name,'INSERT')) AS can_approve FROM unnest(ARRAY['student_id','approved_by','approved_at']) x(name)")).rows[0];
    assert.equal(permissions.can_approve,false);
    assert.equal((await db.query('SELECT status FROM certification_enrollments WHERE discord_user_id=$1',[student])).rows[0].status,'pending');
  }catch(error){
    context.diagnostic(`Native fixture failed in phase: ${state.phase}`);
    throw error;
  }finally{
    const cleanup=async(label,operation)=>{
      stage(`cleanup:${label}`);
      try{await operation();return true;}
      catch(error){state.errors.push({pool:'cleanup',phase:state.phase,code:sqlState(error)});return false;}
    };
    await cleanup('router',async()=>{await route?.dispose();});
    await cleanup('app-pool',async()=>{if(app)await app.end();});
    await cleanup('setup-pool',async()=>{if(db)await db.end();});
    let dropped=!created;
    if(created)dropped=await cleanup('database',()=>admin.query(`DROP DATABASE "${name}"`));
    if(roleCreated&&dropped)await cleanup('role',()=>admin.query(`DROP ROLE "${role}"`));
    await cleanup('admin-pool',()=>admin.end());
  }
});
