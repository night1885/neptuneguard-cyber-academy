import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FORMAL_READING_PROGRAMME, loadFormalReadingCatalogue, loadFormalReadingLesson } from './formal-programme-reading.mjs';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';
import { COURSE_SECTION_KEYS, createCourseSectionAuthorization } from './certification-course-sections.js';
import { academyCardPayload } from './academy-course-card-ui.mjs';
const prefix='cert:course:page:12345678-1234-1234-1234-123456789abc:';
const render=cursor=>renderStudentCoursePage({courseKey:FORMAL_READING_PROGRAMME.key,cursor,buttonId:value=>prefix+value});
function bounded(p){assert.equal(p.content,'');assert.equal(p.embeds.length,1);assert.ok(p.embeds[0].description.length<=3500);assert.match(p.embeds[0].footer.text,/No practical execution/);assert.deepEqual(p.allowedMentions,{parse:[]});assert.ok(p.components.length<=5);const ids=[];for(const row of p.components){assert.equal(row.type,1);assert.ok(row.components.length<=5);for(const b of row.components){assert.equal(b.type,2);assert.ok(b.custom_id.startsWith(prefix));assert.ok(b.custom_id.length<=100);assert.ok(b.label.length<=80);assert.equal(b.url,undefined);ids.push(b.custom_id);}}assert.equal(new Set(ids).size,ids.length);assert.equal(academyCardPayload(p).flags,32768);}
test('all canonical formal lessons render exact source chunks as bounded read-only pages',async()=>{
 const catalogue=await loadFormalReadingCatalogue();assert.equal(catalogue.length,37);assert.ok(COURSE_SECTION_KEYS.includes(FORMAL_READING_PROGRAMME.key));
 for(let page=0;page<Math.ceil(catalogue.length/5);page++)bounded(await render(`overview:0:${page}`));
 for(let index=0;index<catalogue.length;index++){const lesson=await loadFormalReadingLesson(index);const raw=await readFile(new URL(`./docs/formal-ethical-hacking/lessons/${lesson.id}.md`,import.meta.url),'utf8');assert.equal(lesson.chunks.join(''),raw);bounded(await render(`module:${index}:0`));for(let page=0;page<lesson.chunks.length;page++)bounded(await render(`lesson:${index}:${page}`));}
});
test('formal reader rejects practical, grading, malformed and out-of-range views',async()=>{
 for(const cursor of ['lab:0:0','quiz:0:0','answer:0:0:a','overview:1:0','overview:0:9999','module:9999:0','module:0:1','lesson:0:9999','lesson:../x:0'])await assert.rejects(render(cursor));
});
test('adding reading delivery does not flip source publication flags or alter Community Learning registry',async()=>{
 const catalogue=JSON.parse(await readFile(new URL('./docs/formal-ethical-hacking/curriculum-catalogue.json',import.meta.url),'utf8'));assert.equal(catalogue.status,'draft-not-published');assert.equal(catalogue.runtimeIntegration,false);assert.equal(catalogue.publishable,false);
 const {COURSES}=await import('./course-registry.js');assert.ok(!COURSES.some(c=>c.key===FORMAL_READING_PROGRAMME.key));
});
test('formal access still requires an exact active course assignment and never writes records',async()=>{
 let calls=0;const pool={async query(sql,args){calls++;assert.ok(sql.startsWith('SELECT'));assert.match(sql,/JOIN certification_course_enrollments/);assert.equal(args[1],FORMAL_READING_PROGRAMME.key);return {rows:[]};}};
 const authorize=createCourseSectionAuthorization(pool,{enabled:true,ownerId:'100000000000000001'});assert.equal(await authorize('100000000000000002',FORMAL_READING_PROGRAMME.key),null);assert.equal(calls,1);
});
