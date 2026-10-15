import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';

const owner = '100000000000000001';
const student = '100000000000000002';
const guild = '100000000000000003';
const config = { enabled: true, ownerId: owner };
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const people = Array.from({ length: 6 }, (_, i) => ({
  discord_user_id: String(BigInt(student) + BigInt(i)), student_id: `NG-FIXTURE-${i + 1}`,
  status: 'pending', agreement_version: 'fixture-v1', signature_method: 'discord_account'
}));
const labRows = status => people.map((person, i) => ({
  request_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  discord_user_id: person.discord_user_id, lab_key: 'fixture-lab', status: status === 'all' ? 'pending' : status
}));
const events = people.map((person, i) => ({ event_id: String(i + 1), actor_discord_user_id: owner,
  subject_discord_user_id: person.discord_user_id, action: 'fixture_view', created_at: new Date('2026-01-01T00:00:00Z') }));

function fixture(responses, settings = config) {
  const queries = [], queue = [...responses];
  const message = { id: 'synthetic-dashboard', flags: { has: flag => flag === 64 }, payload: null };
  const pool = {
    async query(sql, params) {
      assert.match(sql.trim(), /^SELECT\b/i, 'Navigation may only SELECT');
      queries.push({ sql, params });
      assert.ok(queue.length, 'Unexpected database query');
      return { rows: queue.shift() };
    },
    async connect() { assert.fail('Navigation must not open a write transaction'); }
  };
  const route = createCertificationRouter(pool, settings, guild);
  return { queries, message, queue, async run(id, options = {}) {
    const calls = []; let payload, updating = false;
    const kind = options.kind || 'button';
    const interaction = {
      customId: id, message, user: { id: options.actor || owner }, guildId: options.guildId === undefined ? guild : options.guildId,
      values: options.values || [], fields: { getTextInputValue: key => options.inputs?.[key] || '' },
      isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal',
      isStringSelectMenu: () => kind === 'menu', isFromMessage: () => true,
      async deferUpdate() { calls.push('update'); updating = true; },
      async deferReply(value) { calls.push('deferReply'); assert.equal(value.flags, 64); },
      async reply(value) { calls.push('reply'); payload = value; },
      async editReply(value) { calls.push('edit'); payload = value; if (updating) message.payload = value; },
      async showModal(value) { calls.push('modal'); payload = value; },
      client: { users: { async fetch() { assert.fail('Navigation must not notify learners'); } } }
    };
    assert.equal(await route(interaction), true);
    return { calls, payload };
  } };
}

function controls(payload) { return (payload.components || []).flatMap(row => json(row).components); }
function checkView(result, f) {
  assert.deepEqual(result.calls, ['update', 'edit']);
  assert.equal(f.message.payload, result.payload);
  assert.deepEqual(result.payload.allowedMentions, { parse: [] });
  const rows = result.payload.components || [], items = controls(result.payload);
  assert.ok(rows.length <= 5);
  assert.ok(rows.every(row => json(row).components.length <= 5));
  assert.ok(items.every(item => item.custom_id && item.custom_id.length <= 100));
  assert.equal(new Set(items.map(item => item.custom_id)).size, items.length);
}

test('populated directory next and previous replace one private dashboard', async () => {
  const f = fixture([people, people.slice(5), people]);
  const first = await f.run('cert:dir:all:0:'); checkView(first, f);
  assert.equal(json(first.payload.embeds[0]).fields.length, 5);
  assert.equal(controls(first.payload).find(item => item.label === 'Next').disabled, false);
  const second = await f.run('cert:dir:all:1:'); checkView(second, f);
  assert.equal(json(second.payload.embeds[0]).fields.length, 1);
  assert.equal(controls(second.payload).find(item => item.label === 'Next').disabled, true);
  assert.equal(controls(second.payload).find(item => item.label === 'Previous').disabled, false);
  checkView(await f.run('cert:dir:all:0:'), f);
  assert.deepEqual(f.queries.map(query => query.params), [['all', '', 0], ['all', '', 5], ['all', '', 0]]);
});

test('populated dropdown directory and configuration preserve real builder integration', async () => {
  const f = fixture([people]);
  const directory = await f.run('cert:admin:section', { kind: 'menu', values: ['students'] });
  checkView(directory, f);
  assert.equal(json(directory.payload.components[0]).components[0].type, 3);
  assert.equal(typeof directory.payload.components[0].toJSON, 'function');
  const settings = await f.run('cert:console:settings'); checkView(settings, f);
  assert.equal(controls(settings.payload).find(item => item.label === 'Overview').style, 1);
});

