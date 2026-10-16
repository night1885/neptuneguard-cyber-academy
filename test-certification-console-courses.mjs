import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from './course-registry.js';
import { courseContentText, handleConsoleCourses } from './certification-console-courses.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { certificationDashboardEntry } from './certification-dashboard.js';
const owner = '1223123544301633567', student = '1223123544301633568', guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner };
async function render(id, options = {}) {
  const replies = [], deferrals = [];
  const pool = { query() { assert.fail('Course browsing must not read or mutate student records'); }, connect() { assert.fail('Course browsing must not open database transactions'); } };
  const interaction = { customId: id, user: { id: options.actor ?? owner }, guildId: options.guildId === undefined ? guild : options.guildId,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async deferReply(p) { deferrals.push(p); }, async reply(p) { replies.push(p); }, async editReply(p) { replies.push(p); } };
  const handled = await createCertificationRouter(pool, { ...config, ...options.config }, guild)(interaction);
  return { payload: replies.at(-1), deferrals, handled };
}
function controls(payload) { return payload.components.flatMap(r => r.toJSON().components); }
function validate(payload) {
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.ok(payload.components.length <= 5);
  for (const r of payload.components) { const items = r.toJSON().components; assert.ok(items.length <= 5); assert.ok(items.every(c => c.type === 2)); }
  const ids = controls(payload).map(c => c.custom_id); assert.equal(new Set(ids).size, ids.length);
  for (const embed of payload.embeds) { const e = embed.toJSON(); assert.ok((e.title || '').length <= 256); assert.ok((e.description || '').length <= 4096); assert.ok((e.fields || []).every(f => f.name.length <= 256 && f.value.length <= 1024)); }
}
test('dashboard entry uses Admin Dashboard branding', () => {
  const entry = certificationDashboardEntry(); assert.match(entry.content, /Admin Dashboard/); assert.equal(entry.components[0].toJSON().components[0].label, 'Open admin dashboard');
});
test('course overview lists the registered curriculum privately without database access', async () => {
  const result = await render('cert:admin:courses:0'); assert.equal(result.handled, true); assert.equal(result.deferrals[0].flags, 64); validate(result.payload);
  assert.match(result.payload.embeds[0].toJSON().description, new RegExp(`${COURSES.length} courses`));
  assert.ok(controls(result.payload).some(c => c.custom_id === 'cert:admin:courses:course:0:0'));
});
for (const options of [{ actor: student }, { guildId: null }, { guildId: '1339276399390887956' }, { config: { enabled: false } }, { config: { ownerId: undefined } }]) {
  test(`course preview rejects unauthorized context ${JSON.stringify(options)}`, async () => {
    const result = await render('cert:admin:courses:module:0:0:0', options); assert.equal(result.payload.embeds.length, 0); assert.match(result.payload.content, /Admin authorization/);
  });
}
test('all registered modules have navigable untruncated read-only teaching content', async () => {
  for (let ci = 0; ci < COURSES.length; ci++) {
    const course = COURSES[ci];
    for (let mp = 0; mp < Math.ceil(course.modules.length / 5); mp++) {
      const result = await render(`cert:admin:courses:course:${ci}:${mp}`); validate(result.payload);
      const moduleControls = controls(result.payload).filter(c => c.custom_id.startsWith(`cert:admin:courses:module:${ci}:`));
      assert.equal(moduleControls.length, Math.min(5, course.modules.length - mp * 5));
    }
    for (let mi = 0; mi < course.modules.length; mi++) {
      const expected = courseContentText(course.modules[mi]), pages = Math.max(1, Math.ceil(expected.length / 3500)); let actual = '';
      for (let page = 0; page < pages; page++) {
        const result = await render(`cert:admin:courses:module:${ci}:${mi}:${page}`); validate(result.payload);
        actual += result.payload.embeds[0].toJSON().description;
        assert.ok(controls(result.payload).some(c => c.label === 'Next content' && c.disabled === (page + 1 >= pages)));
      }
      assert.equal(actual, expected);
    }
  }
});
for (const id of ['cert:admin:courses:99999', 'cert:admin:courses:course:99999:0', 'cert:admin:courses:course:0:99999', 'cert:admin:courses:module:0:99999:0', 'cert:admin:courses:module:0:0:99999', 'cert:admin:courses:module:-1:0:0', 'cert:admin:courses:__proto__']) {
  test(`invalid curriculum route fails closed ${id}`, async () => { const result = await render(id); assert.equal(result.payload.embeds.length, 0); assert.match(result.payload.content, /Invalid course/); });
}
test('unrelated actions are not consumed', async () => {
  assert.equal(await handleConsoleCourses({ customId: 'cert:learner:home', isButton: () => true }, config, guild), false);
});
