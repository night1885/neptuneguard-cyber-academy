import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReviewCourseAuthorization} from './formal-review-course-authorization.mjs';
const guildId='100000000000000001',ownerId='100000000000000002';
function fixture(schemas){
 let cast=false;
 const adapter=createFormalReviewCourseAuthorization({enabled:true,guildId,ownerId,expectedDatabase:'formal_review_test',expectedLogin:'formal_reader',isReady:()=>true,config:{enabled:true,ownerId,activeAgreementVersion:'v1',activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'c1'}},readPool:{async query(sql){cast=sql.includes('current_schemas(false)::text[] AS schemas');return {rows:[{database:'formal_review_test',login:'formal_reader',direct:true,restricted:true,schemas:schemas===undefined?(cast?['public']:'{public}'):schemas,statement_ms:'2000',no_create:true,reads:true,no_writes:true}]};}},createLifecycle:async()=>({getCourseAuthorization:async()=>null})});
 return {adapter,cast:()=>cast};
}
test('readiness requests text-array schema evidence rather than relying on name-array decoding',async()=>{const f=fixture();try{assert.deepEqual(await f.adapter.initialize(),{ready:true});assert.equal(f.cast(),true);}finally{f.adapter.dispose();await f.adapter.drain();}});
for(const schemas of ['{public}',null,[],['pg_temp','public'],['private','public'],['public','pg_catalog']])test('readiness refuses non-array or unreviewed schema evidence '+JSON.stringify(schemas),async()=>{const f=fixture(schemas);try{await assert.rejects(f.adapter.initialize(),/authorization unavailable/);assert.equal(f.adapter.ready,false);}finally{f.adapter.dispose();await f.adapter.drain();}});
for(const schemas of [['public'],['pg_catalog','public']])test('reviewed schema arrays remain accepted '+schemas.join(','),async()=>{const f=fixture(schemas);try{assert.deepEqual(await f.adapter.initialize(),{ready:true});}finally{f.adapter.dispose();await f.adapter.drain();}});
