import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { attachCommunityLifecycle } from './community-learning-runtime.mjs';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
const owner = '111111111111111111', guildId = '333333333333333333', channelId = '555555555555555555';
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate) { for (let n=0;n<100 && !predicate();n++) await tick(); assert.ok(predicate()); }
function fixture({ communityEnv = {}, communityFactory } = {}) {
  const content = 'Dashboard isolation fixture.', hash = createHash('sha256').update(content).digest('hex');
  const client = new EventEmitter(), signals = new EventEmitter(), calls = [], logs = [], exits = [], bot = {}, everyone = {};
  client.isReady = () => false; client.login = async () => { calls.push('login'); }; client.destroy = async () => { calls.push('destroy'); };
  client.guilds = { async fetch(id) { assert.equal(id,guildId); return { roles:{ everyone },members:{ async fetch(actor) { assert.equal(actor,owner); return { id:actor }; },async fetchMe() { return bot; } } }; } };
  client.channels = { async fetch(id) { assert.equal(id,channelId); return { guildId,isTextBased:()=>true,send(){ assert.fail('No publication'); },permissionsFor:member=>({ has:()=>member===bot }) }; } };
  const database = { async query(sql,params) {
    assert.match(sql.trim(),/^SELECT\b/); assert.doesNotMatch(sql,/\b(learner_profiles|learner_module_progress|learner_badges)\b/);
    if (sql.includes("to_regclass('certification_agreements')")) return { rows:[{ agreements:'agreements',enrollments:'enrollments',labs:'labs',audit:'audit' }] };
    if (sql.includes('FROM pg_attribute')) return { rows:requiredEnrollmentColumns.map(attname=>({ attname })) };
    if (sql.includes('FROM pg_constraint')) return { rows:[{ conname:'certification_account_acknowledgment_required',convalidated:true }] };
    if (sql.includes('FROM pg_trigger')) return { rows:(params[0]==='certification_enrollments'?['certification_student_id_immutable']:['certification_agreement_immutable','certification_agreement_no_truncate']).map(tgname=>({ tgname,tgenabled:'O' })) };
    if (sql.startsWith('SELECT content')) return { rows:[{ content,content_sha256:hash }] };
    if (sql.includes('COUNT(*)')) return { rows:[{}] };
    assert.fail('Unexpected certification query');
  },connect(){ assert.fail('No learner or enrollment writes'); },async end(){ calls.push('certification-closed'); } };
  const env = { CERTIFICATION_ENABLED:'true',ACADEMY_OWNER_ID:owner,ACADEMY_ADMIN_CHANNEL_ID:channelId,CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',
    CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({ agreementVersion:'isolation-fixture',agreementSha256:hash,comprehensionCheck:{ version:'isolation-check',questions:[{ prompt:'Type A.' }],correctAnswers:['A'] } }),...communityEnv };
  const app = createRestoredCertificationApplication({ client,guildId,env,signals,exit:code=>exits.push(code),log:message=>logs.push(message),attachCommunity:communityFactory,
    attachRuntime(actual,pool,guild,environment,options){ return attachCertificationRuntime(actual,pool,guild,environment,{ ...options,createPool:()=>database }); } });
  return { app,client,calls,logs,exits,
    async start(){ await app.start('synthetic-isolation-fixture'); client.emit('clientReady'); await until(()=>app.ready); },
    async dashboard(){ const replies=[],i={ customId:'cert:admin:overview:0',guildId,user:{ id:owner },deferred:false,replied:false,
      isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,
      async deferReply(payload){ assert.equal(payload.flags,64); this.deferred=true; },async reply(payload){ assert.equal(payload.flags,64); this.replied=true; replies.push(payload); },async editReply(payload){ replies.push(payload); } };
      client.emit('interactionCreate',i); await until(()=>replies.length>0);
      const controls=replies[0].components.flatMap(row=>{const r=typeof row.toJSON==='function'?row.toJSON():row;return r.components;});
      assert.ok(controls.some(c=>(typeof c.toJSON==='function'?c.toJSON():c).custom_id==='cert:register:open'));
    }
  };
}
test('invalid community flag, missing URL and malformed secret configuration do not stop the real dashboard',async()=>{
  for(const communityEnv of [{ COMMUNITY_LEARNING_ENABLED:'invalid' },
    { COMMUNITY_LEARNING_ENABLED:'true',GUILD_ID:guildId,VERIFIED_ROLE_ID:'777777777777777777' },
    { COMMUNITY_LEARNING_ENABLED:'true',GUILD_ID:guildId,VERIFIED_ROLE_ID:'777777777777777777',COMMUNITY_DATABASE_URL:'not-a-url/fixture-private-value' }]){
    const f=fixture({ communityEnv });
    try{ await f.start(); assert.equal(f.app.communityReady,false); assert.ok(!f.calls.includes('certification-closed')); await f.dashboard();
      assert.ok(f.logs.some(message=>message.includes('certification startup will continue'))); assert.ok(!f.logs.join('').includes('fixture-private-value'));
    }finally{ await f.app.shutdown(); }
    assert.deepEqual(f.exits,[0]); assert.equal(f.calls.filter(c=>c==='certification-closed').length,1); assert.ok(f.calls.indexOf('certification-closed')<f.calls.indexOf('destroy'));
  }
});
test('an asynchronous community readiness failure leaves the real certification dashboard running',async()=>{
  let communityClosed=0;
  const f=fixture({ communityFactory:client=>attachCommunityLifecycle({ client,enabled:true,createRoute:()=>async()=>false,
    initialize:async()=>{throw new Error('fixture-private-auth-failure');},close:async()=>{communityClosed++;},log:()=>{} }) });
  try{await f.start();await tick();assert.equal(f.app.communityReady,false);assert.equal(f.app.ready,true);await f.dashboard();assert.ok(!f.calls.includes('certification-closed'));}
  finally{await f.app.shutdown();}
  assert.equal(communityClosed,1);assert.deepEqual(f.exits,[0]);
});
