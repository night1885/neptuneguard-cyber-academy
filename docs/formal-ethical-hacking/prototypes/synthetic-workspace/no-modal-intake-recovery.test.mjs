import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNoModalIntakeCoordinator as create} from './no-modal-intake.mjs';
const G='100000000000000001',P='100000000000000002',L='100000000000000003',O='100000000000000004',C='100000000000000005',M='100000000000000006',OTHER='100000000000000009',DAY=86400000;
function fixture(){
 const f={now:1000000000,allowed:true,private:true,channel:C,reads:0,auths:0,submits:0,revision:0,receipts:new Map()};
 const ctx={actorId:L,guildId:G},b={recordId:'demo-record',learnerId:L,courseKey:'demo-course',exerciseKey:'demo-exercise'};
 const message={id:M,guildId:G,channelId:C,authorId:L,bot:false,webhook:false,contentAvailable:true,createdAtMs:f.now,content:'Fictional report',attachmentCount:0,forwarded:false};
 const ports={now:()=>f.now,resolve:async()=>({...b,revision:f.revision}),authorize:async()=>{f.auths++;return f.allowed;},
 journalRead:async()=>({state:'available',channelId:f.channel}),verifyPrivate:async()=>f.private,
 receipt:async(scope,key)=>{f.reads++;assert.equal(scope.actorId,L);return f.receipts.get(key)||null;},
 latest:async()=>({...message}),exact:async()=>({...message}),
 submit:async(scope,p)=>{f.submits++;if(f.receipts.has(p.requestId))throw new Error('Unexpected duplicate write');f.revision++;
 const receipt={ok:true,reportId:'demo-report',recordId:b.recordId,learnerId:L,digest:p.digest,revision:f.revision,submittedAtMs:f.now,expiresAtMs:f.now+DAY,sourceGuildId:G,sourceChannelId:p.channelId,sourceMessageId:p.messageId,sourceCreatedAtMs:p.createdAtMs};
 f.receipts.set(p.requestId,receipt);return {...receipt};}};
 for(const name of ['journalWrite','createRestricted','admitLearner','readReport','publishTrackedReview','review','claimDraft','deleteDraft','finishDraft'])ports[name]=async()=>{throw new Error('Unexpected provider: '+name);};
 const config={enabled:true,mode:'detached-rehearsal',guildId:G,productionGuildId:P,ownerId:O,courseKey:b.courseKey,policy:{draftHours:24,reportHours:24,ownerOnly:true,status:'proposed-for-rehearsal'},timeoutMs:10};
 const seed=()=>{const receipt={ok:true,reportId:'demo-report',recordId:b.recordId,learnerId:L,digest:createHash('sha256').update(message.content).digest('hex'),revision:1,submittedAtMs:f.now,expiresAtMs:f.now+DAY,sourceGuildId:G,sourceChannelId:C,sourceMessageId:M,sourceCreatedAtMs:message.createdAtMs,body:'DO NOT DELIVER'};f.receipts.set('demo-request',receipt);f.revision=1;return receipt;};
 return {f,ctx,ports,config,seed,create:()=>create(config,ports)};
}
async function submitted(x){const engine=x.create();const preview=await engine.preview(x.ctx);assert.equal(preview.ok,true);const ack=await engine.submit(x.ctx,preview.token,'demo-request');assert.equal(ack.ok,true);return {engine,preview,ack};}
test('real submission then fresh coordinator recovers unchanged acknowledgment',async t=>{const x=fixture();const {engine,preview,ack}=await submitted(x);engine.dispose();const fresh=x.create();t.after(()=>fresh.dispose());
 assert.equal((await fresh.submit(x.ctx,preview.token,'demo-request')).ok,false);
 const recovered=await fresh.recoverSubmission(x.ctx,'demo-request');assert.deepEqual(recovered,ack);assert.equal(Object.isFrozen(recovered),true);assert.equal(x.f.submits,1);
});
test('existing submit duplicate replay still behaves unchanged',async t=>{const x=fixture();const {engine,preview,ack}=await submitted(x);t.after(()=>engine.dispose());assert.deepEqual(await engine.submit(x.ctx,preview.token,'demo-request'),ack);assert.equal(x.f.submits,1);});
test('minimal recovery output excludes provider extras',async t=>{const x=fixture();x.seed();const engine=x.create();t.after(()=>engine.dispose());assert.deepEqual(Object.keys(await engine.recoverSubmission(x.ctx,'demo-request')).sort(),['expiresAtMs','ok','reportId','revision']);assert.equal(x.f.submits,0);});
test('missing receipt never falls through to submit',async t=>{const x=fixture();const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);assert.equal(x.f.submits,0);});
for(const [name,patch] of Object.entries({guild:{sourceGuildId:OTHER},channel:{sourceChannelId:OTHER},record:{recordId:'demo-other'},learner:{learnerId:OTHER},digest:{digest:'bad'},message:{sourceMessageId:'bad'},sourceTime:{sourceCreatedAtMs:-1},sourceAfterSubmission:{sourceCreatedAtMs:1000000001},deadline:{expiresAtMs:1000000000+DAY+1}}))test('receipt rejection: '+name,async t=>{const x=fixture();Object.assign(x.seed(),patch);const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);assert.equal(x.f.submits,0);});
test('foreign actor denied before receipt access',async t=>{const x=fixture();x.seed();const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission({...x.ctx,actorId:OTHER},'demo-request')).ok,false);assert.equal(x.f.reads,0);});
test('revoked authorization denied before receipt access',async t=>{const x=fixture();x.seed();x.f.allowed=false;const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);assert.equal(x.f.reads,0);});
test('privacy denial before receipt access',async t=>{const x=fixture();x.seed();x.f.private=false;const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);assert.equal(x.f.reads,0);});
test('channel change during receipt read denied',async t=>{const x=fixture();const receipt=x.seed();x.ports.receipt=async()=>{x.f.channel=OTHER;return receipt;};const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);});
test('record binding change during receipt read denied',async t=>{const x=fixture();const receipt=x.seed();x.ports.receipt=async()=>{x.ports.resolve=async()=>({recordId:'demo-other',learnerId:L,courseKey:'demo-course',exerciseKey:'demo-exercise',revision:1});return receipt;};const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);});
test('final revocation denied',async t=>{const x=fixture();x.seed();x.ports.authorize=async()=>++x.f.auths<3;const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);});
test('exact expiry denied',async t=>{const x=fixture();x.f.now=x.seed().expiresAtMs;const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);});
test('expiry at final authorization denied',async t=>{const x=fixture();const receipt=x.seed();x.ports.authorize=async()=>{if(++x.f.auths===3)x.f.now=receipt.expiresAtMs;return true;};const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);});
test('invalid request denies without provider access',async t=>{const x=fixture();const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'invalid request')).ok,false);assert.equal(x.f.auths,0);assert.equal(x.f.reads,0);});
test('disabled API parity and disposed recovery',async()=>{const disabled=create();assert.equal((await disabled.recoverSubmission({},'demo-request')).reason,'disabled');const x=fixture();x.seed();const engine=x.create();engine.dispose();assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);assert.equal(x.f.reads,0);});
test('actual provider timeout then late submit completion recovered by fresh coordinator',async t=>{const x=fixture();let release,settled;const original=x.ports.submit;
 x.ports.submit=(scope,p)=>new Promise(resolve=>{release=()=>{settled=original(scope,p).then(resolve);};});
 const old=x.create();t.after(()=>old.dispose());const preview=await old.preview(x.ctx);assert.equal(preview.ok,true);
 const attempted=await old.submit(x.ctx,preview.token,'demo-request');assert.equal(attempted.ok,false);assert.equal(typeof release,'function');assert.equal(x.f.receipts.size,0);
 old.dispose();release();await settled;await new Promise(r=>setImmediate(r));assert.equal(x.f.submits,1);
 const fresh=x.create();t.after(()=>fresh.dispose());assert.deepEqual(await fresh.recoverSubmission(x.ctx,'demo-request'),{ok:true,reportId:'demo-report',revision:1,expiresAtMs:x.f.receipts.get('demo-request').expiresAtMs});assert.equal(x.f.submits,1);
});
test('receipt provider timeout does not acknowledge late result',async t=>{const x=fixture();const receipt=x.seed();let release;x.ports.receipt=()=>new Promise(r=>{release=()=>r(receipt);});const engine=x.create();t.after(()=>engine.dispose());assert.equal((await engine.recoverSubmission(x.ctx,'demo-request')).ok,false);release();await new Promise(r=>setImmediate(r));assert.equal(x.f.submits,0);});
