import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '111111111111111111', student = '222222222222222222', guild = '333333333333333333';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => payload.components.flatMap(row => json(row).components);
function fixture() {
  const replies = [], modals = [], queries = [];
  const people = Array.from({ length: 6 }, (_, index) => ({ discord_user_id: String(BigInt(student) + BigInt(index)), status: 'pending', agreement_version: 'fixture-v1', signature_method: 'discord_account' }));
  const pool = { async query(sql, values) {
    assert.match(sql, /^SELECT/); queries.push({ sql, values });
    return { rows: sql.includes('COUNT(*)') ? [{ total_students: '6', pending_enrollments: '6' }] : people };
  }, connect() { assert.fail('Opening navigation or registration form must not write'); } };
  const route = createCertificationRouter(pool, { enabled: true, ownerId: owner, enrollmentSubmissionEnabled: false }, guild);
  async function run(id, options = {}) {
    const menu = options.section !== undefined;
    const i = { customId: id, user: { id: options.actor || owner }, guildId: options.guildId === undefined ? guild : options.guildId, values: menu ? [options.section] : [],
      message: { flags: { has: flag => flag === 64 } }, isButton: () => !menu, isModalSubmit: () => false, isStringSelectMenu: () => menu,
      async deferReply(p) { assert.equal(p.flags, 64); }, async deferUpdate() {},
      async reply(p) { assert.equal(p.flags, 64); replies.push(p); }, async editReply(p) { replies.push(p); },
      async showModal(p) { modals.push(json(p)); } };
    assert.equal(await route(i), true); return replies.at(-1);
  }
  return { run, queries, replies, modals, people };
}
function validate(payload) {
  assert.ok(payload.components.length <= 5);
  for (const row of payload.components) {
    const items = json(row).components; assert.ok(items.length <= 5);
    if (items.some(item => item.type === 3)) { assert.equal(items.length, 1); assert.ok(items[0].options.length <= 25); }
    else assert.ok(items.every(item => item.type === 2));
  }
  const ids = controls(payload).map(item => item.custom_id); assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(id => id.length <= 100));
  assert.deepEqual(payload.allowedMentions, { parse: [] });
}
test('full enrollment queue retains registration and course overview at the five-row limit', async () => {
  const f = fixture(), payload = await f.run('cert:admin:enrollments:0'); validate(payload);
  assert.equal(payload.components.length, 5);
  const items = controls(payload);
  assert.equal(items.filter(item => item.custom_id.startsWith('cert:enrollment:review:')).length, 5);
  assert.ok(items.some(item => item.custom_id === 'cert:admin:courses:0'));
  assert.ok(items.some(item => item.custom_id === 'cert:register:open' && item.disabled !== true));
  assert.equal(items.find(item => item.label === 'Next').disabled, false);
  const utilities = payload.components.map(json).find(row => row.components.some(item => item.custom_id === 'cert:register:open'));
  assert.equal(utilities.components.length, 5); assert.equal(f.queries.length, 1);
});
test('section-menu enrollment view also retains every review control and registration shortcut', async () => {
  const f = fixture(), payload = await f.run('cert:admin:section', { section: 'enrollments' }); validate(payload);
  for (const person of f.people.slice(0, 5)) assert.ok(controls(payload).some(item => item.custom_id === `cert:enrollment:review:${person.discord_user_id}`));
  assert.ok(controls(payload).some(item => item.custom_id === 'cert:register:open'));
});
test('overview remains reachable from the full queue and exposes registration without writes', async () => {
  const f = fixture(), queue = await f.run('cert:admin:enrollments:0');
  const menu = controls(queue).find(item => item.custom_id === 'cert:admin:section'); assert.ok(menu.options.some(option => option.value === 'overview'));
  const overview = await f.run('cert:admin:section', { section: 'overview' }); validate(overview);
  assert.ok(controls(overview).some(item => item.custom_id === 'cert:register:open'));
  assert.match(json(overview.embeds[0]).title, /Admin Dashboard/); assert.equal(f.queries.length, 2);
});
test('registration shortcut opens its modal without creating a student or querying again', async () => {
  const f = fixture(), payload = await f.run('cert:admin:enrollments:0');
  const shortcut = controls(payload).find(item => item.custom_id === 'cert:register:open');
  const count = f.queries.length; await f.run(shortcut.custom_id);
  assert.equal(f.queries.length, count); assert.equal(f.modals.length, 1); assert.equal(f.modals[0].custom_id, 'cert:register:submit');
});
for (const options of [{ actor: student }, { guildId: null }, { guildId: '444444444444444444' }]) {
  test(`registration shortcut still rejects unauthorized context ${JSON.stringify(options)}`, async () => {
    const f = fixture(); await f.run('cert:register:open', options); assert.equal(f.queries.length, 0); assert.equal(f.modals.length, 0); assert.equal(f.replies[0].flags, 64);
  });
}
