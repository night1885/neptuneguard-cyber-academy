import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFictionalIntakeStagingProfile as inspect} from './fictional-intake-staging-profile.mjs';
const fixture=()=>({enabled:true,mode:'fictional-intake-staging',fictionalReportsOnly:true,
 staging:{guildId:'100000000000000001',botId:'100000000000000002',entryChannelId:'100000000000000003',operatorId:'100000000000000004',database:{host:'stage.invalid',port:'5432',name:'fictional_intake'}},
 production:{guildId:'200000000000000001',botId:'200000000000000002',database:{host:'production.invalid',port:'5432',name:'academy'}}});
test('default off',()=>assert.deepEqual(inspect(),{ok:true,enabled:false,operationalReady:false}));
test('disabled inspection does not evaluate configuration getters',()=>{const c={enabled:false,get staging(){throw Error('Unexpected getter');},get production(){throw Error('Unexpected getter');}};assert.equal(inspect(c).enabled,false);assert.equal(inspect(c).ok,true);});
for(const enabled of ['true',1,null,undefined])test('nonliteral enable stays off: '+String(enabled),()=>assert.equal(inspect({enabled}).enabled,false));
test('enabled accessor fails closed without invocation',()=>{let called=false;const c={get enabled(){called=true;return true;}};assert.equal(inspect(c).ok,false);assert.equal(called,false);});
test('valid fictional profile is frozen but never operationally ready',()=>{const c=fixture(),r=inspect(c);assert.equal(r.ok,true);assert.equal(r.enabled,true);assert.equal(r.operationalReady,false);for(const value of [r,r.profile,r.profile.staging,r.profile.production,r.profile.staging.database,r.profile.production.database])assert.equal(Object.isFrozen(value),true);c.staging.guildId='300000000000000001';assert.notEqual(r.profile.staging.guildId,c.staging.guildId);});
for(const key of ['guildId','botId'])test('production '+key+' reuse denied',()=>{const c=fixture();c.staging[key]=c.production[key];assert.equal(inspect(c).ok,false);});
test('same configured database denied after hostname normalization',()=>{const c=fixture();c.staging.database={...c.production.database,host:'PRODUCTION.INVALID'};assert.equal(inspect(c).ok,false);});
for(const field of ['guildId','botId','entryChannelId','operatorId'])test('missing staging '+field+' denied',()=>{const c=fixture();delete c.staging[field];assert.equal(inspect(c).ok,false);});
for(const port of ['0','65536','05432','5432x',5432])test('invalid port denied: '+String(port),()=>{const c=fixture();c.staging.database.port=port;assert.equal(inspect(c).ok,false);});
test('enabled nested getter denied without invocation',()=>{const c=fixture();let called=false;Object.defineProperty(c.staging,'guildId',{get(){called=true;return '100000000000000001';}});assert.equal(inspect(c).ok,false);assert.equal(called,false);});
test('credential-shaped extra field is rejected and not exposed',()=>{const c=fixture();c.token='fictional-test-marker';const r=inspect(c);assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes(c.token),false);});
test('fictional-only declaration required',()=>{const c=fixture();c.fictionalReportsOnly=false;assert.equal(inspect(c).ok,false);});
test('unrecognized mode denied',()=>{const c=fixture();c.mode='production';assert.equal(inspect(c).ok,false);});
test('inherited profiles denied',()=>assert.equal(inspect(Object.create(fixture())).ok,false));
test('database URL is not accepted in metadata fields',()=>{const c=fixture();c.staging.database.host='postgresql://user:secret@stage.invalid/db';const r=inspect(c);assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes('secret'),false);});
test('different strings do not assert DNS, database or Discord identity verification',()=>{const c=fixture();c.staging.database.host='alias.invalid';assert.equal(inspect(c).ok,true);assert.equal(inspect(c).operationalReady,false);});
