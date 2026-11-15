import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
async function isolated(run, sources = null) {
  const dir = await mkdtemp(join(tmpdir(), 'admin-reading-isolation-'));
  try {
    await copyFile(new URL('./certification-admin-reading-courses.mjs', import.meta.url), join(dir, 'preview.mjs'));
    if (sources) for (const [name, text] of Object.entries(sources)) await writeFile(join(dir, name), text);
    await run(await import(pathToFileURL(join(dir, 'preview.mjs')).href));
  } finally { await rm(dir, { recursive: true, force: true }); }
}
const options = api => ({ index: 4, course: api.ADMIN_READING_COURSES[0], cursor: 'overview:0:0' });
const capture = () => { const replies = []; return { replies, async editReply(p) { replies.push(p); } }; };
test('metadata import and denial require no academy, renderer or database dependencies', async () => isolated(async api => {
  assert.deepEqual(api.ADMIN_READING_COURSES.map(c => c.key), ['ethical-hacking-reading', 'bug-bounty-reading']);
  for (const extra of [{}, { canInspect: () => false }]) {
    const i = capture(); await api.handleAdminReadingCourse(i, { enabled: true }, 'guild', { ...options(api), ...extra });
    assert.match(i.replies[0].content, /not authorized/); assert.equal(i.replies[0].embeds.length, 0);
  }
}));
test('authorized missing dependencies fail closed without exposing import errors', async () => isolated(async api => {
  const i = capture(); await api.handleAdminReadingCourse(i, { enabled: true }, 'guild', { ...options(api), canInspect: () => true });
  assert.equal(i.replies[0].embeds.length, 0); assert.match(i.replies[0].content, /could not be validated/);
  assert.ok(!JSON.stringify(i.replies).includes('ERR_MODULE_NOT_FOUND'));
}));
const source = registered => ({
  'certification-course-sections.js': `export const COURSE_SECTION_CATALOG=${JSON.stringify(registered ? [{ key: 'ethical-hacking-reading' }] : [])};`,
  'certification-student-course-renderer.js': "export function renderStudentCoursePage({buttonId}) { return {embeds:[{title:'Fixture',description:'Teaching text'}],components:[{type:1,components:[{type:2,style:2,label:'Lesson',custom_id:buttonId('lesson:0:0')}]}]}; }",
  'package.json': '{"type":"module"}'
});
test('authorized lazy loading requires the course to remain registered', async () => {
  for (const registered of [false, true]) await isolated(async api => {
    const i = capture(); await api.handleAdminReadingCourse(i, { enabled: true }, 'guild', { ...options(api), canInspect: () => true });
    assert.equal(i.replies[0].embeds.length, registered ? 1 : 0);
    if (registered) assert.equal(i.replies[0].embeds[0].description, 'Teaching text');
  }, source(registered));
});
test('authorization is rechecked after lazy dependency resolution', async () => isolated(async api => {
  let checks = 0; const i = capture();
  await api.handleAdminReadingCourse(i, { enabled: true }, 'guild', { ...options(api), canInspect: () => ++checks === 1 });
  assert.equal(i.replies[0].embeds.length, 0); assert.ok(checks >= 2);
}, source(true)));
