import test from 'node:test';
import assert from 'node:assert/strict';
import { consoleViewId, styleConsolePayload, withConsolePresentation } from './certification-console-presentation.js';
const config = { enabled: true, ownerId: '1223123544301633567' };
const guild = '1339276399390887956';
function interaction(id, extra = {}) {
  const calls = [];
  return { customId: id, user: { id: config.ownerId }, guildId: guild,
    message: { flags: { has: flag => flag === 64 } },
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    deferReply: async options => calls.push(['reply', options]),
    deferUpdate: async () => calls.push(['update']),
    editReply: async payload => calls.push(['edit', payload]),
    calls, ...extra };
}
const route = async i => { await i.deferReply({ flags: 64 }); await i.editReply({ content: '', embeds: [{ title: 'View' }], components: [] }); return true; };
test('private read-only screens defer updates, not new replies', async () => {
  for (const id of ['cert:admin:overview:0', 'cert:admin:enrollments:0', 'cert:console:settings', 'cert:audit:0', 'cert:students:list:0', 'cert:students:detail:1223123544301633567', 'cert:student-audit:1223123544301633567:0', 'cert:dir:all:0:', 'cert:labview:pending:0', 'cert:labview:student:1223123544301633567:approved:0', 'cert:labview:detail:12345678-1234-1234-1234-123456789abc']) {
    const i = interaction(id); await withConsolePresentation(route, config, guild)(i);
    assert.deepEqual(i.calls.map(call => call[0]), ['update', 'edit'], id);
  }
});
test('dropdown uses the same message', async () => {
  const i = interaction('cert:admin:section', { isButton: () => false, isStringSelectMenu: () => true, values: ['students'] });
  await withConsolePresentation(route, config, guild)(i); assert.equal(i.calls[0][0], 'update');
});
test('search popup is unchanged and submission updates its source', async () => {
  const i = interaction('cert:dir:search'); let shown = false;
  i.showModal = async () => { shown = true; };
  await withConsolePresentation(async value => value.showModal({ title: 'Search' }), config, guild)(i);
  assert.equal(shown, true); assert.equal(i.calls.length, 0);
  const submit = interaction('cert:dir:search', { isButton: () => false, isModalSubmit: () => true, isFromMessage: () => true });
  await withConsolePresentation(route, config, guild)(submit); assert.equal(submit.calls[0][0], 'update');
});
test('public messages, missing source, and unlinked modals use private reply fallback', async () => {
  for (const extra of [{ message: undefined }, { message: { flags: { has: () => false } } }, { isButton: () => false, isModalSubmit: () => true, isFromMessage: () => false }]) {
    const i = interaction('cert:dir:search', extra); await withConsolePresentation(route, config, guild)(i);
    assert.deepEqual(i.calls[0], ['reply', { flags: 64 }]);
  }
});
test('unauthorized, disabled and other-server interactions are passed through unchanged', async () => {
  for (const [settings, extra] of [[config, { user: { id: 'other' } }], [config, { guildId: 'other' }], [{ ...config, enabled: false }, {}]]) {
    const i = interaction('cert:console:settings', extra);
    await withConsolePresentation(value => { assert.equal(value, i); }, settings, guild)(i);
  }
});
test('mutation, confirmation, learner and unknown routes are not adapted', async () => {
  for (const id of ['cert:enrollment:review:1223123544301633567', 'cert:enrollment:approve:1223123544301633567', 'cert:access:suspend:1223123544301633567', 'cert:submit:start', 'cert:labaction:approve:x', 'cert:unknown', 'cert:audit:invalid']) {
    const i = interaction(id); assert.equal(consoleViewId(i), null);
    await withConsolePresentation(value => assert.equal(value, i), config, guild)(i);
  }
});
test('colors preserve text, disabled controls and destructive styles without mutating builders', () => {
  const embed = { title: 'Lab records', description: 'Not provider-session status', footer: { text: 'Read-only' } };
  const components = [{ type: 1, components: [
    { type: 2, style: 2, custom_id: 'cert:admin:overview:0', label: 'Overview' },
    { type: 2, style: 2, custom_id: 'cert:labview:pending:0', label: 'Refresh', disabled: true },
    { type: 2, style: 4, custom_id: 'cert:access:revoke:x', label: 'Revoke' }
  ] }];
  const payload = { content: '', embeds: [{ toJSON: () => embed }], components: [{ toJSON: () => components[0] }], allowedMentions: { parse: [] } };
  const result = styleConsolePayload(payload, 'cert:labview:pending:0');
  assert.equal(result.embeds[0].color, 0xf1c40f); assert.equal(result.embeds[0].description, embed.description);
  assert.deepEqual(result.components[0].components.map(c => c.style), [1, 2, 4]);
  assert.equal(components[0].components[0].style, 2); assert.equal(embed.color, undefined);
  assert.deepEqual(result.allowedMentions, { parse: [] });
  assert.equal(styleConsolePayload({ embeds: [embed] }, 'cert:audit:0').embeds[0].color, 0x9b59b6);
});
