import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { splitReviewSource, compileLessonReadings } from './source-readings.mjs';
import { createReadingCatalogueRenderer } from './reading-catalogue.mjs';
import { createReadingReviewWorkspace } from './reading-workspace.mjs';
import { buildCardFrame } from './cards.mjs';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const K='formal-ethical-hacking', A='100000000000000001', B='100000000000000002', G='100000000000000003', C='100000000000000004', R='100000000000000005';
function data() {
  const manifest=load('./reading-sources.json');
  return {courseId:K,catalogue:load('../../curriculum-catalogue.json'),labels:load('./catalogue-labels.json'),manifest,
    sources:Object.fromEntries(manifest.entries.map(e=>[e.id,{path:e.path,text:readFileSync(new URL('../../'+e.path,import.meta.url),'utf8')}]))};
}
function setText(d,id,text) {
  d.sources[id].text=text; const bytes=Buffer.from(text),e=d.manifest.entries.find(e=>e.id===id);
  e.gitBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  e.sha256=createHash('sha256').update(bytes).digest('hex');
}
function harness() {
  const state={allowed:true,now:0,n:0},flags={has:bit=>bit===64};
  const control=createReadingReviewWorkspace({enabled:true,...data(),guildId:G,entryChannelId:C,verifiedRoleId:R,
    readMember:async()=>({id:A,guild:{id:G},roles:{cache:{has:()=>true}}}),
    readCourseGrant:async()=>state.allowed?{student_id:'SYNTHETIC',course_key:K}:null,
    clock:()=>state.now,makeToken:()=>(++state.n).toString(16).padStart(32,'0')});
  const interaction=(customId='fws:open',extra={})=>({customId,user:{id:A},guildId:G,channelId:C,message:{id:R,flags},calls:[],isButton:()=>true,
    async deferReply(p){this.deferred=true;this.ephemeral=p.flags===64;this.calls.push(['deferReply',p]);},async deferUpdate(){this.deferred=true;this.calls.push(['deferUpdate']);},
    async reply(p){this.calls.push(['reply',p]);},async editReply(p){this.last=p;this.calls.push(['editReply',p]);return this.message;},...extra});
  const move=async(i,action)=>{const id=i.last.components.flatMap(r=>r.components).find(b=>b.custom_id.endsWith(':'+action)).custom_id,n=interaction(id);await control.handle(n);return n;};
  return {state,control,interaction,move,async open(){const i=interaction();await control.handle(i);return i;}};
}
const cases=[
['actual source hashes compile three complete lessons',()=>{const d=data(),r=compileLessonReadings(d);assert.deepEqual(Object.values(r).map(p=>p.length),[6,4,4]);for(const id of Object.keys(r))assert.equal(r[id].map(p=>p.raw).join(''),d.sources[id].text);}],
['actual page displays contain every raw fragment within bounds',()=>{for(const pages of Object.values(compileLessonReadings(data())))for(const p of pages){assert.ok(p.display.includes(p.raw));assert.ok(p.display.length<=1400);}}],
['real scope/privacy/installation limits survive',()=>{const d=data(),r=compileLessonReadings(d);for(const [id,marker] of [['EH-LAB-00','No course activation'],['EH-LAB-01','approved privileges'],['EH-LAB-02','Do not quietly attach NAT']])assert.ok(r[id].map(p=>p.raw).join('').includes(marker));}],
['missing snapshot rejects instead of silently falling back',()=>{const d=data();delete d.sources['EH-LAB-00'];assert.throws(()=>compileLessonReadings(d));}],
['extra instructor snapshot is rejected',()=>{const d=data();d.sources.INSTRUCTOR={path:'instructor.md',text:'PRIVATE'};assert.throws(()=>compileLessonReadings(d));}],
['path traversal and external paths cannot become source entries',()=>{for(const path of ['../secret','https://example.invalid/x','authoring/answers.md']){const d=data();d.manifest.entries[0].path=path;assert.throws(()=>compileLessonReadings(d));}}],
['snapshot path must match manifest',()=>{const d=data();d.sources['EH-LAB-00'].path='lessons/EH-LAB-01.md';assert.throws(()=>compileLessonReadings(d));}],
['mutated bytes fail pinned identity checks',()=>{const d=data();d.sources['EH-LAB-00'].text+='CHANGED';assert.throws(()=>compileLessonReadings(d));}],
['Git and SHA-256 identities are independently required',()=>{for(const field of ['gitBlob','sha256']){const d=data();d.manifest.entries[0][field]='0'.repeat(field==='gitBlob'?40:64);assert.throws(()=>compileLessonReadings(d));}}],
['review flags/status/commit shape are mandatory',()=>{for(const patch of [{publishable:true},{runtimeIntegration:true},{status:'published'},{sourceCommit:'main'}]){const d=data();Object.assign(d.manifest,patch);assert.throws(()=>compileLessonReadings(d));}}],
['duplicate and unknown manifest IDs are rejected',()=>{const d=data();d.manifest.entries.push(d.manifest.entries[0]);assert.throws(()=>compileLessonReadings(d));const x=data();x.manifest.entries[0].id='INSTRUCTOR';assert.throws(()=>compileLessonReadings(x));}],
['source size, empty and binary markers reject',()=>{for(const text of ['', 'x'.repeat(32769), 'a\0b'])assert.throws(()=>splitReviewSource(text));}],
['long source/code lines reject without truncation',()=>{for(const text of ['x'.repeat(1201),'```sh\n'+'x'.repeat(1201)+'\n```\n'])assert.throws(()=>splitReviewSource(text));}],
['unclosed and unsupported fences reject',()=>{for(const text of ['```sh\nFICTIONAL\n','~~~sh\nFICTIONAL\n~~~\n','````sh\nFICTIONAL\n````\n'])assert.throws(()=>splitReviewSource(text));}],
['fenced lines stay whole across balanced display pages',()=>{const text='```sh\n'+('echo FICTIONAL\n'.repeat(200))+'```\n',p=splitReviewSource(text);assert.ok(p.length>1);assert.equal(p.map(x=>x.raw).join(''),text);for(const x of p){assert.equal((x.display.match(/^```/gm)||[]).length%2,0);assert.ok(x.display.length<=1400);}}],
['CRLF and Unicode source bytes are preserved',()=>{const text='Fictional café\r\n'+'Text\r\n'.repeat(400),p=splitReviewSource(text);assert.equal(p.map(x=>x.raw).join(''),text);}],
['renderer includes fourteen reading pages inside sixty-one views',()=>{const r=createReadingCatalogueRenderer(data());assert.deepEqual([r.readingLessonCount,r.readingPageCount,r.pageCount],[3,14,61]);for(let page=0;page<61;page++)buildCardFrame(r.render({courseId:K,page}),{pages:61});}],
['unimported lessons remain explicit metadata previews',()=>{const r=createReadingCatalogueRenderer(data()),v=r.render({courseId:K,page:27});assert.match(v.heading,/metadata/);assert.match(v.cards[0].description,/lesson body is not loaded/);}],
['renderer snapshots original IDs, source and labels',()=>{const d=data(),r=createReadingCatalogueRenderer(d);d.catalogue.lessons[0].id='MUTATED';d.labels['EH-LAB-00']='MUTATED';d.sources['EH-LAB-00'].text='MUTATED';assert.equal(JSON.stringify(r.render({courseId:K,page:13})).includes('MUTATED'),false);}],
['too many reading cursors are blocked, never truncated',()=>{const d=data();for(const id of Object.keys(d.sources))setText(d,id,('x'.repeat(500)+'\n').repeat(60));assert.throws(()=>createReadingCatalogueRenderer(d));}],
['foreign course and invalid source cursors reject',()=>{const r=createReadingCatalogueRenderer(data());for(const q of [{courseId:'other',page:0},{courseId:K,page:61},{courseId:K,page:true},{courseId:K,page:0,owner:A}])assert.throws(()=>r.render(q));}],
['composition defaults off without snapshots/readers',async()=>{const h=harness(),i=h.interaction();assert.equal(await createReadingReviewWorkspace().handle(i),false);assert.equal(i.calls.length,0);h.control.dispose();}],
['private Open Next and Home show actual source in place',async()=>{const h=harness(),home=await h.open();let i=await h.move(home,'open-13');assert.match(i.last.content,/EH-LAB-00 1\/6/);assert.ok(i.last.embeds[0].description.includes('Authorization and Computer Readiness'));assert.equal(i.calls[0][0],'deferUpdate');i=await h.move(i,'next');assert.match(i.last.content,/2\/6/);i=await h.move(i,'home');assert.match(i.last.content,/cards 1\/13/);assert.equal(i.calls.some(c=>c[0]==='reply'),false);h.control.dispose();}],
['end of a reading does not automatically enter the next gated lesson',async()=>{const h=harness();let i=await h.move(await h.open(),'open-13');for(let n=0;n<5;n++)i=await h.move(i,'next');assert.match(i.last.content,/6\/6/);assert.equal(i.last.components[0].components[2].disabled,true);h.control.dispose();}],
['foreign and stale reading controls reveal no source',async()=>{const h=harness(),home=await h.open(),id=home.last.components[1].components[0].custom_id,other=h.interaction(id,{user:{id:B}});await h.control.handle(other);assert.equal(other.calls.some(c=>c[1]?.embeds?.length),false);await h.move(home,'open-13');const stale=h.interaction(id);await h.control.handle(stale);assert.equal(stale.calls.some(c=>c[1]?.embeds?.length),false);h.control.dispose();}],
['revoked access clears source and media',async()=>{const h=harness(),i=await h.move(await h.open(),'open-13');h.state.allowed=false;const denied=await h.move(i,'next');assert.deepEqual(denied.last.embeds,[]);assert.deepEqual(denied.last.attachments,[]);assert.deepEqual(denied.last.components,[]);h.control.dispose();}],
['expiry requires entry-button re-entry, not a modal',async()=>{const h=harness(),i=await h.move(await h.open(),'open-13');h.state.now=600000;const stale=await h.move(i,'next');assert.equal(stale.calls.some(c=>c[1]?.embeds?.length),false);assert.match((await h.open()).last.content,/cards 1\/13/);h.control.dispose();}],
['missing assignment prevents any reading publication',async()=>{const h=harness();h.state.allowed=false;const i=await h.open();assert.deepEqual(i.last.embeds,[]);h.control.dispose();}]
];
for(const [name,run] of cases)test(name,run);
