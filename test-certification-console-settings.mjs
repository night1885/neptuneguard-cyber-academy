import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleSettings } from './certification-console-settings.js';
import { createCertificationRouter } from './certification-admin-router.js';

const owner = '1223123544301633567';
const guild = '1330353166830665859';
const config = { enabled: true, ownerId: owner, adminChannelId: '1339276399390887956', enrollmentSubmissionEnabled: false };
function fixture(overrides = {}) {
  const replies = [], deferrals = [];
  const interaction = { customId: 'cert:console:settings', user: { id: owner }, guildId: guild,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    async reply(payload) { replies.push(payload); },
    async deferReply(payload) { deferrals.push(payload); },
    async editReply(payload) { replies.push(payload); }, ...overrides };
  return { interaction, replies, deferrals };
}
test('configuration screen is private, read-only and excludes secrets', async () => {
  const f = fixture();
  const secret = 'NEVER-RENDER-THIS-SECRET';
  assert.equal(await handleConsoleSettings(f.interaction, { ...config, databaseUrl: secret, token: secret, comprehensionCheck: { version: 'v1', correctAnswers: [secret] } }, guild), true);
  assert.equal(f.deferrals[0].flags, 64);
  const payload = f.replies[0];
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.ok(!JSON.stringify(payload).includes(secret));
  assert.match(payload.embeds[0].description, /does not reload/);
  assert.match(payload.embeds[0].fields.find(x => x.name === 'New enrollment submissions').value, /Disabled/);
  assert.ok(payload.components[0].components.some(x => x.custom_id === 'cert:admin:overview:0'));
});
for (const scenario of [
  { label: 'non-owner', interaction: { user: { id: '1223123544301633568' } } },
  { label: 'wrong guild', interaction: { guildId: '1339276399390887956' } },
  { label: 'DM', interaction: { guildId: null } },
  { label: 'disabled certification', enabled: false }
]) {
  test(`configuration rejects ${scenario.label}`, async () => {
    const f = fixture(scenario.interaction);
    await handleConsoleSettings(f.interaction, { ...config, enabled: scenario.enabled ?? true }, guild);
    assert.equal(f.deferrals.length, 0);
    assert.equal(f.replies[0].flags, 64);
    assert.match(f.replies[0].content, /Owner authorization/);
    assert.equal(f.replies[0].embeds, undefined);
  });
}
test('unrelated buttons and non-button interactions are not consumed', async () => {
  for (const override of [{ customId: 'other:button' }, { isButton: () => false }]) {
    const f = fixture(override);
    assert.equal(await handleConsoleSettings(f.interaction, config, guild), false);
    assert.equal(f.replies.length, 0);
    assert.equal(f.deferrals.length, 0);
  }
});
test('router connects configuration without querying or mutating database', async () => {
  const pool = { query() { assert.fail('No configuration queries'); }, connect() { assert.fail('No configuration transactions'); } };
  const f = fixture();
  assert.equal(await createCertificationRouter(pool, config, guild)(f.interaction), true);
  assert.equal(f.replies.length, 1);
});
test('existing overview exposes configuration and respects component limits', async () => {
  const f = fixture({ customId: 'cert:admin:overview:0' });
  const pool = { async query() { return { rows: [{ pending_enrollments: '0', enrolled_students: '0', pending_labs: '0' }] }; } };
  await createCertificationRouter(pool, config, guild)(f.interaction);
  const rows = f.replies[0].components.map(row => row.toJSON());
  assert.ok(rows.length <= 5);
  assert.ok(rows.flatMap(row => row.components).some(x => x.custom_id === 'cert:console:settings'));
});
