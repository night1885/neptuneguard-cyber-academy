import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWebRehearsalCore, createWebReviewLoader, WEB_REHEARSAL_KEY as key, WEB_REHEARSAL_PAGES as pages} from './standalone-web-rehearsal-core.mjs';
const actorId = '11111111111111111';
const config = {enabled:true, reviewOnly:true, syntheticOnly:true};
function setup() {
  const rows = new Map();
  let authorized = true;
  const identityKey = identity => identity.actorId + ':' + identity.courseKey;
  const ports = {
    authorize:async identity => ({...identity, allowed:authorized}),
    loadPage:async page => 'fictional ' + page,
    progress:{
      read:async identity => rows.get(identityKey(identity)) ?? null,
      compareAndSet:async (identity, revision, pageKey) => {
        const id = identityKey(identity), old = rows.get(id);
        if ((old?.revision ?? 0) !== revision) return {outcome:'conflict'};
        rows.set(id, {pageKey, revision:revision+1});
        return {outcome:'saved', revision:revision+1};
      }
    }
  };
  return {ports, rows, revoke:() => {authorized = false;}};
}
const request = (action, extra={}) => ({actorId, courseKey:key, action, ...extra});
test('disabled factory does not touch providers', () => {
  assert.deepEqual(createWebRehearsalCore({}, new Proxy({}, {get(){throw Error('touched');}})), {enabled:false});
});
test('explicit synthetic review and providers are required', () => {
  assert.throws(() => createWebRehearsalCore({enabled:true}));
  assert.throws(() => createWebRehearsalCore(config));
});
test('course and page input is closed before provider calls', async () => {
  const s=setup(); let calls=0; s.ports.authorize=async()=>{calls++;throw Error();};
  const app=createWebRehearsalCore(config,s.ports);
  for (const r of [request('read',{pageKey:'../staff'}),request('read',{pageKey:'entry',courseKey:'ethical-hacking'}),request('delete')]) assert.equal((await app.run(r)).outcome,'unavailable');
  assert.equal(calls,0);
});
test('open returns only a page, not enrollment or completion', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);
  assert.deepEqual(await app.run(request('open')),{outcome:'page',pageKey:'entry',revision:null,content:'fictional entry'});
  assert.equal(s.rows.size,0);
});
test('save and re-created core resume from supplied store', async () => {
  const s=setup(),first=createWebRehearsalCore(config,s.ports);
  assert.deepEqual(await first.run(request('save',{pageKey:'http',expectedRevision:0})),{outcome:'saved',revision:1});
  first.stop();
  assert.equal((await first.run(request('resume'))).outcome,'unavailable');
  const second=createWebRehearsalCore(config,s.ports);
  assert.deepEqual(await second.run(request('resume')),{outcome:'page',pageKey:'http',revision:1,content:'fictional http'});
});
test('stale saves conflict and do not overwrite newer bookmark', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);
  const result=await Promise.all(['entry','http'].map(pageKey=>app.run(request('save',{pageKey,expectedRevision:0}))));
  assert.deepEqual(result.map(r=>r.outcome).sort(),['conflict','saved']);
  assert.equal(s.rows.get(actorId+':'+key).revision,1);
});
test('bookmarks are actor-scoped', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);
  await app.run(request('save',{pageKey:'http',expectedRevision:0}));
  assert.equal((await app.run(request('resume',{actorId:'22222222222222222'}))).pageKey,'entry');
});
test('revoked access denies save and resume', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);s.revoke();
  assert.equal((await app.run(request('save',{pageKey:'entry',expectedRevision:0}))).outcome,'unavailable');
  assert.equal((await app.run(request('resume'))).outcome,'unavailable');
  assert.equal(s.rows.size,0);
});
test('revocation while loading suppresses content', async () => {
  const s=setup();s.ports.loadPage=async()=>{s.revoke();return 'fictional private';};
  assert.deepEqual(await createWebRehearsalCore(config,s.ports).run(request('open')),{outcome:'unavailable'});
});
test('authorization identity mismatch is denied', async () => {
  const s=setup();s.ports.authorize=async i=>({...i,courseKey:'ethical-hacking',allowed:true});
  assert.equal((await createWebRehearsalCore(config,s.ports).run(request('open'))).outcome,'unavailable');
});
test('provider rejection and corrupt saved page disclose nothing', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);
  s.rows.set(actorId+':'+key,{pageKey:'staff',revision:1});
  assert.deepEqual(await app.run(request('resume')),{outcome:'unavailable'});
  s.ports.progress.read=async()=>{throw Error('private diagnostic');};
  assert.deepEqual(await app.run(request('resume')),{outcome:'unavailable'});
});
test('invalid revisions do not write', async () => {
  const s=setup(),app=createWebRehearsalCore(config,s.ports);
  for(const expectedRevision of [-1,true,'0',Number.MAX_SAFE_INTEGER]) assert.equal((await app.run(request('save',{pageKey:'entry',expectedRevision}))).outcome,'unavailable');
  assert.equal(s.rows.size,0);
});
test('loader accepts only fixed learner paths', async () => {
  const root=await mkdtemp(join(tmpdir(),'web-review-'));
  try {
    for(const page of pages){const path=join(root,page.path);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,'fictional '+page.key);}
    const load=createWebReviewLoader({repositoryRoot:pathToFileURL(root+'/')});
    assert.equal(await load('entry'),'fictional entry');
    await assert.rejects(load('../staff'));
    await writeFile(join(root,pages[0].path),'x'.repeat(65537));
    await assert.rejects(load('entry'));
  } finally {await rm(root,{recursive:true,force:true});}
});
