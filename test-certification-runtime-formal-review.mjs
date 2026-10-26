import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { attachCertificationRuntime } from './certification-runtime.js';
import { requiredEnrollmentColumns } from './certification-schema-readiness.js';
const A='111111111111111111',G='333333333333333333',C='555555555555555555',R='444444444444444444';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t,options={}) {
  const content='Disposable formal runtime agreement.',hash=createHash('sha256').update(content).digest('hex');
  const client=new EventEmitter();client.isReady=()=>false;const bot={},everyone={};
  client.guilds={async fetch(){return {id:G,roles:{everyone},members:{async fetch(id){return {id};},async fetchMe(){return bot;}}};}};
  client.channels={async fetch(){return {guildId:G,isTextBased:()=>true,send(){assert.fail('No publication');},permissionsFor:member=>({has:()=>member===bot})};}};
  let ended=0,created=0,disposed=0,formalCalls=0,certCalls=0,captured;
  const pool={async query(sql,params){
    assert.match(sql.trim(),/^SELECT\b/);
    if(sql.includes("to_regclass('certification_agreements')"))return {rows:[{agreements:'agreements',enrollments:'enrollments',labs:'labs',audit:'audit'}]};
    if(sql.includes('FROM pg_attribute'))return {rows:requiredEnrollmentColumns.map(attname=>({attname}))};
    if(sql.includes('FROM pg_constraint'))return {rows:[{conname:'certification_account_acknowledgment_required',convalidated:true}]};
    if(sql.includes('FROM pg_trigger'))return {rows:(params[0]==='certification_enrollments'?['certification_student_id_immutable']:['certification_agreement_immutable','certification_agreement_no_truncate']).map(tgname=>({tgname,tgenabled:'O'}))};
    if(sql.startsWith('SELECT content'))return {rows:[{content,content_sha256:hash}]};
    assert.fail('Unexpected SQL');
  },async end(){ended++;}};
  const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',ACADEMY_OWNER_ID:A,ACADEMY_ADMIN_CHANNEL_ID:C,
    CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'v1',agreementSha256:hash,comprehensionCheck:{version:'check1',questions:[{prompt:'Type A.'}],correctAnswers:['A']}}),...options.env};
  const formalRoute={enabled:true,async handle(i){formalCalls++;if(options.handle)return options.handle(i);return true;},
    dispose(){disposed++;return options.dispose?options.dispose():{drained:true};}};
  const formalReview={enabled:true,reviewOnly:true,mode:'review',createRoute(args){created++;captured=args;return options.candidate===undefined?formalRoute:options.candidate;}};
  const runtime=attachCertificationRuntime(client,undefined,G,env,{createPool:()=>pool,createRouter:()=>async()=>{certCalls++;return true;},
    formalReview:options.omitFormal?undefined:{...formalReview,...options.formal}});
  t.after(async()=>{try{await runtime.detach();}catch{}});
  function interaction(customId='fws:open',extra={}){return {customId,isButton:()=>true,isModalSubmit:()=>false,guildId:G,channelId:C,user:{id:A},
    deferred:false,replied:false,replies:[],async reply(payload){this.replies.push(payload);this.replied=true;},...extra};}
  return {client,runtime,interaction,formalRoute,captured:()=>captured,counts:()=>({ended,created,disposed,formalCalls,certCalls}),
    async start(){client.emit('clientReady');for(let n=0;n<30&&!runtime.ready;n++)await tick();assert.equal(runtime.ready,true);}};
}
test('default runtime does not admit formal namespace or construct a formal route',async t=>{
  const f=fixture(t,{omitFormal:true}),i=f.interaction();f.client.emit('interactionCreate',i);await tick();assert.equal(i.replies.length,0);
  await f.start();f.client.emit('interactionCreate',f.interaction());await tick();assert.equal(f.counts().created,0);assert.equal(f.counts().formalCalls,0);
});
test('configured review is private-unavailable before startup and shares live readiness',async t=>{
  const f=fixture(t),args=f.captured();assert.equal(args.isReady(),false);assert.equal(f.runtime.formalReviewReady,false);
  assert.equal(Object.hasOwn(args,'readPool'),false);assert.equal(Object.hasOwn(args,'createPool'),false);
  const i=f.interaction();f.client.emit('interactionCreate',i);await tick();assert.equal(i.replies[0].flags,64);assert.equal(f.counts().formalCalls,0);
  await f.start();assert.equal(args.isReady(),true);assert.equal(f.runtime.formalReviewReady,true);await f.runtime.detach();assert.equal(args.isReady(),false);
});
test('ready formal and certification actions have disjoint dispatch',async t=>{
  const f=fixture(t);await f.start();f.client.emit('interactionCreate',f.interaction());f.client.emit('interactionCreate',f.interaction('cert:initial:home'));
  const other=f.interaction('community:open');f.client.emit('interactionCreate',other);await tick();
  assert.equal(f.counts().formalCalls,1);assert.equal(f.counts().certCalls,1);assert.deepEqual(other.replies,[]);
});
test('modal formal action cannot reach the review handler',async t=>{
  const f=fixture(t);await f.start();const i=f.interaction('fws:open',{isButton:()=>false,isModalSubmit:()=>true});f.client.emit('interactionCreate',i);await tick();assert.equal(f.counts().formalCalls,0);assert.equal(i.replies[0].flags,64);
});
test('formal errors never overwrite an already acknowledged response',async t=>{
  let edits=0;const f=fixture(t,{handle:async i=>{i.deferred=true;throw new Error('private formal detail');}});await f.start();
  const i=f.interaction('fws:open',{editReply:async()=>{edits++;}});f.client.emit('interactionCreate',i);await tick();assert.equal(edits,0);assert.equal(i.replies.length,0);
});
test('unacknowledged formal failure is neutral and private',async t=>{
  const f=fixture(t,{handle:async()=>{throw new Error('private formal detail');}});await f.start();const i=f.interaction();f.client.emit('interactionCreate',i);await tick();assert.equal(i.replies[0].flags,64);assert.equal(JSON.stringify(i.replies).includes('private formal detail'),false);
});
test('detach stops admission and disposes formal resources once',async t=>{
  const f=fixture(t);await f.start();const closing=f.runtime.detach();assert.equal(f.runtime.detach(),closing);f.client.emit('interactionCreate',f.interaction());await closing;
  assert.equal(f.counts().formalCalls,0);assert.equal(f.counts().disposed,1);assert.equal(f.counts().ended,1);assert.equal(f.runtime.formalReviewReady,false);
});
test('detach waits for formal work and formal disposal',async t=>{
  let finish,dispose;const f=fixture(t,{handle:()=>new Promise(r=>finish=r),dispose:()=>new Promise(r=>dispose=r)});await f.start();
  f.client.emit('interactionCreate',f.interaction());const closing=f.runtime.detach();await tick();assert.equal(f.counts().ended,0);
  finish(true);await tick();assert.equal(f.counts().ended,0);dispose({drained:true});await closing;assert.equal(f.counts().ended,1);
});
test('incomplete or rejected formal drain is not reported as clean shutdown',async t=>{
  for(const dispose of [()=>({drained:false}),()=>Promise.reject(new Error('private shutdown detail'))]){
    const f=fixture(t,{dispose});await f.start();await assert.rejects(f.runtime.detach(),/Formal review shutdown requires attention/);assert.equal(f.counts().ended,1);}
});
test('invalid formal options reject before pool creation',()=>{
  const client=new EventEmitter();client.isReady=()=>false;let pools=0;
  const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable'};
  for(const formalReview of [{enabled:'true'},{enabled:true,reviewOnly:false,mode:'review',createRoute(){}},{enabled:true,reviewOnly:true,mode:'production',createRoute(){}}])
    assert.throws(()=>attachCertificationRuntime(client,undefined,G,env,{createPool(){pools++;},formalReview}));
  assert.equal(pools,0);assert.equal(client.listenerCount('interactionCreate'),0);
});
test('formal factory construction failure cleans up owned pool',async()=>{
  const client=new EventEmitter();client.isReady=()=>false;let ended=0;const text='Synthetic agreement',hash=createHash('sha256').update(text).digest('hex');
  const env={CERTIFICATION_ENABLED:'true',ACADEMY_OWNER_ID:A,ACADEMY_ADMIN_CHANNEL_ID:C,CERTIFICATION_DATABASE_URL:'postgresql://fixture:fixture@localhost/certification_test',CERTIFICATION_DATABASE_TLS:'disable',
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'v1',agreementSha256:hash,comprehensionCheck:{version:'check1',questions:[{prompt:'Type A.'}],correctAnswers:['A']}})};
  assert.throws(()=>attachCertificationRuntime(client,undefined,G,env,{createPool:()=>({async end(){ended++;}}),createRouter:()=>async()=>true,
    formalReview:{enabled:true,reviewOnly:true,mode:'review',createRoute(){throw new Error('synthetic construction failure');}}}));await tick();assert.equal(ended,1);assert.equal(client.listenerCount('interactionCreate'),0);
});
test('formal review cannot coexist with the enabled course-runtime mode',t=>{
  assert.throws(()=>fixture(t,{env:{CERTIFICATION_COURSES_ENABLED:'true',VERIFIED_ROLE_ID:R}}),/Formal review requires isolated/);
});
