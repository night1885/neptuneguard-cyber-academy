import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileLessonReadings } from './source-readings.mjs';
import { createReadingCatalogueRenderer } from './reading-catalogue.mjs';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
function data(profile='./lab-linux-sources.json') {
  const manifest=load(profile);
  for(const e of manifest.entries) if(!/^EH-(LAB-0[0-5]|LINUX-0[1-5]|NET-0[12])$/.test(e.id)||e.path!==`lessons/${e.id}.md`)throw new Error('Unreviewed test source path');
  return {courseId:'formal-ethical-hacking',catalogue:load('../../curriculum-catalogue.json'),labels:load('./catalogue-labels.json'),manifest,
    sources:Object.fromEntries(manifest.entries.map(e=>[e.id,{path:e.path,text:readFileSync(new URL('../../'+e.path,import.meta.url),'utf8')}]))};
}
const ids=['EH-LINUX-01','EH-LINUX-02','EH-LINUX-03','EH-LINUX-04','EH-LINUX-05'];
const expected=[12,13,5,4,4];
const cases=[
['five exact Linux source IDs',()=>{assert.deepEqual(data().manifest.entries.map(e=>e.id),ids);}],
['all hashes and complete reconstruction',()=>{const d=data(),r=compileLessonReadings(d);for(const id of ids)assert.equal(r[id].map(p=>p.raw).join(''),d.sources[id].text);}],
['thirty-eight source reading pages',()=>{const r=compileLessonReadings(data());assert.deepEqual(ids.map(id=>r[id].length),expected);assert.equal(Object.values(r).flat().length,38);}],
['46678 pinned UTF-8 bytes',()=>{const d=data();assert.equal(Object.values(d.sources).reduce((n,s)=>n+Buffer.byteLength(s.text),0),46678);}],
['every raw fragment is displayed within limits',()=>{for(const p of Object.values(compileLessonReadings(data())).flat()){assert.ok(p.display.includes(p.raw));assert.ok(p.display.length<=1400);}}],
['actual fenced displays stay balanced',()=>{for(const p of Object.values(compileLessonReadings(data())).flat())assert.equal((p.display.match(/^```/gm)||[]).length%2,0);}],
['source lines stay whole',()=>{for(const p of Object.values(compileLessonReadings(data())).flat())assert.ok(p.raw.endsWith('\n'));}],
['lab scope and reporting limits retained in the companion profile',()=>{const r=compileLessonReadings(data('./foundation-sources.json'));for(const [id,text] of [['EH-LAB-03','Do not probe a public address, physical LAN device, host address or alternative guest to prove isolation.'],['EH-LAB-04','Other paths/ports/targets, credential testing, uploads, scanning and exploitation'],['EH-LAB-05','Do not crop away an error, remove a contradictory line']])assert.ok(r[id].map(p=>p.raw).join('').includes(text));}],
['Linux identity and process limits retained',()=>{const r=compileLessonReadings(data());for(const [id,text] of [['EH-LINUX-01','If you are root'],['EH-LINUX-02','No privilege escalation'],['EH-LINUX-03','No scanning, downloading'],['EH-LINUX-04','No sudo, service-manager'],['EH-LINUX-05','EH-NET-02']])assert.ok(r[id].map(p=>p.raw).join('').includes(text));}],
['entry three-lesson profile is current and valid',()=>{const d=data('./reading-sources.json'),r=compileLessonReadings(d);assert.deepEqual(Object.values(r).map(p=>p.length),[8,11,13]);const v=createReadingCatalogueRenderer(d);assert.equal(v.pageCount,79);}],
['Linux profile has 83 bounded views',()=>{const r=createReadingCatalogueRenderer(data());assert.deepEqual([r.readingLessonCount,r.readingPageCount,r.pageCount],[5,38,83]);}],
['all views use bounded existing card protocol',()=>{const r=createReadingCatalogueRenderer(data());for(let page=0;page<83;page++){const v=r.render({courseId:'formal-ethical-hacking',page});assert.equal(v.kind,'review-cards-v1');assert.ok(v.cards.length<=3);for(const c of v.cards){assert.ok(c.description.length<=1600);assert.ok(c.title.length<=80);}for(const target of Object.values(v.routes))assert.ok(target===null||Number.isInteger(target)&&target>=0&&target<83);}}],
['five readings and thirty-two explicit metadata bodies',()=>{const r=createReadingCatalogueRenderer(data()),seen=new Set();let metadata=0;for(let page=13;page<83;page++){const v=r.render({courseId:'formal-ethical-hacking',page}),m=/^Draft source reading - (EH-[A-Z0-9-]+) /.exec(v.heading);if(m)seen.add(m[1]);else{metadata++;assert.match(v.cards[0].description,/lesson body is not loaded/);}}assert.deepEqual([...seen].sort(),[...ids].sort());assert.equal(metadata,32);}],
['group Open targets reach the correct lesson',()=>{const d=data(),r=createReadingCatalogueRenderer(d);for(let group=0;group<13;group++)for(const c of r.render({courseId:d.courseId,page:group}).cards){const id=c.title.split(': ')[0],v=r.render({courseId:d.courseId,page:c.target});if(ids.includes(id))assert.ok(v.heading.includes(id+' 1/'));else assert.ok(v.cards[0].title.startsWith(id+':'));}}],
['reading routes stay in their lesson and Home group',()=>{const d=data(),r=createReadingCatalogueRenderer(d);for(let page=13;page<83;page++){const v=r.render({courseId:d.courseId,page}),m=/^Draft source reading - (EH-[A-Z0-9-]+) /.exec(v.heading);if(!m)continue;assert.equal(v.routes.home,Math.floor(d.catalogue.lessons.findIndex(l=>l.id===m[1])/3));for(const target of [v.routes.prev,v.routes.next])if(target!==null)assert.ok(r.render({courseId:d.courseId,page:target}).heading.includes(m[1]+' '));}}],
['every added snapshot detects changed source bytes',()=>{for(const id of ids){const d=data();d.sources[id].text+='CHANGED';assert.throws(()=>compileLessonReadings(d));}}],
['missing and extra source sets fail closed',()=>{const d=data();delete d.sources['EH-LINUX-01'];assert.throws(()=>compileLessonReadings(d));const x=data();x.sources.INSTRUCTOR={path:'answers.md',text:'PRIVATE'};assert.throws(()=>compileLessonReadings(x));}],
['wrong source path and review flags fail closed',()=>{const d=data();d.manifest.entries[3].path='../secret';assert.throws(()=>compileLessonReadings(d));for(const key of ['publishable','runtimeIntegration']){const x=data();x.manifest[key]=true;assert.throws(()=>compileLessonReadings(x));}}],
['no source-reading input mutation',()=>{const d=data(),before=JSON.stringify(d);createReadingCatalogueRenderer(d).render({courseId:d.courseId,page:13});assert.equal(JSON.stringify(d),before);}],
['foreign course and out-of-range cursors reject',()=>{const r=createReadingCatalogueRenderer(data());for(const q of [{courseId:'other',page:0},{courseId:'formal-ethical-hacking',page:83},{courseId:'formal-ethical-hacking',page:true}])assert.throws(()=>r.render(q));}]
];
for(const [name,run] of cases)test(name,run);
