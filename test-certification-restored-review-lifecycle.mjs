import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRestoredCertificationApplication} from './certification-restored-application.js';
function fixture(attachReview,reviewDetach=async()=>{}){
 const events=[],signals=new EventEmitter(),client=new EventEmitter();
 client.isReady=()=>false;client.login=async()=>events.push('login');client.destroy=()=>events.push('destroy');
 const runtime={enabled:true,ready:true,detach:async()=>events.push('certification-detach')};
 const community={ready:true,detach:async()=>events.push('community-detach')};
 const env={CERTIFICATION_ENABLED:'true',CERTIFICATION_COURSES_ENABLED:'true',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'true',ACADEMY_OWNER_ID:'100000000000000001',ACADEMY_ADMIN_CHANNEL_ID:'100000000000000002',CERTIFICATION_ENROLLMENT_MANIFEST_JSON:JSON.stringify({agreementVersion:'fixture',agreementSha256:'a'.repeat(64),comprehensionCheck:{version:'fixture',questions:[{prompt:'Stop?'}],correctAnswers:['yes']}})};
 const options={client,guildId:'100000000000000003',env,signals,exit:code=>events.push('exit:'+code),log:()=>{},attachRuntime(c,p,g,e){assert.equal(c,client);assert.equal(e.CERTIFICATION_COURSES_ENABLED,'true');assert.equal(e.CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED,'true');return runtime;},attachCommunity:()=>community,timeoutMs:1000};
 if(attachReview)options.attachReview=(c,g,e,context)=>attachReview({c,g,e,context,events,reviewDetach});
 return {options,events,runtime,community,client,signals,env};
}
test('review lifecycle coexists without modifying course or submission configuration',async()=>{
 let context;const review={enabled:true,ready:true,detach:async()=>f.events.push('review-detach')};
 const f=fixture(args=>{context=args.context;assert.equal(args.e.CERTIFICATION_COURSES_ENABLED,'true');assert.equal(args.e.CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED,'true');assert.equal(Object.isFrozen(args.e),true);return review;});
 const before={...f.env},app=createRestoredCertificationApplication(f.options);
 assert.equal(app.ready,true);assert.equal(app.communityReady,true);assert.equal(app.reviewReady,true);assert.equal(context.isCertificationReady(),true);
 review.ready=false;assert.equal(app.reviewReady,false);assert.equal(app.ready,true);assert.equal(app.communityReady,true);
 review.ready=true;f.runtime.ready=false;assert.equal(app.reviewReady,false);assert.equal(context.isCertificationReady(),false);f.runtime.ready=true;
 await app.start('fictional-not-a-token');await app.shutdown();await app.shutdown();
 for(const name of ['review-detach','community-detach','certification-detach','destroy','exit:0'])assert.equal(f.events.filter(e=>e===name).length,1);
 assert.ok(f.events.indexOf('review-detach')<f.events.indexOf('destroy'));assert.equal(app.reviewReady,false);assert.equal(context.isCertificationReady(),false);assert.deepEqual(f.env,before);
});
test('existing startup remains independent when no review factory is supplied',async()=>{
 const f=fixture(),app=createRestoredCertificationApplication(f.options);assert.equal(app.ready,true);assert.equal(app.communityReady,true);assert.equal(app.reviewReady,false);await app.shutdown();assert.ok(f.events.includes('exit:0'));
});
test('review drain failure still drains existing runtimes and produces failure exit',async()=>{
 const f=fixture(()=>({enabled:true,ready:true,detach:async()=>{throw Error('fictional drain failure');}}));
 const app=createRestoredCertificationApplication(f.options);await app.shutdown();assert.ok(f.events.includes('certification-detach'));assert.ok(f.events.includes('community-detach'));assert.ok(f.events.includes('exit:1'));
});
test('invalid review construction is not silently accepted and cleans attached runtimes',async()=>{
 const f=fixture(()=>({enabled:false,detach:async()=>{}}));assert.throws(()=>createRestoredCertificationApplication(f.options),/Enabled review lifecycle required/);
 await new Promise(resolve=>setImmediate(resolve));assert.ok(f.events.includes('certification-detach'));assert.ok(f.events.includes('community-detach'));assert.equal(f.events.includes('login'),false);
});
