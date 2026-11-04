// Executed by CI with the saved backend/journal modules. No live network or SDK.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openEncryptedCapabilityStore} from './staging-review-capability-store.candidate.mjs';
import {createReviewCredentialVault} from './staging-review-credential-vault.candidate.mjs';
import {createOriginalResponseTransport} from './staging-review-original-transport.candidate.mjs';
import {openReviewCleanupJournal} from './staging-review-cleanup-journal.candidate.mjs';
import {createReviewDeliveryOwner} from './staging-review-delivery-owner.candidate.mjs';
import {createManagedReviewResponses} from './staging-review-managed-responses.candidate.mjs';
import {inspectReviewRecovery} from './staging-review-recovery-inspection.candidate.mjs';
const G='100000000000000001',A='100000000000000002',R='100000000000000003',CH='100000000000000004',I='100000000000000005',M='100000000000000006',S='11111111-1111-4111-8111-111111111111';
const payload=()=>({content:'Feedback captured. Reopen the review controls to prepare this selection.',embeds:[],components:[],allowedMentions:{parse:[]}});
const tick=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function until(fn){const end=Date.now()+6000;while(!await fn()){if(Date.now()>end)throw Error('Synthetic stack did not settle');await tick();}}
async function fixture(t){
 const base=await mkdtemp(join(tmpdir(),'managed-stack-')),vd=join(base,'vault'),jd=join(base,'journal');await mkdir(vd,{mode:0o700});await mkdir(jd,{mode:0o700});
 const f={key:randomBytes(32),http:[],exists:false};
 f.store=await openEncryptedCapabilityStore({enabled:true,directory:vd,storageAttested:true});f.journal=await openReviewCleanupJournal({enabled:true,directory:jd,scopeId:S,storageAttested:true},{now:()=>1000});
 const transport=createOriginalResponseTransport({enabled:true,timeoutMs:2000},{fetch:async(url,request)=>{const method=request.method;f.http.push(method);if(f.httpHook){const special=await f.httpHook(method);if(special)return special;}if(method==='POST'){f.exists=true;return {status:204};}if(method==='PATCH'){f.exists=true;return {status:200,json:async()=>({id:M,channel_id:CH,flags:64,content:JSON.parse(request.body).content})};}if(method==='DELETE'){const existed=f.exists;f.exists=false;return existed?{status:204}:{status:404,json:async()=>({code:10008})};}throw Error('Unexpected mock request');}});
 const profile={enabled:true,scopeId:S,applicationId:A,guildId:G,bindings:[{actorId:R,channelId:CH}],activeKeyId:'k1',allowedKeyIds:['k1']};
 f.vault=createReviewCredentialVault(profile,{store:f.store,getKey:async()=>f.key,transport,now:()=>1000});
 f.service=createManagedReviewResponses({...profile,workflowTimeoutMs:5000,retirementTimeoutMs:50},{vault:f.vault,now:()=>1000,isReady:()=>true,onUnhealthy:()=>{},makeOwner:(config,ports)=>createReviewDeliveryOwner({enabled:true,...config},{...ports,journal:f.journal})});
 f.defer=()=>f.service.defer({id:I,applicationId:A,guildId:G,channelId:CH,user:{id:R,bot:false},createdTimestamp:1000,token:'FIXTURE_ONLY_INTERACTION_TOKEN_00000000',deferred:false,replied:false},{flags:64,deadlineMs:6000});
 f.inspect=()=>inspectReviewRecovery({enabled:true,scopeId:S},{vault:f.vault,store:f.store,journal:f.journal,now:()=>1000});
 t.after(async()=>{await f.service.stop();await f.store.close();await f.journal.close();f.key.fill(0);await rm(base,{recursive:true,force:true});});return f;
}
test('filesystem: deferred status lifecycle retires journal and encrypted authority',{timeout:10000},async t=>{const f=await fixture(t);assert.equal((await f.inspect()).admissionReady,true);const s=await f.defer();assert.equal((await f.journal.snapshot()).entries[0].sender,'inflight');assert.equal((await f.store.list()).length,1);assert.deepEqual(await s.edit(payload()),{ok:true});await s.retire();await until(async()=>(await f.service.stop()).complete);assert.equal((await f.journal.snapshot()).entries[0].complete,true);assert.deepEqual(await f.store.list(),[]);assert.equal((await f.inspect()).admissionReady,true);assert.equal(f.exists,false);});
test('filesystem: late edit after early delete requires another deletion',{timeout:10000},async t=>{const f=await fixture(t),gate=deferred();f.httpHook=async method=>{if(method==='PATCH')await gate.promise;};const s=await f.defer(),edit=s.edit(payload());edit.catch(()=>{});await until(()=>f.http.includes('PATCH'));assert.equal((await f.service.stop()).complete,false);await until(()=>f.http.includes('DELETE'));assert.equal((await f.journal.snapshot()).entries[0].complete,false);assert.equal((await f.store.list()).length,1);gate.resolve();await assert.rejects(()=>edit);await until(async()=>(await f.store.list()).length===0);assert.equal((await f.service.stop()).complete,true);assert.equal((await f.journal.snapshot()).entries[0].complete,true);assert.equal(f.http.filter(x=>x==='PATCH').length,1);assert.equal(f.http.filter(x=>x==='DELETE').length,2);assert.equal(f.exists,false);});
test('filesystem: unknown publication preserves credentials and blocks inventory admission',{timeout:10000},async t=>{const f=await fixture(t);f.httpHook=async method=>method==='POST'?{status:503}:undefined;await assert.rejects(()=>f.defer());assert.equal((await f.service.stop()).complete,false);assert.equal((await f.journal.snapshot()).entries[0].sender,'unknown');assert.equal((await f.store.list()).length,1);assert.equal((await f.inspect()).admissionReady,false);assert.equal(f.http.filter(x=>x==='POST').length,1);});
