import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';

const owner = '1223123544301633567'; const learner = '1223123544301633568';
const guild = '1339276399390887957'; const otherGuild = '1339276399390887956';
const config = { enabled: true, ownerId: owner };
const actions = [
  ['overview', 'cert:admin:overview:0'], ['enrollment queue', 'cert:admin:enrollments:0'],
  ['lab queue', 'cert:admin:labs:0'], ['directory', 'cert:students:list:0'],
  ['student detail', `cert:students:detail:${learner}`], ['acknowledgment review', `cert:enrollment:review:${learner}`],
  ['approval', `cert:enrollment:approve:${learner}`], ['access button', `cert:access:suspend:${learner}`],
  ['access form', `cert:access:suspend:${learner}`, true],
  ['access confirmation', 'cert:access:confirm:00000000-0000-0000-0000-000000000000']
];
const contexts = [
  ['non-owner with administrator permissions', learner, guild, true],
  ['wrong server', owner, otherGuild, true], ['DM context', owner, null, true],
  ['disabled certification', owner, guild, false]
];
function fixture(customId, actor = owner, guildId = guild, modal = false) {
  const queries = []; const connects = []; const replies = []; const deferrals = []; const modals = []; let fieldReads = 0;
  const pool = { async query(sql, params) {
    queries.push({ sql, params });
    return { rows: sql.includes('COUNT(*)') ? [{ pending_enrollments: '0', enrolled_students: '0', pending_labs: '0' }] : [] };
  }, async connect() { connects.push(true); assert.fail('This fixture must not perform mutations'); } };
  const interaction = { customId, user: { id: actor }, guildId,
    memberPermissions: { has: () => true }, isButton: () => !modal, isModalSubmit: () => modal,
    fields: { getTextInputValue() { fieldReads++; return 'Fixture reason'; } },
    async deferReply(payload) { deferrals.push(payload); }, async reply(payload) { replies.push(payload); },
    async editReply(payload) { replies.push(payload); }, async showModal(payload) { modals.push(payload); },
    client: { users: { async fetch() { assert.fail('Denied/read-only routes must not send notifications'); } } } };
  return { pool, interaction, queries, connects, replies, deferrals, modals, get fieldReads() { return fieldReads; } };
}
for (const [label, id, modal = false] of actions) {
  for (const [context, actor, guildId, enabled] of contexts) {
    test(`${label}: ${context} is rejected before database access`, async () => {
      const f = fixture(id, actor, guildId, modal);
      const route = createCertificationRouter(f.pool, { ...config, enabled }, guild);
      assert.equal(await route(f.interaction), true);
      assert.equal(f.queries.length, 0); assert.equal(f.connects.length, 0);
      assert.equal(f.modals.length, 0); assert.equal(f.fieldReads, 0); assert.equal(f.replies.length, 1);
      if (id.startsWith('cert:access:')) {
        assert.equal(f.replies[0].content, 'Admin authorization in the configured server is required.');
      } else {
        assert.match(f.replies[0].content, /owner|restricted/i);
      }
      assert.equal(f.deferrals[0]?.flags ?? f.replies[0].flags, 64);
    });
  }
}
test('authorized owner directory lookup remains read-only and private', async () => {
  const f = fixture('cert:students:list:0'); await createCertificationRouter(f.pool, config, guild)(f.interaction);
  assert.equal(f.queries.length, 1); assert.ok(f.queries[0].sql.startsWith('SELECT'));
  assert.deepEqual(f.queries[0].params, [0]); assert.equal(f.connects.length, 0);
  assert.equal(f.deferrals[0].flags, 64); assert.deepEqual(f.replies[0].allowedMentions, { parse: [] });
});
test('authorized access button opens a form without changing records', async () => {
  const f = fixture(`cert:access:suspend:${learner}`); await createCertificationRouter(f.pool, config, guild)(f.interaction);
  assert.equal(f.modals.length, 1); assert.equal(f.queries.length, 0); assert.equal(f.connects.length, 0);
  assert.equal(f.fieldReads, 0);
});
test('owner overview describes connected enrollment review without promising lab or certificate grants', async () => {
  const f = fixture('cert:admin:overview:0'); await createCertificationRouter(f.pool, config, guild)(f.interaction);
  const description = f.replies[0].embeds[0].data.description;
  assert.match(description, /Review enrollment requests/); assert.match(description, /does not grant lab access or award a certificate/);
  assert.ok(!description.includes('approval actions are not connected yet'));
  assert.equal(f.queries.length, 1); assert.equal(f.connects.length, 0); assert.equal(f.deferrals[0].flags, 64);
});
