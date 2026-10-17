import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_SECTIONS, adminSectionTarget, buildAdminNavigation } from './certification-admin-navigation.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { consoleViewId } from './certification-console-presentation.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function fixture({ actor = admin, server = guildId, enabled = true, privateMessage = true } = {}) {
  const calls = [], replies = [], queries = [], panel = { payload: { content: 'Existing admin panel' }, flags: { has: flag => privateMessage && flag === 64 } };
  const pool = { async query(sql) { assert.match(sql, /^SELECT/); queries.push(sql); return { rows: [{}] }; }, connect() { assert.fail('Dashboard navigation must not write records'); } };
  const route = createCertificationRouter(pool, { enabled, ownerId: admin }, guildId);
  async function invoke(kind, value, values) {
    let updating = false;
    const i = { customId: kind === 'menu' ? 'cert:admin:section' : value, values: values ?? [value], user: { id: actor }, guildId: server, message: panel,
      isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'menu', isModalSubmit: () => false,
      async reply(payload) { assert.equal(payload.flags, 64); replies.push(payload); calls.push('reply'); },
      async deferReply(payload) { assert.equal(payload.flags, 64); calls.push('deferReply'); },
      async deferUpdate() { updating = true; calls.push('deferUpdate'); },
      async editReply(payload) { if (updating) panel.payload = payload; else replies.push(payload); calls.push('editReply'); }
    };
    assert.equal(await route(i), true);
  }
  return { invoke, panel, calls, replies, queries };
}
test('extended section builder includes Course Overview without removing existing sections', () => {
  const menu = buildAdminNavigation('courses', { includeCourses: true }).toJSON().components[0];
  assert.deepEqual(menu.options.map(option => option.value), [...ADMIN_SECTIONS.map(section => section.value), 'courses']);
  assert.deepEqual(menu.options.filter(option => option.default).map(option => option.value), ['courses']);
  assert.equal(adminSectionTarget('courses'), 'cert:admin:courses:0');
  assert.equal(consoleViewId({ customId: 'cert:admin:section', values: ['courses'], isStringSelectMenu: () => true }), 'cert:admin:courses:0');
});
test('main dashboard to curriculum and back preserves private panel and admin tools', async () => {
  const f = fixture();
  await f.invoke('button', 'cert:admin:overview:0');
  const menu = json(f.panel.payload.components[0]).components[0];
  assert.ok(menu.options.some(option => option.value === 'courses'));
  const controls = () => f.panel.payload.components.flatMap(row => json(row).components);
  assert.ok(controls().some(control => control.custom_id === 'cert:register:open'));
  assert.ok(controls().some(control => control.custom_id === 'cert:console:settings'));
  const reads = f.queries.length;
  await f.invoke('menu', 'courses');
  assert.match(json(f.panel.payload.embeds[0]).title, /Course Overview/); assert.equal(f.queries.length, reads);
  await f.invoke('button', 'cert:admin:courses:module:0:0:0');
  assert.ok(f.panel.payload.embeds.length); assert.equal(f.queries.length, reads);
  await f.invoke('button', 'cert:admin:overview:0');
  assert.ok(json(f.panel.payload.components[0]).components[0].options.some(option => option.value === 'courses'));
  assert.ok(controls().some(control => control.custom_id === 'cert:register:open'));
  assert.equal(f.replies.length, 0); assert.equal(f.calls.filter(call => call === 'deferUpdate').length, 4);
});
for (const context of [{ actor: student }, { server: null }, { server: student }, { enabled: false }]) {
  test(`Course Overview dropdown rejects unauthorized context ${JSON.stringify(context)}`, async () => {
    const f = fixture(context), original = f.panel.payload; await f.invoke('menu', 'courses');
    assert.equal(f.panel.payload, original); assert.equal(f.queries.length, 0);
    assert.deepEqual(f.calls, ['reply']); assert.match(f.replies[0].content, /Admin authorization/);
  });
}
test('public source opens curriculum privately instead of editing the public panel', async () => {
  const f = fixture({ privateMessage: false }), original = f.panel.payload; await f.invoke('menu', 'courses');
  assert.equal(f.panel.payload, original); assert.equal(f.queries.length, 0);
  assert.deepEqual(f.calls, ['deferReply', 'editReply']); assert.match(json(f.replies[0].embeds[0]).title, /Course Overview/);
});
for (const values of [[], ['courses', 'students'], ['__proto__']]) {
  test(`invalid course-section selection fails closed ${JSON.stringify(values)}`, async () => {
    const f = fixture(), original = f.panel.payload; await f.invoke('menu', 'courses', values);
    assert.equal(f.panel.payload, original); assert.equal(f.queries.length, 0);
    assert.deepEqual(f.calls, ['reply']); assert.match(f.replies[0].content, /Invalid dashboard section/);
  });
}