test('search popup stays a popup and populated submission replaces its source', async () => {
  const f = fixture([[{ ...people[0], status: 'approved' }]]);
  const popup = await f.run('cert:dir:search'); assert.deepEqual(popup.calls, ['modal']);
  assert.equal(f.message.payload, null); assert.equal(f.queries.length, 0);
  const result = await f.run('cert:dir:search', { kind: 'modal', inputs: { query: student, status: 'approved' } });
  checkView(result, f);
  assert.deepEqual(f.queries[0].params, ['approved', student, 0]);
  assert.equal(json(result.payload.embeds[0]).fields.length, 1);
});

for (const scoped of [false, true]) {
  for (const status of ['all', 'pending', 'approved', 'denied', 'suspended', 'revoked', 'expired']) {
    test(`populated ${scoped ? 'student' : 'global'} lab ${status} view stays in place`, async () => {
      const f = fixture([labRows(status)]);
      const id = scoped ? `cert:labview:student:${student}:${status}:0` : `cert:labview:${status}:0`;
      const result = await f.run(id); checkView(result, f);
      assert.equal(json(result.payload.embeds[0]).fields.length, 5);
      assert.deepEqual(f.queries[0].params, scoped ? [student, status, 0] : [status, 0]);
      assert.match(json(result.payload.embeds[0]).description, /not provider-session status/);
      assert.ok(controls(result.payload).some(item => item.custom_id.startsWith('cert:labview:detail:')));
    });
  }
}

test('populated lab detail preserves destructive controls without invoking them', async () => {
  const record = labRows('approved')[0], f = fixture([[record]]);
  const result = await f.run(`cert:labview:detail:${record.request_id}`); checkView(result, f);
  const buttons = controls(result.payload);
  for (const action of ['revoke', 'suspend']) {
    assert.equal(buttons.find(item => item.custom_id === `cert:labact:${action}:${record.request_id}`).style, 4);
  }
  assert.deepEqual(f.queries[0].params, [record.request_id]);
});

test('populated student detail keeps existing access and review controls', async () => {
  const f = fixture([[people[0]], [{ total: '1', pending: '1', approved: '0' }]]);
  const result = await f.run(`cert:students:detail:${student}`); checkView(result, f);
  const buttons = controls(result.payload);
  assert.ok(buttons.some(item => item.custom_id === `cert:access:deny:${student}`));
  assert.ok(buttons.some(item => item.custom_id === `cert:enrollment:review:${student}`));
  assert.ok(buttons.some(item => item.custom_id === `cert:labview:student:${student}:all:0`));
  assert.equal(f.queries.length, 2);
});

for (const id of ['cert:audit:0', `cert:student-audit:${student}:0`]) {
  test(`populated audit ${id} updates privately with bounded events`, async () => {
    const f = fixture([events]); const result = await f.run(id); checkView(result, f);
    assert.equal(json(result.payload.embeds[0]).fields.length, 5);
    assert.equal(json(result.payload.embeds[0]).color, 0x9b59b6);
    assert.equal(controls(result.payload).find(item => item.label === 'Next').disabled, false);
  });
}

for (const id of [`cert:students:detail:${student}`, `cert:labview:detail:${labRows('pending')[0].request_id}`]) {
  test(`missing record ${id} returns navigation in the same message`, async () => {
    const f = fixture([[]]); const result = await f.run(id); checkView(result, f);
    assert.match(result.payload.content, /not found/); assert.equal(result.payload.embeds.length, 0);
  });
}

for (const options of [{ actor: student }, { guildId: null }]) {
  test(`populated routes reject unauthorized context ${JSON.stringify(options)}`, async () => {
    const f = fixture([]); const result = await f.run('cert:dir:all:0:', options);
    assert.deepEqual(result.calls, ['reply']); assert.equal(result.payload.flags, 64);
    assert.equal(f.queries.length, 0); assert.equal(f.message.payload, null);
  });
}

test('enrollment review confirmation remains separate and does not approve a learner', async () => {
  const f = fixture([[people[0]]]);
  const result = await f.run(`cert:enrollment:review:${student}`);
  assert.deepEqual(result.calls, ['deferReply', 'edit']);
  assert.equal(f.message.payload, null); assert.equal(f.queries.length, 1);
  assert.match(json(result.payload.embeds[0]).title, /Confirm enrollment approval/);
  assert.ok(controls(result.payload).some(item => item.custom_id === `cert:enrollment:approve:${student}`));
});
