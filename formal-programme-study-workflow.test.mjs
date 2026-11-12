import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { formalStudyGuidance } from './formal-programme-study-workflow.mjs';
import { loadFormalReadingLesson, renderFormalReadingPage } from './formal-programme-reading.mjs';
const ids='EH-LAB-00 EH-LAB-01 EH-LAB-02 EH-LINUX-01 EH-LINUX-02 EH-LINUX-03 EH-LAB-03 EH-LAB-04 EH-LAB-05 EH-NET-01 EH-NET-02 EH-NET-03 EH-NET-CAPSTONE EH-WEB-01 EH-WEB-02 EH-WEB-03 EH-TLS-01 EH-TLS-02 EH-WEB-CAPSTONE EH-WEB-04 EH-WEB-05 EH-WEB-06 EH-WEB-PRACTICAL-CAPSTONE EH-WEB-07 EH-WEB-08 EH-WEB-09 EH-ASSESS-01 EH-ASSESS-02 EH-ASSESS-03 EH-ASSESS-04 EH-EVIDENCE-01 EH-EVIDENCE-02 EH-MODEL-01 EH-MODEL-02 EH-LINUX-04 EH-LINUX-05 EH-AUTO-01'.split(' ');
const prefix='cert:course:page:12345678-1234-1234-1234-123456789abc:';
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'eh-study-synthetic-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const dir=join(root,'docs/formal-ethical-hacking');await mkdir(join(dir,'lessons'),{recursive:true});
 const catalogue={schemaVersion:1,status:'draft-not-published',runtimeIntegration:false,publishable:false,labDelivery:'student-built',lessons:ids.map(id=>({id,requires:[]}))};
 await writeFile(join(dir,'curriculum-catalogue.json'),JSON.stringify(catalogue));
 for(const id of ids)await writeFile(join(dir,'lessons',id+'.md'),`# ${id} — Synthetic lesson\n\n`+'Synthetic source line.\n'.repeat(170));
 const options={repositoryRoot:pathToFileURL(root+'/')};
 return {root,dir,render:cursor=>renderFormalReadingPage({courseKey:'ethical-hacking-reading',cursor,buttonId:s=>prefix+s},options),options};
}
function bounded(p){
 assert.equal(p.content,'');assert.equal(p.embeds.length,1);assert.ok(p.embeds[0].description.length<=3500);assert.match(p.embeds[0].footer.text,/No practical execution/);assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.components.length<=5);
 const ids=[];for(const row of p.components){assert.equal(row.type,1);assert.ok(row.components.length<=5);for(const b of row.components){assert.equal(b.type,2);assert.equal(b.url,undefined);assert.ok(b.custom_id.length<=100);assert.ok(b.custom_id.startsWith(prefix));ids.push(b.custom_id);}}assert.equal(new Set(ids).size,ids.length);
}
async function snapshot(root){const result={};for(const e of await readdir(root,{withFileTypes:true})){const path=join(root,e.name);if(e.isDirectory())result[e.name]=await snapshot(path);else result[e.name]=createHash('sha256').update(await readFile(path)).digest('hex');}return result;}
test('guidance is static deterministic bounded text without submitted answers',()=>{for(const page of [1,2]){const text=formalStudyGuidance(page);assert.equal(text,formalStudyGuidance(page));assert.ok(text.length<2400);assert.ok(text.includes('\n\n'));assert.doesNotMatch(text,/\\n/);}assert.match(formalStudyGuidance(1),/activates no practical/);assert.match(formalStudyGuidance(2),/not a claim that Discord/);});
test('guidance rejects unsupported page shapes',()=>{for(const page of [0,3,-1,'1',1.1,NaN,true,null,undefined,{},[]])assert.throws(()=>formalStudyGuidance(page));});
test('all 37 synthetic lesson positions expose two bounded static guidance pages',async t=>{const f=await fixture(t);assert.equal(ids.length,37);for(let index=0;index<37;index++){for(const page of [0,1,2]){const p=await f.render(`module:${index}:${page}`);bounded(p);assert.ok(p.components.flatMap(r=>r.components).some(b=>b.custom_id===prefix+`module:${index}:1`));assert.ok(p.components.flatMap(r=>r.components).some(b=>b.custom_id===prefix+`module:${index}:2`));}}});
test('source text and chunk reconstruction remain unchanged in synthetic lessons',async t=>{const f=await fixture(t);for(let index=0;index<37;index++){const lesson=await loadFormalReadingLesson(index,f.options);assert.equal(lesson.chunks.join(''),await readFile(join(f.dir,'lessons',ids[index]+'.md'),'utf8'));for(let page=0;page<lesson.chunks.length;page++){const p=await f.render(`lesson:${index}:${page}`);bounded(p);assert.ok(p.embeds[0].description.endsWith(lesson.chunks[page]));}}});
test('guidance rendering does not create or modify fixture files',async t=>{const f=await fixture(t),before=await snapshot(f.root);for(let i=0;i<37;i++)for(const page of [1,2])await f.render(`module:${i}:${page}`);assert.deepEqual(await snapshot(f.root),before);});
test('practical grading and malformed routes remain rejected',async t=>{const f=await fixture(t);for(const cursor of ['lab:0:0','quiz:0:0','answer:0:0:a','module:0:3','module:37:1','module:-1:1','module:0:1:answer','module:../x:1','lesson:0:9999'])await assert.rejects(f.render(cursor));});
test('foreign course and unbounded control IDs reject',async t=>{const f=await fixture(t);await assert.rejects(renderFormalReadingPage({courseKey:'other',cursor:'module:0:1',buttonId:s=>prefix+s},f.options));await assert.rejects(renderFormalReadingPage({courseKey:'ethical-hacking-reading',cursor:'module:0:1',buttonId:()=> 'x'.repeat(101)},f.options));});
test('guidance module has no persistence network or identity dependencies',async()=>{const source=await readFile(new URL('./formal-programme-study-workflow.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/\bimport\b|\brequire\s*\(|\bfetch\s*\(|writeFile|localStorage|sessionStorage|console\.|process\.|Date\.|randomUUID/);});
