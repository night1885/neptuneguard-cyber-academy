import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoModalIntakeCoordinator as create} from './no-modal-intake.mjs';
import {createNoModalIntakeBoundary as boundary} from './no-modal-intake-boundary.mjs';
const G='100000000000000001',P='100000000000000002',L='100000000000000003',O='100000000000000004',C='100000000000000005',M='100000000000000006',ENTRY='100000000000000007',CONTROL='100000000000000008',OTHER='100000000000000009',DAY=86400000;
function fixture(patch={}){
  const f={receipts:new Map(),sources:new Set(),now:1000000000,allowed:true,private:true,revision:0,journal:null,receipt:null,submitted:false,claimed:false,calls:[],
    message:{id:M,guildId:G,channelId:C,authorId:L,bot:false,webhook:false,contentAvailable:true,createdAtMs:1000000000,content:'Fictional report @everyone',attachmentCount:0,forwarded:false}};
  const binding={recordId:'demo-record',learnerId:L,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:0};
  const ports={
    now:()=>f.now,resolve:async()=>({...binding,revision:f.revision}),authorize:async()=>f.allowed,
    journalRead:async()=>f.journal,journalWrite:async(b,j)=>{f.journal={...j};f.calls.push('journal:'+j.state);},
    createRestricted:async(b,options)=>{assert.equal(options.learnerAccess,false);f.calls.push('create');return{id:C,guildId:G};},
    verifyPrivate:async()=>f.private,admitLearner:async()=>{f.calls.push('admit');},
    latest:async()=>({...f.message}),exact:async()=>({...f.message}),receipt:async(b,k)=>f.receipts.get(k)||null,
    submit:async(b,p)=>{f.calls.push('submit');if(f.claimed||f.sources.has(p.channelId+':'+p.messageId))throw new Error();if(p.expectedRevision!==f.revision)throw new Error();
      f.submitted=true;f.revision++;f.receipt={ok:true,reportId:'demo-report',recordId:b.recordId,learnerId:b.learnerId,digest:p.digest,
        revision:f.revision,submittedAtMs:f.now,expiresAtMs:f.now+DAY,sourceMessageId:p.messageId,sourceChannelId:p.channelId,sourceCreatedAtMs:p.createdAtMs};
      f.sources.add(p.channelId+':'+p.messageId);f.receipts.set(p.requestId,{...f.receipt});return{...f.receipt};},
    readReport:async()=>f.receipt?{...f.receipt,body:'Fictional stored report'}:null,
    publishTrackedReview:async(b,r)=>({tracked:true,expiresAtMs:r.expiresAtMs}),
    review:async(b,p)=>{f.calls.push('review');if(p.expectedRevision!==f.revision)throw new Error();f.revision++;return{...f.receipt,revision:f.revision};},
    claimDraft:async(b,p)=>{if(f.sources.has(p.channelId+':'+p.messageId)||f.claimed)return{claimed:false};f.claimed=true;return{claimed:true,token:'demo-claim'};},
    deleteDraft:async()=>{f.calls.push('delete');return{deleted:true};},finishDraft:async(b,t,outcome)=>{f.calls.push('finish:'+outcome);}
  };
  Object.assign(ports,patch);
  const engine=create({enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:P,ownerId:O,courseKey:'demo-course',
    policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:25},ports);
  return{f,ports,engine,learner:{actorId:L,guildId:G},owner:{actorId:O,guildId:G}};
}
async function previewed(x){assert.equal((await x.engine.prepare(x.learner)).ok,true);return x.engine.preview(x.learner);}
test('defaults off without accessing providers',async()=>{const e=create();assert.equal((await e.prepare({})).reason,'disabled');e.dispose();});
test('requires isolated profile and explicit providers',()=>{assert.throws(()=>create({enabled:true}));});
test('provisions restrictively, verifies and admits only once on retry',async()=>{const x=fixture();
  assert.equal((await x.engine.prepare(x.learner)).channelId,C);assert.equal((await x.engine.prepare(x.learner)).ok,true);
  assert.equal(x.f.calls.filter(k=>k==='create').length,1);assert.deepEqual(x.f.calls.slice(0,4),['journal:creating','create','journal:verify-pending','admit']);x.engine.dispose();});
