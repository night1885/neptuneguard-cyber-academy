import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';

const guildId = '1339276399390887956';
const config = { enabled: true, ownerId: '1223123544301633567' };
function fixture() {
  let calls = 0;
  const pool = { async query() { calls++; throw new Error('Unexpected database access'); },
    async connect() { calls++; throw new Error('Unexpected database access'); } };
  return { route: createCertificationRouter(pool, config, guildId), get calls() { return calls; } };
}
function interaction(id, modal = false) {
  return { customId: id, user: { id: '1223123544301633568' }, guildId, replies: [],
    isButton: () => !modal, isModalSubmit: () => modal,
    async reply(payload) { this.replies.push(payload); } };
}

test('submission buttons reach disabled submission handler without database access', async () => {
  const f = fixture(); const i = interaction('cert:submit:start');
  assert.equal(await f.route(i), true);
  assert.match(i.replies[0].content, /Enrollment submission is unavailable/);
  assert.equal(i.replies[0].flags, 64);
  assert.deepEqual(i.replies[0].allowedMentions, { parse: [] });
  assert.equal(f.calls, 0);
});

test('submission modals are routed before generic modal rejection', async () => {
  const f = fixture(); const i = interaction('cert:submit:send:00000000-0000-0000-0000-000000000000', true);
  assert.equal(await f.route(i), true);
  assert.match(i.replies[0].content, /Enrollment submission is unavailable/);
  assert.equal(f.calls, 0);
});

test('unrelated certification modals retain generic rejection', async () => {
  const f = fixture(); const i = interaction('cert:unknown:form', true);
  assert.equal(await f.route(i), true);
  assert.match(i.replies[0].content, /Unsupported certification form/);
  assert.equal(f.calls, 0);
});

test('non-certification interactions remain outside the router', async () => {
  const f = fixture(); const i = interaction('academy:contents');
  assert.equal(await f.route(i), false);
  assert.equal(i.replies.length, 0); assert.equal(f.calls, 0);
});
