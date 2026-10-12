import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-router.js';

const guildId = '1339276399390887957';
const studentId = '1223123544301633568';
const config = { enabled: true, ownerId: '1223123544301633567' };
function fixture(status = 'approved', options = {}) {
  const calls = [];
  const pool = { async query(sql, params) {
    calls.push({ sql, params });
    return { rows: status === 'approved' ? [{ student_id: options.permanentId === undefined ? 'NG-PT-test' : options.permanentId }] : [] };
  } };
  const route = createCertificationRouter(pool, { ...config, ...options.config }, guildId);
  async function click(customId, overrides = {}) {
    const replies = [];
    const deferred = [];
    const interaction = { customId, guildId, user: { id: studentId }, isButton: () => true, isModalSubmit: () => false,
      async deferReply(payload) { deferred.push(payload); }, async editReply(payload) { replies.push(payload); },
      async reply(payload) { replies.push(payload); }, ...overrides };
    const handled = await route(interaction);
    return { handled, replies, deferred };
  }
  return { calls, click };
}

test('approved learner opens contents and private lesson page through router', async () => {
  const f = fixture();
  const contents = await f.click('cert:contents');
  assert.equal(contents.handled, true);
  assert.equal(contents.deferred[0].flags, 64);
  assert.equal(contents.replies[0].components[0].components[0].data.custom_id, 'cert:lesson:training-readiness:0');
  const page = await f.click('cert:lesson:training-readiness:0');
  assert.match(page.replies[0].embeds[0].data.title, /1\/3/);
  assert.ok(f.calls.every(call => call.sql.includes("status='approved'") && call.params[0] === studentId));
  assert.deepEqual(page.replies[0].allowedMentions, { parse: [] });
});

test('pending, suspended, revoked, denied, and absent records cannot view lessons', async () => {
  for (const status of ['pending', 'suspended', 'revoked', 'denied', 'absent']) {
    const result = await fixture(status).click('cert:lesson:training-readiness:0');
    assert.match(result.replies[0].content, /approved certification enrollment/);
    assert.equal(result.replies[0].embeds.length, 0);
    assert.equal(result.replies[0].components.length, 0);
  }
});

test('disabled or wrong-guild navigation performs no authorization query', async () => {
  const disabled = fixture('approved', { config: { enabled: false } });
  await disabled.click('cert:contents');
  assert.equal(disabled.calls.length, 0);
  const wrongGuild = fixture();
  await wrongGuild.click('cert:contents', { guildId: '1339276399390887958' });
  assert.equal(wrongGuild.calls.length, 0);
});

test('missing permanent ID denies content', async () => {
  const result = await fixture('approved', { permanentId: null }).click('cert:contents');
  assert.match(result.replies[0].content, /permanent student ID/);
});

test('unknown lesson, malformed ID, and out-of-range page are rejected', async () => {
  for (const id of ['cert:lesson:missing:0', 'cert:lesson:training-readiness:3', 'cert:lesson:training-readiness:-1', 'cert:help:training-readiness:999999']) {
    const result = await fixture().click(id);
    assert.match(result.replies[0].content, /invalid page/);
    assert.equal(result.replies[0].embeds.length, 0);
  }
});

test('help returns same-page navigation without granting lab authorization', async () => {
  const result = await fixture().click('cert:help:training-readiness:1');
  assert.match(result.replies[0].content, /does not grant lab authorization/);
  assert.equal(result.replies[0].components[0].components[0].data.custom_id, 'cert:lesson:training-readiness:1');
});

test('unrelated academy button remains unhandled', async () => {
  const f = fixture();
  const result = await f.click('academy:existing');
  assert.equal(result.handled, false);
  assert.equal(f.calls.length, 0);
  assert.equal(result.replies.length, 0);
});
