import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
const source=await readFile(new URL('./certification-runtime.js',import.meta.url),'utf8');
for(const mode of ['pilot','normal','preview'])test('detach during agreement: '+mode,{timeout:5000},async()=>{
  let release,enter;
  const wait=new Promise(r=>{release=r;}),entered=new Promise(r=>{enter=r;});
  let initialized=0,ended=0,disposed=0,guildFetches=0;
  const owner='1'.repeat(18),guild='3'.repeat(18),channel='4'.repeat(18);
  const client=new EventEmitter();client.isReady=()=>false;
  client.guilds={fetch:async()=>{guildFetches++;throw new Error('Unexpected guild lookup');}};
  const pool={end:async()=>{ended++;}};
  const route=async()=>true;
  route.initialize=async()=>{initialized++;};route.dispose=()=>{disposed++;};
  const config={enabled:true,ownerId:owner,adminChannelId:channel,enrollmentSubmissionEnabled:false,activeAgreementVersion:'v1',activeAgreementSha256:'a'.repeat(64)};
  const env={ACADEMY_OWNER_ID:owner,ACADEMY_ADMIN_CHANNEL_ID:channel,GUILD_ID:guild,...(mode==='pilot'?{CERTIFICATION_REGISTRATION_PILOT:'true'}:{})};
  const box={Events:{InteractionCreate:'interaction',ClientReady:'ready'},PermissionFlagsBits:{},console:{log(){},error(){}},loadCertificationConfig:()=>config,readReadOnlyPreviewFlag:()=>mode==='preview',readRegistrationPilotOptions:()=>({enabled:mode==='pilot',ownerId:owner,adminChannelId:channel,guildId:guild}),readApplicationClosureFlag:()=>false,readCourseRuntimeOptions:()=>({enabled:false}),loadCertificationDatabaseConnection:()=>({connectionString:'fixture'}),createCertificationDatabasePool:()=>pool,createReadOnlyPreviewPool:p=>p,createCertificationService:()=>({}),createCertificationRouter:()=>route,createClosureRuntimeRouter(){assert.fail();},createCourseRuntimeRouter(){assert.fail();},createReadOnlyPreviewRouter:r=>r,validateCertificationSchema:async()=>{},validateActiveEnrollmentAgreement:async()=>{enter();await wait;},createRegistrationPilotPolicy:()=>({}),createRegistrationPilotHandlers:()=>({}),createOwnerRegistrationHandler(){},createInvitationInteractionHandler(){},createRegistrationPilotRouter:opts=>opts.readViews,replyRetentionHold:async()=>{}};
  runInNewContext(source.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'')+';globalThis.attach=attachCertificationRuntime;',box);
  const runtime=box.attach(client,null,guild,env);
  try {
    client.emit('ready');await entered;
    const closing=runtime.detach();await new Promise(r=>setImmediate(r));assert.equal(ended,0);
    release();await closing;await runtime.detach();
    assert.equal(ended,1);assert.equal(disposed,1);assert.equal(guildFetches,0);assert.equal(runtime.ready,false);
    assert.equal(initialized,0,'router must not initialize after detach');
  } finally {release();await runtime.detach();}
});
