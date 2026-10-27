import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectFormalStagingProfile, createIsolatedFormalStagingApplication } from './isolated-staging.mjs';
const A='111111111111111111',G='222222222222222222',B='333333333333333333',C='444444444444444444',R='555555555555555555',E='666666666666666666';
const boundary={guildId:'777777777777777777',botId:'888888888888888888',databaseHost:'production.example',databasePort:'5432',databaseName:'production'};
function env(){return {FORMAL_STAGING_ENABLED:'true',CERTIFICATION_ENABLED:'true',GUILD_ID:G,ACADEMY_OWNER_ID:A,
 ACADEMY_ADMIN_CHANNEL_ID:C,VERIFIED_ROLE_ID:R,FORMAL_STAGING_BOT_ID:B,FORMAL_STAGING_ENTRY_CHANNEL_ID:E,
 CERTIFICATION_DATABASE_URL:'postgresql://synthetic:synthetic@staging.example/staging',
 CERTIFICATION_REGISTRATION_PILOT:'false',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',
 CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_COURSES_ENABLED:'false',CERTIFICATION_MANUAL_REVIEW_ENABLED:'false',
 CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'false'};}
const loadConfig=e=>({enabled:true,ownerId:e.ACADEMY_OWNER_ID,adminChannelId:e.ACADEMY_ADMIN_CHANNEL_ID,
 activeAgreementVersion:'synthetic-v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'synthetic-v1'},enrollmentSubmissionEnabled:false});
test('valid local profile never claims operational readiness',()=>{
 assert.deepEqual(inspectFormalStagingProfile(env(),boundary,loadConfig),{ok:true,scope:'staging-local-only',operationalReady:false});
});
for(const flag of ['CERTIFICATION_REGISTRATION_PILOT','CERTIFICATION_READ_ONLY_PREVIEW','CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED',
 'CERTIFICATION_APPLICATION_CLOSURE_ENABLED','CERTIFICATION_COURSES_ENABLED','CERTIFICATION_MANUAL_REVIEW_ENABLED','CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED']) {
 test(`${flag} must be explicitly false`,()=>{for(const value of ['true','FALSE',undefined]){const e=env();if(value===undefined)delete e[flag];else e[flag]=value;assert.equal(inspectFormalStagingProfile(e,boundary,loadConfig).ok,false);}});
}
test('explicit staging and certification enablement required',()=>{
 for(const field of ['FORMAL_STAGING_ENABLED','CERTIFICATION_ENABLED']){const e=env();delete e[field];assert.equal(inspectFormalStagingProfile(e,boundary,loadConfig).ok,false);}
});
test('declared production guild bot and database are rejected',()=>{
 for(const patch of [{GUILD_ID:boundary.guildId},{FORMAL_STAGING_BOT_ID:boundary.botId},
 {CERTIFICATION_DATABASE_URL:'postgresql://synthetic:synthetic@production.example:5432/production'}])assert.equal(inspectFormalStagingProfile({...env(),...patch},boundary,loadConfig).ok,false);
});
test('invalid identities and shared admin-entry channel are rejected',()=>{
 for(const field of ['GUILD_ID','ACADEMY_OWNER_ID','ACADEMY_ADMIN_CHANNEL_ID','VERIFIED_ROLE_ID','FORMAL_STAGING_BOT_ID','FORMAL_STAGING_ENTRY_CHANNEL_ID'])assert.equal(inspectFormalStagingProfile({...env(),[field]:'bad'},boundary,loadConfig).ok,false);
 assert.equal(inspectFormalStagingProfile({...env(),FORMAL_STAGING_ENTRY_CHANNEL_ID:C},boundary,loadConfig).ok,false);
});
test('profile rejects tokens and does not echo credentials or parser errors',()=>{
 for(const key of ['TOKEN','BOT_TOKEN','DISCORD_TOKEN'])assert.equal(inspectFormalStagingProfile({...env(),[key]:'SECRET'},boundary,loadConfig).ok,false);
 const result=inspectFormalStagingProfile(env(),boundary,()=>{throw new Error('PRIVATE URL OR MANIFEST');});
 assert.equal(result.ok,false);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});
test('getter input is rejected without executing it',()=>{
 const e=env();let reads=0;Object.defineProperty(e,'secret',{get(){reads++;throw new Error('secret');}});
 assert.equal(inspectFormalStagingProfile(e,boundary,loadConfig).ok,false);assert.equal(reads,0);
});
test('config identity mismatch and incomplete manifest deny',()=>{
 for(const patch of [{ownerId:B},{adminChannelId:E},{activeAgreementSha256:''},{activeAgreementVersion:''},
 {comprehensionCheck:{}},{manualReviewEnabled:true},{manualReviewDecisionsEnabled:true},{enrollmentSubmissionEnabled:true}]) {
 assert.equal(inspectFormalStagingProfile(env(),boundary,e=>({...loadConfig(e),...patch})).ok,false);}
});
function harness(patch={}){
 const state={applications:0,pools:0,ready:true,shutdowns:0,starts:[],client:{user:{id:B}},ended:0};
 const deps={loadConfig,
 createApplication(options){state.applications++;state.appOptions=options;state.runtime=options.attachRuntime(state.client,undefined,G,options.env);
 return {enabled:true,get ready(){return state.ready;},stopping:false,start:async token=>{state.starts.push(token);},shutdown:async()=>{state.shutdowns++;await state.pool.end();}};},
 attachRuntime(client,pool,guild,environment,options){state.runtimeOptions=options;
 state.pool=options.createPool({connectionString:environment.CERTIFICATION_DATABASE_URL});
 state.route=options.formalReview.createRoute({client,guildId:guild,config:loadConfig(environment),isReady:()=>state.ready});return {};},
 createPool(connection,limits){state.pools++;state.limits=limits;return {query:async()=>({rows:[]}),end:async()=>{state.ended++;}};},
 createRoute(options){state.routeOptions=options;return {enabled:true,handle:async()=>true,dispose:async()=>({drained:true})};},...patch};
 const app=createIsolatedFormalStagingApplication({client:state.client,env:env(),productionBoundary:boundary,bundle:{synthetic:true}},deps);
 return {state,app,deps};
}
test('composition creates no login and requests bounded read-only pool',()=>{
 const {state,app}=harness();assert.equal(state.starts.length,0);assert.equal(state.applications,1);assert.equal(state.pools,1);
 assert.deepEqual(state.limits,{readOnly:true,max:2,connectionTimeoutMs:1000,statementTimeoutMs:1000,lockTimeoutMs:500,idleTransactionTimeoutMs:2000});
 assert.equal(app.ready,true);assert.equal(app.communityReady,false);assert.equal(state.routeOptions.readPool,state.pool);
 assert.equal(Object.isFrozen(state.appOptions.env),true);assert.equal(state.appOptions.attachCommunity().enabled,false);
});
test('wrong logged-in bot and parent readiness loss block formal route readiness',()=>{
 const {state,app}=harness();assert.equal(state.routeOptions.isReady(),true);state.client.user={id:A};
 assert.equal(state.routeOptions.isReady(),false);assert.equal(app.ready,false);state.client.user={id:B};state.ready=false;assert.equal(state.routeOptions.isReady(),false);
});
test('generic certification actions receive only private neutral denial',async()=>{
 const {state}=harness();const i={reply:async p=>{assert.equal(p.flags,64);assert.deepEqual(p.components,[]);assert.deepEqual(p.allowedMentions,{parse:[]});}};
 assert.equal(await state.runtimeOptions.createRouter()(i),true);
 const j={deferred:true,editReply:async p=>{assert.deepEqual(p.embeds,[]);}};assert.equal(await state.runtimeOptions.createRouter()(j),true);
});
test('invalid profile causes no application or pool construction',()=>{
 let calls=0;assert.throws(()=>createIsolatedFormalStagingApplication({env:{...env(),CERTIFICATION_REGISTRATION_PILOT:'true'},productionBoundary:boundary},
 {loadConfig,createApplication(){calls++;},attachRuntime(){calls++;},createPool(){calls++;},createRoute(){calls++;}}));assert.equal(calls,0);
});
test('application cannot attach a second runtime or attach against a changed environment',()=>{
 const {state}=harness();assert.throws(()=>state.appOptions.attachRuntime(state.client,undefined,G,state.appOptions.env));
});
test('lifecycle passes start and shutdown to the owning application',async()=>{
 const {state,app}=harness();await app.start('synthetic-test-token');await app.shutdown();assert.equal(state.starts.length,1);assert.equal(state.shutdowns,1);assert.equal(state.ended,1);
});

test('changed initial runtime environment is rejected before constructing a pool',()=>{
 let pools=0;
 assert.throws(()=>createIsolatedFormalStagingApplication({client:{},env:env(),productionBoundary:boundary},
 {loadConfig,createApplication:o=>o.attachRuntime(o.client,undefined,G,{...o.env,CERTIFICATION_REGISTRATION_PILOT:'true'}),
 attachRuntime(){throw new Error('Must not attach');},createPool(){pools++;},createRoute(){}}));
 assert.equal(pools,0);
});
