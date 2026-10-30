import test from 'node:test';
import assert from 'node:assert/strict';
import {createFictionalStagingResourceVerifier as create} from './fictional-intake-staging-resource-verifier.mjs';
function fixture(){
 const f={ready:true,retired:false,queries:0,fetches:[],denied:new Set(),db:{database_name:'fictional_intake',role_name:'fictional_stage_worker',elevated:false}};
 f.profile=Object.freeze({mode:'fictional-intake-staging',fictionalReportsOnly:true,staging:Object.freeze({guildId:'100000000000000001',botId:'100000000000000002',entryChannelId:'100000000000000003',operatorId:'100000000000000004',database:Object.freeze({host:'stage.invalid',port:'5432',name:'fictional_intake'})}),production:Object.freeze({guildId:'200000000000000001',botId:'200000000000000002',database:Object.freeze({host:'production.invalid',port:'5432',name:'academy'})})});
 const s=f.profile.staging;
 f.guild={id:s.guildId,roles:{async fetch(){f.fetches.push('roles');}},members:{async fetch(o){assert.equal(o.force,true);f.fetches.push(o.user);return {id:o.user,guild:{id:f.guild.id},user:{bot:o.user===s.botId}};}},channels:{async fetch(id,o){assert.equal(id,s.entryChannelId);assert.equal(o.force,true);f.fetches.push(id);return f.entry;}}};
 f.entry={id:s.entryChannelId,guildId:s.guildId,type:0,permissionsFor(member){return {has:p=>!f.denied.has(member.id+':'+p)};}};
 f.client={user:{id:s.botId},isReady:()=>f.ready,guilds:{async fetch(o){assert.deepEqual(o,{guild:s.guildId,force:true});f.fetches.push('guild');return f.guild;}}};
 f.pool={async query(sql){assert.match(sql,/^SELECT current_database\(\)/);assert.equal(sql.includes('fictional_stage_worker'),false);f.queries++;return {rows:[f.db]};}};
 f.verifier=create(f.profile,{client:f.client,pool:f.pool},'fictional_stage_worker');return f;
}
test('one-shot observer queries actual-method interfaces and emits only scoped checks',async()=>{const f=fixture(),r=await f.verifier.inspect();assert.equal(r.ok,true);assert.equal(r.operationalReady,false);assert.equal(f.queries,1);assert.equal(f.fetches.length,5);assert.equal(Object.isFrozen(r.checks),true);});
test('construction performs no fetch or query',()=>{const f=fixture();assert.equal(f.queries,0);assert.equal(f.fetches.length,0);});
test('wrong bot denied before any calls',async()=>{const f=fixture();f.client.user.id=f.profile.production.botId;assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.queries,0);assert.equal(f.fetches.length,0);});
test('not-ready client denied before calls',async()=>{const f=fixture();f.ready=false;assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.fetches.length,0);});
test('wrong fetched guild denied before membership or SQL',async()=>{const f=fixture();f.guild.id=f.profile.production.guildId;assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.queries,0);});
for(const key of ['id','guildId','type'])test('wrong entry '+key+' denied',async()=>{const f=fixture();f.entry[key]=key==='type'?11:'100000000000000099';assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.queries,0);});
for(const permission of ['ViewChannel','SendMessages','ReadMessageHistory'])test('missing bot permission '+permission,async()=>{const f=fixture();f.denied.add(f.profile.staging.botId+':'+permission);assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.queries,0);});
test('operator without entry visibility denied',async()=>{const f=fixture();f.denied.add(f.profile.staging.operatorId+':ViewChannel');assert.equal((await f.verifier.inspect()).ok,false);});
for(const [key,value]of [['database_name','academy'],['role_name','postgres'],['elevated',true],['elevated',null]])test('backend mismatch '+key+' '+String(value),async()=>{const f=fixture();f.db[key]=value;assert.equal((await f.verifier.inspect()).ok,false);});
test('provider error is neutral and secrets are not returned',async()=>{const f=fixture();f.pool.query=async()=>{throw Error('fictional-private-marker');};const r=await f.verifier.inspect();assert.equal(r.ok,false);assert.equal(JSON.stringify(r).includes('fictional-private-marker'),false);});
test('retirement denies subsequent inspection',async()=>{const f=fixture();f.verifier.close();assert.equal((await f.verifier.inspect()).ok,false);assert.equal(f.queries,0);});
test('retirement while query pending suppresses success',async()=>{const f=fixture();let enter,release;const entered=new Promise(r=>{enter=r;});f.pool.query=()=>{enter();return new Promise(r=>{release=r;});};const pending=f.verifier.inspect();await entered;f.verifier.close();release({rows:[f.db]});assert.equal((await pending).ok,false);});
test('unsafe role label rejected before resources',()=>{const f=fixture();assert.throws(()=>create(f.profile,{},'role; DROP SCHEMA'),/Explicit validated/);});
