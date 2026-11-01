import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createStagingReviewerReader as create} from './staging-reviewer-reader.candidate.mjs';
const G='100000000000000001',L='100000000000000002',R='100000000000000003';
const ID='11111111-1111-4111-8111-111111111111',P='22222222-2222-4222-8222-222222222222';
function fixture(){
 const f={now:1000,ready:true,connects:0,calls:[],released:[]};
 f.config={enabled:true,guildId:G,recordId:ID,learnerId:L,reviewerId:R,courseKey:'demo-course',exerciseKey:'demo-exercise',database:'fictional_staging',productionDatabase:'excluded_production',expectedRole:'fi_stage_worker'};f.ctx={actorId:R,guildId:G};
 f.meta={db:'fictional_staging',actor:'fi_stage_worker',contract:1,can_create:false,table_access:false,elevated:false,can_read:true};
 f.result={ok:true,reportId:P,recordId:ID,learnerId:L,body:'FICTIONAL_BODY',digest:createHash('sha256').update('FICTIONAL_BODY').digest('hex'),revision:1,submittedAtMs:500,expiresAtMs:86400500,unexpected:'DO_NOT_RETURN'};
 const client={async query(sql,values){f.calls.push([sql,values]);if(f.fail&&sql.startsWith(f.fail))throw Error('SECRET_ERROR');if(sql==='ROLLBACK'&&f.rollbackFails)throw Error('SECRET_ROLLBACK');if(sql.startsWith('SELECT current_database'))return {rows:[f.meta]};if(sql.startsWith('SELECT fi_stage.reviewer_read')){if(f.readHook)await f.readHook();return {rows:f.rows??[{result:f.result}]};}if(sql==='COMMIT'&&f.commitHook)f.commitHook();return {rows:[]};},release:discard=>f.released.push(discard)};
 const pool={async connect(){f.connects++;if(f.connectFails)throw Error('SECRET_CONNECT');return client;}};
 f.reader=create(f.config,{getResources:()=>({pool}),isReady:()=>f.ready,now:()=>f.now});return f;
}
const deny=f=>assert.rejects(()=>f.reader.readReport(f.ctx,P),e=>e.message==='Staging reviewer read unavailable');
test('parameterized read uses one transaction and projects response',async()=>{const f=fixture(),r=await f.reader.readReport(f.ctx,P);assert.equal(r.body,'FICTIONAL_BODY');assert.equal(r.unexpected,undefined);assert.ok(Object.isFrozen(r));assert.equal(f.connects,1);assert.deepEqual(f.calls.find(([s])=>s.startsWith('SELECT fi_stage.reviewer_read'))[1],[R,G,ID,'demo-course','demo-exercise',P]);assert.equal(f.calls[0][0],'BEGIN');assert.equal(f.calls.at(-1)[0],'COMMIT');assert.deepEqual(f.released,[false]);});
for(const [name,change]of [['learner',f=>f.ctx.actorId=L],['wrong guild',f=>f.ctx.guildId=L],['extra context',f=>f.ctx.recordId=ID],['unready',f=>f.ready=false],['disposed',f=>f.reader.dispose()]])test(`rejects ${name} before connection`,async()=>{const f=fixture();change(f);await deny(f);assert.equal(f.connects,0);});
for(const [key,value]of [['db','wrong'],['actor','postgres'],['contract',2],['can_create',true],['table_access',true],['elevated',true],['can_read',false]])test(`rejects identity/privilege ${key}`,async()=>{const f=fixture();f.meta[key]=value;await deny(f);assert.ok(!f.calls.some(([s])=>s.startsWith('SELECT fi_stage.reviewer_read')));assert.equal(f.calls.at(-1)[0],'ROLLBACK');});
for(const [name,change]of [['digest',f=>f.result.digest='0'.repeat(64)],['record',f=>f.result.recordId=P],['learner',f=>f.result.learnerId=R],['report',f=>f.result.reportId=ID],['revision',f=>f.result.revision=0],['expired',f=>f.now=f.result.expiresAtMs],['future',f=>f.result.submittedAtMs=2000],['too long',f=>f.result.body='x'.repeat(2001)],['no rows',f=>f.rows=[]]])test(`rejects response ${name}`,async()=>{const f=fixture();change(f);await deny(f);assert.equal(f.calls.at(-1)[0],'ROLLBACK');});
for(const sql of ['BEGIN','SELECT current_database','SELECT fi_stage.reviewer_read','COMMIT'])test(`contains query failure ${sql}`,async()=>{const f=fixture();f.fail=sql;await deny(f);assert.equal(f.released.length,1);});
test('failed rollback discards client',async()=>{const f=fixture();f.fail='SELECT fi_stage.reviewer_read';f.rollbackFails=true;await deny(f);assert.deepEqual(f.released,[true]);});
test('connection failure is contained',async()=>{const f=fixture();f.connectFails=true;await deny(f);assert.equal(f.released.length,0);});
for(const mode of ['dispose','readiness','expiry','clock regression'])test(`suppresses result at commit-time ${mode}`,async()=>{const f=fixture();f.commitHook=()=>{if(mode==='dispose')f.reader.dispose();else if(mode==='readiness')f.ready=false;else if(mode==='expiry')f.now=f.result.expiresAtMs;else f.now=999;};await deny(f);});
test('busy reader rejects overlap',async()=>{const f=fixture();let release;f.readHook=()=>new Promise(r=>{release=r;});const work=f.reader.readReport(f.ctx,P);while(!release)await new Promise(r=>setImmediate(r));await deny(f);release();await work;assert.equal(f.connects,1);});
test('default-off requires no providers',async()=>{const r=create();await assert.rejects(()=>r.readReport({},P));r.dispose();});
test('identical databases rejected',()=>{const f=fixture();assert.throws(()=>create({...f.config,productionDatabase:f.config.database},{getResources(){},isReady(){},now(){}}));});
