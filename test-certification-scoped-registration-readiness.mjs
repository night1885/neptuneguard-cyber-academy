import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScopedRegistrationCourseReadiness as run} from './certification-scoped-registration-readiness.js';
function fixture({fail,unconfirmed}={}){
 const calls=[],pool={async query(){throw Error('Unexpected SQL from orchestration');},async connect(){throw Error('Unexpected connection');}};
 const config={enabled:true,manualReviewEnabled:true,manualReviewDecisionsEnabled:true,enrollmentSubmissionEnabled:false,courseRequestsEnabled:true,scopedRegistration:{enabled:true}};
 const connection={connectionString:'FICTIONAL_NOT_A_CONNECTION',ssl:{rejectUnauthorized:true}};
 const f=k=>async()=>{calls.push(k);if(fail===k)throw Error('PRIVATE_SENTINEL');return unconfirmed===k?undefined:{ready:true};};
 const validators={registration:f('registration'),agreement:f('agreement'),lifecycle:f('lifecycle'),requests:f('requests')};
 const input={pool,config,connection,decisions:{initialize:f('decision')}};
 return {calls,input,validators};
}
test('runs all checks sequentially and returns frozen readiness',async()=>{const f=fixture();const r=await run(f.input,f.validators);assert.deepEqual(f.calls,['registration','agreement','lifecycle','requests','decision']);assert.deepEqual(r,{ready:true});assert.equal(Object.isFrozen(r),true);});
test('forwards exact descriptor so provenance checks cannot be omitted',async()=>{const f=fixture();f.validators.registration=async(pool,options)=>{assert.equal(pool,f.input.pool);assert.equal(options.pilotConnection,f.input.connection);f.calls.push('registration');};await run(f.input,f.validators);});
test('forwards the exact current agreement configuration',async()=>{const f=fixture();f.validators.agreement=async(pool,config)=>{assert.equal(pool,f.input.pool);assert.equal(config,f.input.config);f.calls.push('agreement');};await run(f.input,f.validators);});
for(const phase of ['registration','agreement','lifecycle','requests','decision'])test('failure stops later phases: '+phase,async()=>{const f=fixture({fail:phase});await assert.rejects(run(f.input,f.validators));const all=['registration','agreement','lifecycle','requests','decision'];assert.deepEqual(f.calls,all.slice(0,all.indexOf(phase)+1));});
for(const phase of ['lifecycle','requests','decision'])test('missing literal readiness fails closed: '+phase,async()=>{const f=fixture({unconfirmed:phase});await assert.rejects(run(f.input,f.validators));assert.equal(f.calls.at(-1),phase);});
test('all required enablement fields are enforced before validators',async()=>{for(const key of ['enabled','manualReviewEnabled','manualReviewDecisionsEnabled','courseRequestsEnabled'])for(const value of [false,undefined,'true']){const f=fixture();f.input.config[key]=value;await assert.rejects(run(f.input,f.validators));assert.deepEqual(f.calls,[]);}});
test('general enrollment cannot be opened or left implicit',async()=>{for(const value of [true,undefined,'false']){const f=fixture();f.input.config.enrollmentSubmissionEnabled=value;await assert.rejects(run(f.input,f.validators));assert.deepEqual(f.calls,[]);}});
test('missing explicit registration scope fails before validators',async()=>{const f=fixture();delete f.input.config.scopedRegistration;await assert.rejects(run(f.input,f.validators));assert.deepEqual(f.calls,[]);});
test('missing connection descriptor fails before validators',async()=>{const f=fixture();delete f.input.connection;await assert.rejects(run(f.input,f.validators));assert.deepEqual(f.calls,[]);});
test('partial validator overrides are rejected',async()=>{for(const key of ['registration','agreement','lifecycle','requests']){const f=fixture();delete f.validators[key];await assert.rejects(run(f.input,f.validators));assert.deepEqual(f.calls,[]);}});
test('orchestration does not mutate config or connection',async()=>{const f=fixture();Object.freeze(f.input.config.scopedRegistration);Object.freeze(f.input.config);Object.freeze(f.input.connection.ssl);Object.freeze(f.input.connection);await run(f.input,f.validators);});
