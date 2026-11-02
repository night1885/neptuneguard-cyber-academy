import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createPinnedWebRehearsal,WEB_REHEARSAL_SNAPSHOT as pages,WEB_REHEARSAL_CONTENT_REVISION as revision} from './standalone-web-rehearsal-snapshot.mjs';
const actorId='11111111111111111',courseKey='standalone-web-review';
const request=(action='open',extra={})=>({actorId,courseKey,action,...extra});
async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'pinned-web-'));
  const f={root,grant:true,calls:[],rows:new Map(),writes:0,apps:[],texts:{}};
  for(const page of pages){const bytes=await readFile(new URL(page.path,import.meta.url));f.texts[page.key]=bytes.toString('utf8');const path=join(root,page.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);}
  f.config={enabled:true,reviewOnly:true,syntheticOnly:true,disposableReview:true,guildId:'22222222222222222',databaseName:'ng_web_review_synthetic',repositoryRoot:pathToFileURL(root+'/'),providerMs:1000,drainMs:1000};
  f.database={async query(text,values){
    f.calls.push({text,values});
    if(text.startsWith('SELECT current_database()'))return {rows:[{database_name:f.wrongDatabase?'unapproved':f.config.databaseName}]};
    const key=JSON.stringify(values.slice(0,4)),old=f.rows.get(key);
    if(text.startsWith('SELECT page_key'))return {rows:old?[{page_key:old.pageKey,revision:String(old.revision)}]:[]};
    if(text.startsWith('INSERT ')){if(old)return {rows:[]};f.rows.set(key,{pageKey:values[4],revision:1});f.writes++;if(f.loseResponse)throw Error('Synthetic post-commit loss');return {rows:[{revision:'1'}]};}
    if(text.startsWith('UPDATE ')){if(!old||old.revision!==values[5])return {rows:[]};f.rows.set(key,{pageKey:values[4],revision:old.revision+1});f.writes++;return {rows:[{revision:String(old.revision+1)}]};}
    throw Error('Unexpected scripted query');
  }};
  f.ports={authorize:async identity=>({...identity,allowed:f.grant}),database:f.database};
  f.make=(patch={},ports=f.ports)=>{const app=createPinnedWebRehearsal({...f.config,...patch},ports);f.apps.push(app);return app;};
  t.after(async()=>{for(const app of f.apps)await app.stop();await rm(root,{recursive:true,force:true});});return f;
}
test('default off never accesses providers',()=>{
  assert.deepEqual(createPinnedWebRehearsal({},new Proxy({},{get(){throw Error('unexpected provider');}})),{enabled:false});
});
test('fixed snapshot derives an immutable exact namespace',()=>{
  assert.equal(revision,'e51f04e41df9f7fa8cbbaf4da7266f3bbfbbc2b5ae4ccaeea14a1299737925c6');
  assert.ok(Object.isFrozen(pages)&&pages.every(Object.isFrozen));
  assert.deepEqual(pages.map(p=>p.key),['entry','http']);
  assert.equal(createHash('sha256').update(JSON.stringify({format:1,courseKey,pages})).digest('hex'),revision);
});
test('enabled profile requires synthetic disposable review and forbids revision override',async t=>{
  const f=await fixture(t);
  for(const patch of [{reviewOnly:false},{syntheticOnly:false},{disposableReview:false},{contentRevision:revision},{repositoryRoot:new URL('https://example.invalid/')},{databaseName:'production'}])assert.throws(()=>f.make(patch));
  assert.equal(f.calls.length,0);
});
test('actual pinned entry and HTTP bytes survive core composition',async t=>{
  const f=await fixture(t),app=f.make();assert.equal(app.contentRevision,revision);
  for(const pageKey of ['entry','http']){const r=await app.run(request('read',{pageKey}));assert.equal(r.outcome,'page');assert.equal(r.content,f.texts[pageKey]);const p=pages.find(p=>p.key===pageKey);assert.equal(createHash('sha256').update(r.content).digest('hex'),p.sha256);}
  assert.equal(f.calls.length,0);
});
test('save and resumed composition use the hash-derived SQL namespace',async t=>{
  const f=await fixture(t),first=f.make();assert.deepEqual(await first.run(request('save',{pageKey:'http',expectedRevision:0})),{outcome:'saved',revision:1});await first.stop();
  const next=f.make(),r=await next.run(request('resume'));assert.equal(r.content,f.texts.http);assert.equal(r.revision,1);
  for(const c of f.calls.filter(c=>!c.text.startsWith('SELECT current_database()')))assert.deepEqual(c.values.slice(0,4),[f.config.guildId,actorId,courseKey,revision]);
});
test('same-length source drift blocks both returning content and dispatching a save',async t=>{
  const f=await fixture(t),app=f.make(),p=pages.find(p=>p.key==='http');
  const text=f.texts.http.replace('Draft learner material.','Draft altered material.');assert.equal(Buffer.byteLength(text),p.bytes);await writeFile(join(f.root,p.path),text);
  assert.deepEqual(await app.run(request('read',{pageKey:'http'})),{outcome:'unavailable'});
  assert.deepEqual(await app.run(request('save',{pageKey:'http',expectedRevision:0})),{outcome:'unavailable'});assert.equal(f.calls.length,0);assert.equal(f.writes,0);
});
test('missing selected document fails closed without a database write',async t=>{
  const f=await fixture(t),app=f.make();await rm(join(f.root,pages[0].path));assert.deepEqual(await app.run(request()),{outcome:'unavailable'});assert.equal(f.writes,0);
});
test('a matching file outside the trusted root is not admitted through a symlink',async t=>{
  const f=await fixture(t),outside=await mkdtemp(join(tmpdir(),'outside-pinned-'));t.after(()=>rm(outside,{recursive:true,force:true}));
  const page=pages[0],path=join(f.root,page.path),target=join(outside,'entry.md');await writeFile(target,f.texts.entry);await rm(path);await symlink(target,path);
  assert.deepEqual(await f.make().run(request()),{outcome:'unavailable'});
});
test('revocation and foreign inputs do not access persistence',async t=>{
  const f=await fixture(t),app=f.make();f.grant=false;assert.deepEqual(await app.run(request('save',{pageKey:'entry',expectedRevision:0})),{outcome:'unavailable'});
  f.grant=true;for(const r of [request('read',{pageKey:'../staff'}),request('resume',{courseKey:'ethical-hacking'})])assert.deepEqual(await app.run(r),{outcome:'unavailable'});assert.equal(f.calls.length,0);
});
test('stale revision conflicts without overwriting the accepted bookmark',async t=>{
  const f=await fixture(t),app=f.make();await app.run(request('save',{pageKey:'entry',expectedRevision:0}));assert.deepEqual(await app.run(request('save',{pageKey:'http',expectedRevision:0})),{outcome:'conflict'});assert.equal(f.writes,1);assert.equal((await app.run(request('resume'))).pageKey,'entry');
});
test('a lost save response is not rollback or an automatic retry',async t=>{
  const f=await fixture(t),app=f.make();f.loseResponse=true;assert.deepEqual(await app.run(request('save',{pageKey:'http',expectedRevision:0})),{outcome:'unavailable'});assert.equal(f.writes,1);f.loseResponse=false;assert.equal((await app.run(request('resume'))).pageKey,'http');assert.equal(f.writes,1);
});
test('stop is idempotent and prevents subsequent work without closing borrowed storage',async t=>{
  const f=await fixture(t),app=f.make(),stop=app.stop();assert.strictEqual(app.stop(),stop);assert.deepEqual(await stop,{drained:true});assert.deepEqual(await app.run(request()),{outcome:'unavailable'});assert.equal(f.calls.length,0);
});
test('wrong actual database identity blocks the composed save',async t=>{
  const f=await fixture(t);f.wrongDatabase=true;assert.deepEqual(await f.make().run(request('save',{pageKey:'entry',expectedRevision:0})),{outcome:'unavailable'});assert.equal(f.writes,0);assert.equal(f.calls.length,1);
});
