import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FORMAL_READING_PROGRAMME, loadFormalReadingCatalogue, loadFormalReadingLesson, loadFormalReadingModules } from './formal-programme-reading.mjs';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';
import { COURSE_SECTION_KEYS, COURSE_SECTION_CATALOG, createCourseSectionAuthorization } from './certification-course-sections.js';
import { academyCardPayload } from './academy-course-card-ui.mjs';
const prefix='cert:course:page:12345678-1234-1234-1234-123456789abc:';
const render=cursor=>renderStudentCoursePage({courseKey:FORMAL_READING_PROGRAMME.key,cursor,buttonId:value=>prefix+value});
function bounded(p){assert.equal(p.content,'');assert.equal(p.embeds.length,1);assert.ok(p.embeds[0].description.length<=3500);assert.match(p.embeds[0].footer.text,/No practical execution/);assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.components.length<=5);const ids=[];for(const row of p.components){assert.equal(row.type,1);assert.ok(row.components.length<=5);for(const b of row.components){assert.equal(b.type,2);assert.ok(b.custom_id.startsWith(prefix));assert.ok(b.custom_id.length<=100);assert.ok(b.label.length<=80);assert.equal(b.url,undefined);ids.push(b.custom_id);}}assert.equal(new Set(ids).size,ids.length);assert.equal(academyCardPayload(p).flags,32768);}
const buttons=p=>p.components.flatMap(row=>row.components);
test('one Ethical Hacking course home contains all named modules without code-only course entries',async()=>{
 assert.equal(FORMAL_READING_PROGRAMME.title,'Ethical Hacking');
 assert.equal(COURSE_SECTION_CATALOG.filter(item=>item.key===FORMAL_READING_PROGRAMME.key).length,1);
 assert.equal(COURSE_SECTION_CATALOG.find(item=>item.key===FORMAL_READING_PROGRAMME.key).title,'Ethical Hacking');
 const catalogue=await loadFormalReadingCatalogue(),modules=await loadFormalReadingModules(),home=await render('overview:0:0');bounded(home);
 assert.equal(home.embeds[0].title,'Ethical Hacking');assert.match(home.embeds[0].description,/One course/);
 assert.doesNotMatch(home.embeds[0].description,/EH-(LAB|LINUX|NET|WEB)-/);
 assert.deepEqual(modules.flatMap(group=>group.indices),catalogue.map((_,n)=>n));
 assert.equal(buttons(home).filter(b=>/^.*:overview:[1-9][0-9]*:0$/.test(b.custom_id)).length,modules.length);
 for(const b of buttons(home))assert.doesNotMatch(b.label,/EH-(LAB|LINUX|NET|WEB)-/);
 const destinations=[];
 for(let module=0;module<modules.length;module++)for(let page=0;page<Math.ceil(modules[module].indices.length/5);page++){
  const p=await render(`overview:${module+1}:${page}`);bounded(p);
  const lessons=buttons(p).filter(b=>b.custom_id.startsWith(prefix+'lesson:'));destinations.push(...lessons.map(b=>Number(b.custom_id.slice(prefix.length).split(':')[1])));
  assert.ok(lessons.every(b=>!/^EH-/.test(b.label)));
 }
 assert.deepEqual(destinations,catalogue.map((_,n)=>n));
});
test('all canonical formal lessons retain exact complete source chunks and bounded course views',async()=>{
 const catalogue=await loadFormalReadingCatalogue();assert.equal(catalogue.length,37);assert.ok(COURSE_SECTION_KEYS.includes(FORMAL_READING_PROGRAMME.key));
 bounded(await render('overview:0:0'));
 for(let page=1;page<=Math.ceil(catalogue.length/5);page++)bounded(await render(`overview:0:${page}`));
 for(let index=0;index<catalogue.length;index++){const lesson=await loadFormalReadingLesson(index);const raw=await readFile(new URL(`./docs/formal-ethical-hacking/lessons/${lesson.id}.md`,import.meta.url),'utf8');assert.equal(lesson.chunks.join(''),raw);bounded(await render(`module:${index}:0`));for(let page=0;page<lesson.chunks.length;page++){const p=await render(`lesson:${index}:${page}`);bounded(p);assert.ok(p.embeds[0].description.endsWith(lesson.chunks[page]));}}
});
test('formal reader rejects practical, grading, malformed and out-of-range views',async()=>{
 for(const cursor of ['lab:0:0','quiz:0:0','answer:0:0:a','overview:9999:0','overview:0:9999','overview:1:9999','module:9999:0','module:0:1','lesson:0:9999','lesson:../x:0'])await assert.rejects(render(cursor));
});
test('unified course delivery does not flip source publication flags or alter Community Learning registry',async()=>{
 const catalogue=JSON.parse(await readFile(new URL('./docs/formal-ethical-hacking/curriculum-catalogue.json',import.meta.url),'utf8'));assert.equal(catalogue.status,'draft-not-published');assert.equal(catalogue.runtimeIntegration,false);assert.equal(catalogue.publishable,false);
 const {COURSES}=await import('./course-registry.js');assert.ok(!COURSES.some(c=>c.key===FORMAL_READING_PROGRAMME.key));
});
test('formal access still requires an exact active course assignment and never writes records',async()=>{
 let calls=0;const pool={async query(sql,args){calls++;assert.ok(sql.startsWith('SELECT'));assert.match(sql,/JOIN certification_course_enrollments/);assert.equal(args[1],FORMAL_READING_PROGRAMME.key);return {rows:[]};}};
 const authorize=createCourseSectionAuthorization(pool,{enabled:true,ownerId:'100000000000000001'});assert.equal(await authorize('100000000000000002',FORMAL_READING_PROGRAMME.key),null);assert.equal(calls,1);
});
