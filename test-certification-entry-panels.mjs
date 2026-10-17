import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCertificationEntryPanels } from './certification-entry-panels.js';
import { createCertificationRouter } from './certification-admin-router.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const controls = payload => payload.components.flatMap(row => json(row).components);
function fixture() {
  const queries = [];
  const pool = { async query(sql, params) {
    assert.match(sql.trim(), /^SELECT\b/); queries.push({ sql, params });
    if (sql.includes('COUNT(*)')) return { rows: [{}] };
    if (sql.startsWith('SELECT status FROM certification_enrollments') || sql.startsWith('SELECT * FROM certification_enrollments')) {
      assert.deepEqual(params, [student]); return { rows: [] };
    }
    assert.fail(`Unexpected SQL: ${sql}`);
  }, connect() { assert.fail('Entry navigation must not write learner records'); } };
  const route = createCertificationRouter(pool, { enabled: true, ownerId: admin, enrollmentSubmissionEnabled: false }, guildId);
  async function click(customId, actor, server = guildId) {
    const replies = [];
    const interaction = { customId, user: { id: actor }, guildId: server, deferred: false, replied: false,
      isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
      async editReply(payload) { replies.push(payload); },
      async showModal() { assert.fail('Opening an entry panel cannot open a registration form automatically'); }
    };
    assert.equal(await route(interaction), true); assert.equal(replies.length, 1); return replies[0];
  }
  return { queries, click };
}
test('entry payloads use existing button routes without slash commands or identity collection', () => {
  const panels = buildCertificationEntryPanels();
  assert.deepEqual(controls(panels.admin).map(item => item.custom_id), ['cert:admin:overview:0']);
  assert.deepEqual(controls(panels.student).map(item => item.custom_id), ['cert:initial:home', 'cert:learner:home']);
  for (const panel of Object.values(panels)) {
    assert.deepEqual(panel.allowedMentions, { parse: [] });
    assert.ok(controls(panel).every(item => item.type === 2 && !item.disabled));
    assert.doesNotMatch(panel.content, /\/(?:start|catalog)\b|111111111111111111|222222222222222222/);
  }
});
test('admin entry button reaches original dashboard with registration and curriculum controls', async () => {
  const f = fixture(), panel = buildCertificationEntryPanels().admin;
  const result = await f.click(controls(panel)[0].custom_id, admin);
  assert.match(json(result.embeds[0]).title, /Admin Dashboard/);
  assert.ok(controls(result).some(item => item.custom_id === 'cert:register:open'));
  assert.ok(controls(result).find(item => item.custom_id === 'cert:admin:section').options.some(option => option.value === 'courses'));
  assert.ok(f.queries.length > 0);
});
for (const [actor, server] of [[student, guildId], [admin, null], [admin, student]]) {
  test(`admin entry rejects unauthorized actor/server ${actor}/${server}`, async () => {
    const f = fixture(), panel = buildCertificationEntryPanels().admin;
    const result = await f.click(controls(panel)[0].custom_id, actor, server);
    assert.match(result.content, /restricted to the configured admin and server/);
    assert.deepEqual(result.components, []); assert.deepEqual(result.embeds, []); assert.equal(f.queries.length, 0);
  });
}
test('student application entry opens own private console without granting access or enabling closed enrollment', async () => {
  const f = fixture(), panel = buildCertificationEntryPanels().student;
  const result = await f.click(controls(panel)[0].custom_id, student);
  assert.equal(result.embeds[0].title, 'NeptuneGuard — Initial student console');
  assert.equal(result.embeds[0].fields.find(field => field.name === 'Application status').value, 'Not registered');
  assert.equal(result.embeds[0].fields.find(field => field.name === 'Course access').value, 'Not available');
  assert.ok(controls(result).some(item => item.custom_id === 'cert:learner:home' && item.disabled));
  assert.ok(controls(result).some(item => item.custom_id === 'cert:submit:start' && item.disabled));
  assert.deepEqual(result.allowedMentions, { parse: [] }); assert.equal(f.queries.length, 2);
});
for (const server of [null, student]) {
  test(`student entry rejects incorrect server ${server} without querying learner records`, async () => {
    const f = fixture(), result = await f.click('cert:initial:home', student, server);
    assert.match(result.content, /configured server/); assert.equal(f.queries.length, 0);
  });
}
test('entry payload construction returns independent components for later publication', () => {
  const first = buildCertificationEntryPanels(), second = buildCertificationEntryPanels();
  first.admin.components[0].components[0].setDisabled(true);
  first.student.components[0].components[0].setDisabled(true);
  assert.equal(Boolean(controls(second.admin)[0].disabled), false);
  assert.equal(Boolean(controls(second.student)[0].disabled), false);
});