test('does not admit or expose a channel when privacy checks fail',async()=>{const x=fixture();x.f.private=false;
  assert.equal((await x.engine.prepare(x.learner)).reason,'reconcile-required');assert.equal(x.f.calls.includes('admit'),false);
  assert.equal(x.f.journal.state,'reconcile-required');x.engine.dispose();});
test('unknown creation outcome remains reconciliation-required, never blindly retried',async()=>{const x=fixture({createRestricted:()=>new Promise(()=>{})});
  assert.equal((await x.engine.prepare(x.learner)).reason,'reconcile-required');assert.equal((await x.engine.prepare(x.learner)).reason,'reconcile-required');x.engine.dispose();});
test('rejects wrong actor, guild and caller-supplied owner/record fields',async()=>{const x=fixture();
  for(const c of [{actorId:OTHER,guildId:G},{actorId:L,guildId:P},{actorId:L,guildId:G,recordId:'demo-record'}])assert.equal((await x.engine.prepare(c)).ok,false);
  assert.equal(x.f.calls.length,0);x.engine.dispose();});
test('preview binds a source without returning its body',async()=>{const x=fixture();const r=await previewed(x);
  assert.equal(r.ok,true);assert.equal(r.sourceMessageId,M);assert.match(r.digest,/^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(r).includes('Fictional report'),false);x.engine.dispose();});
test('rejects missing content capability, attachments, bots, forwards and oversized text',async()=>{
  for(const patch of [{contentAvailable:false},{attachmentCount:1},{bot:true},{webhook:true},{forwarded:true},{content:'x'.repeat(2001)}]){
    const x=fixture();Object.assign(x.f.message,patch);await x.engine.prepare(x.learner);assert.equal((await x.engine.preview(x.learner)).ok,false);x.engine.dispose();}
});
test('source changes after preview require refresh and never submit',async()=>{const x=fixture();const p=await previewed(x);x.f.message.content='Changed fictional report';
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).reason,'refresh-required');assert.equal(x.f.calls.includes('submit'),false);x.engine.dispose();});
test('successful submission and retry acknowledge one immutable submission',async()=>{const x=fixture();const p=await previewed(x);
  const first=await x.engine.submit(x.learner,p.token,'demo-request');assert.equal(first.ok,true);x.f.message.content='Edited after commit';
  assert.deepEqual(await x.engine.submit(x.learner,p.token,'demo-request'),first);assert.equal(x.f.calls.filter(k=>k==='submit').length,1);x.engine.dispose();});
test('store failure never displays success',async()=>{const x=fixture({submit:async()=>{throw new Error('fixture storage failure');}});const p=await previewed(x);
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);x.engine.dispose();});
test('revocation and changed record bindings suppress submission',async()=>{const x=fixture();const p=await previewed(x);x.f.allowed=false;
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);assert.equal(x.f.calls.includes('submit'),false);x.engine.dispose();});
test('expired preview tokens cannot submit',async()=>{const x=fixture();const p=await previewed(x);x.f.now+=300000;
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);x.engine.dispose();});
test('review requires owner and explicit authority; self-review remains blocked',async()=>{const x=fixture();const p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');
  assert.equal((await x.engine.review({actorId:OTHER,guildId:G},'demo-report',1,'review-recorded','Fictional feedback')).ok,false);
  assert.equal((await x.engine.review(x.owner,'demo-report',1,'review-recorded','Fictional feedback')).ok,true);
  x.f.allowed=false;assert.equal((await x.engine.review(x.owner,'demo-report',2,'review-recorded','Fictional feedback')).ok,false);x.engine.dispose();});
test('untracked reviewer presentation cannot proceed to feedback mutation',async()=>{const x=fixture({publishTrackedReview:async()=>({tracked:false})});
  const p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');
  assert.equal((await x.engine.review(x.owner,'demo-report',1,'review-recorded','Fictional feedback')).reason,'reconcile-required');assert.equal(x.f.calls.includes('review'),false);x.engine.dispose();});
