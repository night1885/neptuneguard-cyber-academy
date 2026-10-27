import test from 'node:test';
import assert from 'node:assert/strict';
import { createIsolatedFormalStagingApplication } from './isolated-staging.mjs';
const G='111111111111111111',B='555555555555555555';
function fixture() {
 const env={FORMAL_STAGING_ENABLED:'true',CERTIFICATION_ENABLED:'true',GUILD_ID:G,ACADEMY_OWNER_ID:'222222222222222222',
 ACADEMY_ADMIN_CHANNEL_ID:'333333333333333333',VERIFIED_ROLE_ID:'444444444444444444',FORMAL_STAGING_BOT_ID:B,FORMAL_STAGING_ENTRY_CHANNEL_ID:'666666666666666666',
 CERTIFICATION_DATABASE_URL:'postgresql://synthetic:synthetic@staging.example/staging'};
 for(const flag of ['CERTIFICATION_REGISTRATION_PILOT','CERTIFICATION_READ_ONLY_PREVIEW','CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED','CERTIFICATION_APPLICATION_CLOSURE_ENABLED','CERTIFICATION_COURSES_ENABLED','CERTIFICATION_MANUAL_REVIEW_ENABLED','CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED']) env[flag]='false';
 const state={ends:0,detaches:0,client:{user:{id:B}}};
 const input={client:state.client,env,productionBoundary:{guildId:'777777777777777777',botId:'888888888888888888',databaseHost:'production.example',databasePort:'5432',databaseName:'production'}};
 const deps={loadConfig:e=>({enabled:true,ownerId:e.ACADEMY_OWNER_ID,adminChannelId:e.ACADEMY_ADMIN_CHANNEL_ID,
 activeAgreementVersion:'synthetic',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'synthetic'},enrollmentSubmissionEnabled:false}),
 createPool:()=>({query:async()=>({rows:[]}),end:async()=>{state.ends++;}}),
 createRoute:o=>{state.route=o;return{};},
 attachRuntime(c,p,g,e,o){state.pool=o.createPool({});o.formalReview.createRoute({client:c,guildId:g,config:deps.loadConfig(e),isReady:()=>true});
 return {detach:async()=>{state.detaches++;await state.pool.end();}};},
 createApplication(o){state.options=o;state.runtime=o.attachRuntime(state.client,undefined,G,o.env);
 return {enabled:true,ready:true,start:async()=>{},shutdown:()=>state.runtime.detach()};}};
 return{state,input,deps};
}
function failure(input,deps){try{createIsolatedFormalStagingApplication(input,deps);}catch(error){return error;}assert.fail('Expected constructor rejection');}
test('malformed pool with end closes once before cleanup resolves',async()=>{
 const f=fixture();f.deps.createPool=()=>({end:async()=>{f.state.ends++;}});
 const e=failure(f.input,f.deps);await e.cleanup;assert.equal(f.state.ends,1);assert.equal(f.state.detaches,0);
});
test('invalid application return detaches runtime and ends its pool exactly once',async()=>{
 const f=fixture(),original=f.deps.createApplication;f.deps.createApplication=o=>{original(o);return{};};
 const e=failure(f.input,f.deps);await e.cleanup;assert.equal(f.state.detaches,1);assert.equal(f.state.ends,1);
});
test('application throw after attachment has observable cleanup',async()=>{
 const f=fixture(),original=f.deps.createApplication;f.deps.createApplication=o=>{original(o);throw new Error('PRIVATE');};
 const e=failure(f.input,f.deps);assert.equal(e.message.includes('PRIVATE'),false);await e.cleanup;
 assert.equal(f.state.detaches,1);assert.equal(f.state.ends,1);assert.equal(Object.keys(e).includes('cleanup'),false);
});
test('runtime failure and outer cleanup share the same pool closure',async()=>{
 const f=fixture();f.deps.attachRuntime=(c,p,g,e,o)=>{f.state.pool=o.createPool({});void f.state.pool.end();throw new Error('PRIVATE');};
 const e=failure(f.input,f.deps);await e.cleanup;assert.equal(f.state.ends,1);
});
test('cleanup rejection is observable without raw backend details',async()=>{
 const f=fixture();f.deps.createPool=()=>({end:async()=>{throw new Error('PRIVATE URL');}});
 const e=failure(f.input,f.deps);await assert.rejects(e.cleanup,{message:'Isolated staging cleanup requires attention'});
});
test('pool without end cannot be reported cleaned successfully',async()=>{
 const f=fixture();f.deps.createPool=()=>({});const e=failure(f.input,f.deps);
 await assert.rejects(e.cleanup,/cleanup requires attention/);
});
test('normal pool end requests are idempotent and shutdown retires readiness',async()=>{
 const f=fixture(),app=createIsolatedFormalStagingApplication(f.input,f.deps);
 assert.equal(app.ready,true);await Promise.all([f.state.pool.end(),f.state.pool.end()]);await app.shutdown();
 assert.equal(f.state.ends,1);assert.equal(app.ready,false);assert.equal(f.state.route.isReady(),false);
});
test('async application factory is rejected and cannot attach a late runtime',async()=>{
 const f=fixture();let lateRejected=false;
 f.deps.createApplication=async o=>{await Promise.resolve();try{o.attachRuntime(f.state.client,undefined,G,o.env);}catch{lateRejected=true;}return{};};
 const e=failure(f.input,f.deps);await e.cleanup;await new Promise(r=>setImmediate(r));
 assert.equal(lateRejected,true);assert.equal(f.state.ends,0);assert.equal(f.state.pool,undefined);
});
test('cleanup deadline reports an unfinished pool instead of claiming success',async()=>{
 const f=fixture();f.deps.createPool=()=>({end:()=>new Promise(()=>{})});
 const e=failure(f.input,f.deps);await assert.rejects(e.cleanup,/cleanup requires attention/);
});
