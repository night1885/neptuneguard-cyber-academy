import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContentAdapter } from './content.mjs';
const bundle=JSON.parse(await readFile(new URL('./first-journey-reading.json',import.meta.url),'utf8'));
const K='formal-ethical-hacking';
const build=b=>createContentAdapter({courseId:K,bundle:b});
test('nine draft readings compile through the existing content adapter',()=>{assert.equal(build(bundle).pageCount,9);});
test('every rendered reading fits the navigator text limit and retains draft label',()=>{
 const a=build(bundle);for(let i=0;i<a.pageCount;i++){const text=a.render({courseId:K,page:i});assert.ok(text.length<=1800);assert.match(text,/Draft review - /);}
});
test('bundle remains unpublished detached learner reading only',()=>{
 assert.equal(bundle.publishable,false);assert.equal(bundle.runtimeIntegration,false);
 for(const p of bundle.pages)assert.deepEqual(Object.keys(p).sort(),['audience','id','kind','text','title']);
 assert.ok(bundle.pages.every(p=>p.audience==='learner'&&p.kind==='reading'));
});
test('fictional prompts are explicitly labelled and are not execution claims',()=>{
 const p=bundle.pages.find(p=>p.id==='fictional-scenarios');assert.match(p.text,/FICTIONAL ANALYSIS ONLY/);assert.match(p.text,/not executed evidence/);
});
test('foreign course invalid indices and extra request fields reject',()=>{
 const a=build(bundle);for(const r of [{courseId:'other',page:0},{courseId:K,page:-1},{courseId:K,page:9},{courseId:K,page:0.5},{courseId:K,page:0,actorId:'synthetic'}])assert.throws(()=>a.render(r));
});
test('instructor or submission fields cannot be added to the reading shape',()=>{
 for(const extra of [{answers:['synthetic']},{reviewerGuide:'synthetic'},{submissions:[]}])assert.throws(()=>build({...structuredClone(bundle),...extra}));
 const b=structuredClone(bundle);b.pages[0].expectedAnswer='synthetic';assert.throws(()=>build(b));
});
test('duplicate page IDs and oversized reading text reject',()=>{
 const a=structuredClone(bundle);a.pages[1].id=a.pages[0].id;assert.throws(()=>build(a));
 const b=structuredClone(bundle);b.pages[0].text='x'.repeat(1601);assert.throws(()=>build(b));
});
test('compiled readings do not change when the input bundle is edited later',()=>{
 const b=structuredClone(bundle),a=build(b),before=a.render({courseId:K,page:0});b.pages[0].text='changed';assert.equal(a.render({courseId:K,page:0}),before);
});
test('HTTP orientation retains the named exercise targets and permission disclaimer',()=>{
 const text=bundle.pages.find(p=>p.id==='bounded-http-observation').text;
 for(const phrase of ['GET / and HEAD /','TCP port 8000','192.0.2.10','192.0.2.20','NG-FOUNDATION','do not independently authorize a run'])assert.ok(text.includes(phrase));
});