test('draft deadline uses creation time, not later edits',async()=>{const x=fixture();await x.engine.prepare(x.learner);
  assert.equal((await x.engine.expireDraft(x.owner,M)).reason,'not-due');x.f.message.editedAtMs=x.f.now+DAY-1;x.f.now+=DAY;
  assert.equal((await x.engine.expireDraft(x.owner,M)).outcome,'provider-confirmed');assert.equal(x.f.calls.includes('delete'),true);x.engine.dispose();});
test('atomic draft claim excludes a submitted source',async()=>{const x=fixture();const p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');x.f.now+=DAY;
  assert.equal((await x.engine.expireDraft(x.owner,M)).reason,'not-unsubmitted');assert.equal(x.f.calls.includes('delete'),false);x.engine.dispose();});
test('draft deletion uncertainty never claims completion',async()=>{const x=fixture({deleteDraft:async()=>{throw new Error('fixture timeout');}});await x.engine.prepare(x.learner);x.f.now+=DAY;
  assert.equal((await x.engine.expireDraft(x.owner,M)).reason,'reconcile-required');assert.equal(x.f.calls.includes('finish:unknown'),true);x.engine.dispose();});
test('disposal suppresses pending provider results and retires future work',async()=>{let release;const x=fixture({latest:()=>new Promise(r=>{release=r;})});await x.engine.prepare(x.learner);
  const pending=x.engine.preview(x.learner);while(!release)await new Promise(r=>setImmediate(r));x.engine.dispose();release(x.f.message);
  assert.equal((await pending).ok,false);assert.equal((await x.engine.prepare(x.learner)).ok,false);});
function interaction(customId,actor=L,messageId=CONTROL){const edits=[],calls=[];return{customId,guildId:G,channelId:ENTRY,user:{id:actor},message:{id:messageId,flags:{has:n=>n===64}},
  isButton:()=>true,deferred:false,replied:false,edits,calls,
  async deferReply(p){assert.equal(p.flags,64);this.deferred=true;calls.push('deferReply');},async deferUpdate(){this.deferred=true;calls.push('deferUpdate');},
  async reply(p){assert.equal(p.flags,64);this.replied=true;calls.push('deny');},async editReply(p){edits.push(p);return{id:CONTROL,flags:{has:n=>n===64}};}};}
test('boundary privately opens and updates only actor-bound controls without copying report text',async()=>{const x=fixture();const b=boundary({enabled:true,guildId:G,entryChannelId:ENTRY,isReady:()=>true,coordinator:x.engine,readNow:()=>x.f.now});
  const open=interaction('nmi:prepare');await b.handle(open);assert.deepEqual(open.calls,['deferReply']);
  const preview=interaction('nmi:preview');await b.handle(preview);assert.deepEqual(preview.calls,['deferUpdate']);
  assert.equal(JSON.stringify(preview.edits).includes('Fictional report'),false);assert.deepEqual(preview.edits[0].allowedMentions,{parse:[]});
  const submit=interaction(preview.edits[0].components[0].components[0].custom_id);await b.handle(submit);assert.equal(x.f.submitted,true);b.dispose();});
test('boundary rejects another actor, foreign controls, modals and unrelated routes',async()=>{const x=fixture();const b=boundary({enabled:true,guildId:G,entryChannelId:ENTRY,isReady:()=>true,coordinator:x.engine,readNow:()=>x.f.now});await b.handle(interaction('nmi:prepare'));
  for(const i of [interaction('nmi:preview',OTHER),interaction('nmi:preview',L,M)]){await b.handle(i);assert.deepEqual(i.calls,['deny']);assert.equal(i.edits.length,0);}
  const modal=interaction('nmi:preview');modal.isButton=()=>false;await b.handle(modal);assert.deepEqual(modal.calls,['deny']);
  assert.equal(await b.handle(interaction('fws:open')),false);b.dispose();});
