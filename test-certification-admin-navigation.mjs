import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_SECTIONS, adminSectionTarget, buildAdminNavigation } from './certification-admin-navigation.js';
import { createCertificationRouter } from './certification-admin-router.js';

const owner = '1223123544301633567';
const student = '1223123544301633568';
const guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner };

function fixture({ value = 'overview', actor = owner, guildId = guild, customId = 'cert:admin:section', menu = true, values } = {}) {
  const queries = [], replies = [], deferrals = [];
  const row = { discord_user_id: student, student_id: 'NG-TEST-1', status: 'pending', agreement_version: 'test-v1', request_id: 'test-request', lab_key: 'test-lab' };
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      assert.match(sql, /^SELECT/);
      return { rows: sql.includes('COUNT(*)') ? [{ pending_enrollments: '1', enrolled_students: '0', pending_labs: '1' }] : [row] };
    },
    async connect() { assert.fail('Navigation must not mutate database records'); }
  };
  const interaction = {
    customId, values: values ?? [value], user: { id: actor }, guildId,
    isStringSelectMenu: () => menu, isButton: () => !menu, isModalSubmit: () => false,
    async reply(payload) { replies.push(payload); },
    async deferReply(payload) { deferrals.push(payload); },
    async editReply(payload) { replies.push(payload); },
    client: { users: { async fetch() { assert.fail('Navigation must not notify students'); } } }
  };
  return { pool, interaction, queries, replies, deferrals };
}

for (const section of ADMIN_SECTIONS) {
  test(`menu builder selects ${section.value}`, () => {
    const menu = buildAdminNavigation(section.value).toJSON().components[0];
    assert.equal(menu.type, 3);
    assert.equal(menu.custom_id, 'cert:admin:section');
    assert.equal(menu.options.length, 4);
    assert.deepEqual(menu.options.filter(option => option.default).map(option => option.value), [section.value]);
  });
  test(`owner dropdown routes ${section.value} privately without writes`, async () => {
    const f = fixture({ value: section.value });
    assert.equal(await createCertificationRouter(f.pool, config, guild)(f.interaction), true);
    assert.equal(f.queries.length, 1);
    assert.equal(f.deferrals[0].flags, 64);
    assert.equal(f.replies.length, 1);
    assert.deepEqual(f.replies[0].allowedMentions, { parse: [] });
    const menu = f.replies[0].components[0].toJSON().components[0];
    assert.equal(menu.type, 3);
    assert.equal(menu.options.find(option => option.default).value, section.value);
  });
}

for (const context of [
  { label: 'non-owner', actor: student },
  { label: 'wrong guild', guildId: '1339276399390887956' },
  { label: 'DM', guildId: null },
  { label: 'disabled', enabled: false }
]) {
  test(`dropdown rejects ${context.label} before database access`, async () => {
    const f = fixture(context);
    await createCertificationRouter(f.pool, { ...config, enabled: context.enabled ?? true }, guild)(f.interaction);
    assert.equal(f.queries.length, 0);
    assert.equal(f.deferrals.length, 0);
    assert.equal(f.replies[0].flags, 64);
    assert.match(f.replies[0].content, /Owner authorization/);
  });
}

for (const values of [[], ['overview', 'students'], ['invalid'], ['__proto__']]) {
  test(`invalid dropdown values ${JSON.stringify(values)} are rejected`, async () => {
    const f = fixture({ values });
    await createCertificationRouter(f.pool, config, guild)(f.interaction);
    assert.equal(f.queries.length, 0);
    assert.match(f.replies[0].content, /Invalid dashboard section/);
    assert.equal(f.replies[0].flags, 64);
  });
}

test('invalid builder sections are rejected and targets are allowlisted', () => {
  assert.throws(() => buildAdminNavigation('invalid'));
  assert.equal(adminSectionTarget('invalid'), null);
  assert.equal(adminSectionTarget('students'), 'cert:students:list:0');
  assert.equal(adminSectionTarget('overview'), 'cert:admin:overview:0');
});

test('enrollment navigation preserves review controls', async () => {
  const f = fixture({ value: 'enrollments' });
  await createCertificationRouter(f.pool, config, guild)(f.interaction);
  const components = f.replies[0].components.flatMap(row => row.toJSON().components);
  assert.ok(components.some(component => component.custom_id === `cert:enrollment:review:${student}`));
});

test('existing student detail remains accessible with navigation and access controls', async () => {
  const f = fixture({ menu: false, customId: `cert:students:detail:${student}` });
  await createCertificationRouter(f.pool, config, guild)(f.interaction);
  const components = f.replies[0].components.flatMap(row => row.toJSON().components);
  assert.ok(components.some(component => component.custom_id === 'cert:admin:section'));
  assert.ok(components.some(component => component.custom_id === `cert:access:deny:${student}`));
  assert.ok(components.some(component => component.custom_id === `cert:enrollment:review:${student}`));
});

test('legacy overview button remains supported', async () => {
  const f = fixture({ menu: false, customId: 'cert:admin:overview:0' });
  await createCertificationRouter(f.pool, config, guild)(f.interaction);
  assert.equal(f.queries.length, 1);
  assert.equal(f.replies[0].components[0].toJSON().components[0].type, 3);
});

test('unknown certification menus fail closed without database queries', async () => {
  const f = fixture({ customId: 'cert:unknown:menu' });
  await createCertificationRouter(f.pool, config, guild)(f.interaction);
  assert.equal(f.queries.length, 0);
  assert.equal(f.replies[0].flags, 64);
});

test('unrelated menus are not consumed', async () => {
  const f = fixture({ customId: 'other:menu' });
  assert.equal(await createCertificationRouter(f.pool, config, guild)(f.interaction), false);
  assert.equal(f.queries.length, 0);
  assert.equal(f.replies.length, 0);
});
