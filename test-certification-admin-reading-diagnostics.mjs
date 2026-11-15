import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADMIN_READING_COURSES, handleAdminReadingCourse } from './certification-admin-reading-courses.mjs';
const secret = 'PRIVATE_TEACHING_TOKEN_SENTINEL';
const valid = ({ buttonId }) => ({ embeds: [{ title: 'Fixture', description: secret }], components: [{ type: 1, components: [{ type: 2, style: 2, label: 'Lesson', custom_id: buttonId('lesson:0:0') }] }] });
async function run(course, overrides = {}, failReply = false) {
  const replies = [], events = [];
  let attempted = false;
  const interaction = { async editReply(payload) {
    if (failReply && !attempted) { attempted = true; throw Object.assign(new Error(secret), { code: 50035, requestBody: { secret } }); }
    replies.push(payload);
  } };
  await handleAdminReadingCourse(interaction, { enabled: true }, 'guild', { index: 4, course, cursor: 'overview:0:0', canInspect: () => true, renderPage: valid, reportFailure: event => events.push(event), ...overrides });
  return { replies, events };
}
function failure(result, course, stage, code) {
  assert.equal(result.replies.length, 1);
  assert.equal(result.replies[0].embeds.length, 0);
  assert.match(result.replies[0].content, /could not be validated/);
  assert.deepEqual(result.events, [{ event: 'admin-reading-preview-failed', course: course.key, stage, code }]);
  assert.ok(!JSON.stringify(result).includes(secret));
}
for (const course of ADMIN_READING_COURSES) {
  test(`${course.key}: success preserves the teaching payload and emits no failure`, async () => {
    const result = await run(course);
    assert.equal(result.replies[0].embeds[0].description, secret);
    assert.deepEqual(result.events, []);
    assert.deepEqual(result.replies[0].allowedMentions, { parse: [] });
    assert.ok(result.replies[0].components.every(row => row.components.length <= 5));
  });
  test(`${course.key}: denied requests neither render nor emit diagnostics`, async () => {
    const result = await run(course, { canInspect: () => false, renderPage: () => { throw Error('must not render'); } });
    assert.match(result.replies[0].content, /not authorized/);
    assert.deepEqual(result.events, []);
  });
  test(`${course.key}: source errors expose only a known code and stage`, async () => {
    failure(await run(course, { renderPage: () => { throw Object.assign(new Error(secret), { code: 'ENOENT', path: secret, stack: secret }); } }), course, 'render-source', 'ENOENT');
  });
  test(`${course.key}: arbitrary error codes and bodies are not logged`, async () => {
    failure(await run(course, { renderPage: () => { throw Object.assign(new Error(secret), { code: secret }); } }), course, 'render-source', 'OTHER');
  });
  test(`${course.key}: invalid layouts fail closed with a bounded diagnostic`, async () => {
    failure(await run(course, { renderPage: () => ({ embeds: [], components: [] }) }), course, 'payload-validation', 'OTHER');
  });
  test(`${course.key}: Discord reply rejection is distinct from source failure`, async () => {
    failure(await run(course, {}, true), course, 'discord-reply', 50035);
  });
  test(`${course.key}: losing authorization after rendering withholds teaching text`, async () => {
    let allowed = true;
    failure(await run(course, { canInspect: () => allowed, renderPage: options => { allowed = false; return valid(options); } }), course, 'authorization-recheck', 'OTHER');
  });
  test(`${course.key}: diagnostic sink failure cannot suppress the safe response`, async () => {
    const result = await run(course, { renderPage: () => { throw Error(secret); }, reportFailure: () => { throw Error(secret); } });
    assert.equal(result.replies.length, 1);
    assert.equal(result.replies[0].embeds.length, 0);
    assert.ok(!JSON.stringify(result).includes(secret));
  });
}
test('missing lazy imports are identified without leaking dependency paths', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'reading-diagnostic-'));
  try {
    await copyFile(new URL('./certification-admin-reading-courses.mjs', import.meta.url), join(dir, 'preview.mjs'));
    const api = await import(pathToFileURL(join(dir, 'preview.mjs')).href), replies = [], events = [];
    const course = api.ADMIN_READING_COURSES[0];
    await api.handleAdminReadingCourse({ editReply: async payload => replies.push(payload) }, { enabled: true }, 'guild', {
      index: 4, course, cursor: 'overview:0:0', canInspect: () => true, reportFailure: event => events.push(event)
    });
    failure({ replies, events }, course, 'dependency-import', 'ERR_MODULE_NOT_FOUND');
    assert.ok(!JSON.stringify(events).includes(dir));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
