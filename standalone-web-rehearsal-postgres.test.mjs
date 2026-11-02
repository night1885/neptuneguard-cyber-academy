import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebReviewPostgresStore} from './standalone-web-rehearsal-postgres.mjs';
const config={enabled:true,reviewOnly:true,syntheticOnly:true,disposableReview:true,guildId:'11111111111111111',contentRevision:'a'.repeat(64),databaseName:'ng_web_review_synthetic'};
const subject={actorId:'22222222222222222',courseKey:'standalone-web-review'};
function setup(rows=[], changes={}) {
  const calls=[];
  const database={query:async(text,values)=>{calls.push({text,values});return {rows:text.startsWith('SELECT current_database()')?[{database_name:config.databaseName}]:rows};}};
  return {calls,database,store:createWebReviewPostgresStore({...config,...changes},database)};
}
test('default off does not access database',()=>{
  assert.deepEqual(createWebReviewPostgresStore({},new Proxy({},{get(){throw Error();}})),{enabled:false});
});
test('profile rejects missing review and arbitrary database names',()=>{
  for(const change of [{reviewOnly:false},{syntheticOnly:false},{disposableReview:false},{databaseName:'production'},{contentRevision:'moving-head'},{guildId:'bad'}]) assert.throws(()=>createWebReviewPostgresStore({...config,...change},{query(){}}));
});
test('absent bookmark is null after database identity check',async()=>{
  const s=setup();assert.equal(await s.store.read(subject),null);assert.equal(s.calls.length,2);
  assert.match(s.calls[0].text,/current_database/);
  assert.deepEqual(s.calls[1].values,[config.guildId,subject.actorId,subject.courseKey,config.contentRevision]);
});
test('read decodes bounded PostgreSQL bigint representation',async()=>{
  const s=setup([{page_key:'http',revision:'7'}]);assert.deepEqual(await s.store.read(subject),{pageKey:'http',revision:7});
});
test('wrong course and actor fail before any query',async()=>{
  const s=setup();
  await assert.rejects(s.store.read({...subject,courseKey:'ethical-hacking'}));
  await assert.rejects(s.store.read({...subject,actorId:'bad'}));assert.equal(s.calls.length,0);
});
test('wrong actual database fails before data access',async()=>{
  const calls=[];const store=createWebReviewPostgresStore(config,{query:async text=>{calls.push(text);return {rows:[{database_name:'not_the_review_database'}]};}});
  await assert.rejects(store.compareAndSet(subject,0,'entry'),/^Error: Review progress unavailable$/);assert.equal(calls.length,1);
});
test('initial save binds identity and page without interpolation',async()=>{
  const s=setup([{revision:'1'}]);assert.deepEqual(await s.store.compareAndSet(subject,0,'entry'),{outcome:'saved',revision:1});
  assert.match(s.calls[1].text,/ON CONFLICT .* DO NOTHING RETURNING revision/);
  assert.deepEqual(s.calls[1].values,[config.guildId,subject.actorId,subject.courseKey,config.contentRevision,'entry']);
});
test('later save uses expected revision predicate and bound values',async()=>{
  const s=setup([{revision:'8'}]);assert.deepEqual(await s.store.compareAndSet(subject,7,'http'),{outcome:'saved',revision:8});
  assert.match(s.calls[1].text,/AND revision=\$6 RETURNING revision/);assert.equal(s.calls[1].values[5],7);
});
test('zero returned rows becomes conflict for insert and update',async()=>{
  const s=setup();for(const expected of [0,4]) assert.deepEqual(await s.store.compareAndSet(subject,expected,'entry'),{outcome:'conflict'});
});
test('malformed saved rows and revisions fail closed',async()=>{
  for(const rows of [[{page_key:'staff',revision:'1'}],[{page_key:'entry',revision:'1.5'}],[{page_key:'entry',revision:'9007199254740992'}],[{page_key:'entry',revision:1},{page_key:'http',revision:2}]]) await assert.rejects(setup(rows).store.read(subject));
  await assert.rejects(setup([{revision:'9'}]).store.compareAndSet(subject,1,'entry'));
});
test('invalid save input performs no query',async()=>{
  const s=setup();for(const r of [-1,true,'0',Number.MAX_SAFE_INTEGER]) await assert.rejects(s.store.compareAndSet(subject,r,'entry'));
  await assert.rejects(s.store.compareAndSet(subject,0,'../staff'));assert.equal(s.calls.length,0);
});
test('query errors are generic and never retried',async()=>{
  let calls=0;const store=createWebReviewPostgresStore(config,{query:async()=>{calls++;throw Error('fictional credential detail');}});
  await assert.rejects(store.read(subject),/^Error: Review progress unavailable$/);assert.equal(calls,1);
});
test('content snapshot and guild are bound namespace components',async()=>{
  const s=setup([], {guildId:'33333333333333333',contentRevision:'b'.repeat(64)});await s.store.read(subject);
  assert.equal(s.calls[1].values[0],'33333333333333333');assert.equal(s.calls[1].values[3],'b'.repeat(64));
});