test('not-ready and disabled boundaries never invoke coordination',async()=>{let called=0;const c={prepare:async()=>{called++;},preview:async()=>{},submit:async()=>{},dispose(){}};
  const b=boundary({enabled:true,guildId:G,entryChannelId:ENTRY,isReady:()=>false,coordinator:c,readNow:()=>1000});const i=interaction('nmi:prepare');await b.handle(i);
  assert.deepEqual(i.calls,['deny']);assert.equal(called,0);assert.equal(await boundary().handle(i),false);b.dispose();});

test('a foreign actor cannot invalidate another learner preview token',async()=>{const x=fixture();const p=await previewed(x);
  assert.equal((await x.engine.submit({actorId:OTHER,guildId:G},p.token,'demo-request')).ok,false);
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,true);x.engine.dispose();});
test('changed authoritative record binding rejects a captured preview',async()=>{const x=fixture();const p=await previewed(x);
  x.ports.resolve=async()=>({recordId:'demo-different',learnerId:L,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:0});
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);assert.equal(x.f.calls.includes('submit'),false);x.engine.dispose();});
test('owner cannot self-review an owner-owned record',async()=>{const x=fixture({resolve:async()=>({recordId:'demo-record',learnerId:O,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:0})});
  assert.equal((await x.engine.review(x.owner,'demo-report',0,'review-recorded','Fictional feedback')).ok,false);assert.equal(x.f.calls.includes('review'),false);x.engine.dispose();});
test('late final authorization cannot release an expired submission acknowledgment',async()=>{const x=fixture();const p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');
  let reads=0;x.ports.authorize=async()=>{reads++;if(reads===2)x.f.now=x.f.receipt.expiresAtMs;return true;};
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);x.engine.dispose();});
test('expired control ownership requires private re-entry, not unowned edits',async()=>{const x=fixture();const b=boundary({enabled:true,guildId:G,entryChannelId:ENTRY,isReady:()=>true,coordinator:x.engine,readNow:()=>x.f.now});
  await b.handle(interaction('nmi:prepare'));x.f.now+=300000;const i=interaction('nmi:preview');await b.handle(i);assert.deepEqual(i.calls,['deny']);assert.equal(i.edits.length,0);b.dispose();});
test('unsettled provider work is bounded even after caller timeouts',async()=>{const x=fixture({latest:()=>new Promise(()=>{})});await x.engine.prepare(x.learner);
  for(let n=0;n<22;n++)assert.equal((await x.engine.preview(x.learner)).ok,false);x.engine.dispose();});

test('receipt for a different source with identical text is not accepted',async()=>{const x=fixture();let p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');
  x.f.message.id='100000000000000010';p=await x.engine.preview(x.learner);
  assert.equal((await x.engine.submit(x.learner,p.token,'demo-request')).ok,false);assert.equal(x.f.calls.filter(k=>k==='submit').length,1);x.engine.dispose();});
test('persistent-provider source uniqueness prevents a new request resetting the same source',async()=>{const x=fixture();let p=await previewed(x);const first=await x.engine.submit(x.learner,p.token,'demo-request');
  x.f.now+=1000;p=await x.engine.preview(x.learner);assert.equal((await x.engine.submit(x.learner,p.token,'demo-different-request')).ok,false);
  assert.equal(x.f.receipt.expiresAtMs,first.expiresAtMs);x.engine.dispose();});

test('review presentation projects approved fields rather than instructor/private extras',async()=>{let seen;const x=fixture({publishTrackedReview:async(b,r)=>{seen=r;return{tracked:true,expiresAtMs:r.expiresAtMs};}});
  const p=await previewed(x);await x.engine.submit(x.learner,p.token,'demo-request');
  x.ports.readReport=async()=>({...x.f.receipt,body:'Fictional stored report',instructorGuide:'PRIVATE FIXTURE GUIDE'});
  assert.equal((await x.engine.review(x.owner,'demo-report',1,'review-recorded','Fictional feedback')).ok,true);
  assert.equal(Object.hasOwn(seen,'instructorGuide'),false);assert.equal(Object.isFrozen(seen),true);x.engine.dispose();});
