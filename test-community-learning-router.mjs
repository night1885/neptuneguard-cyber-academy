import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityRouter } from './community-learning-router.mjs';
const actor = '333333333333333333', guildId = '111111111111111111', role = '222222222222222222';
function fixture({ verified = true, ready = true, path = 'linux-fundamentals' } = {}) {
  const state = { verified, ready, path, queries: [], replies: [], dispatched: [], fail: false };
  const pool = { async query(sql, values) {
    state.queries.push({ sql, values }); if (state.fail) throw new Error('private database details');
    if (sql.startsWith('SELECT current_path_slug')) return { rows: [{ current_path_slug: state.path }] };
    if (sql.includes('GROUP BY')) return { rows: [{ course_key: 'linux-fundamentals', completed_modules: 1, earned_xp: 100 }] };
    if (sql.includes('FROM learner_badges')) return { rows: [] };
    return { rows: [] };
  } };
  const route = createCommunityRouter({ pool, options: { enabled: true, guildId, verifiedRoleId: role }, ready: () => state.ready,
    badgeKeys: ['linux-foundations'], showCourse: async (i, p, key) => state.dispatched.push(key),
    handleActivity: async i => state.dispatched.push(i.customId), renderBadges: () => ({ content: 'Badges', components: [] }) });
  async function run(command, { button, selected = path } = {}) {
    const i = { commandName: command, customId: button, guildId, user: { id: actor },
      isChatInputCommand: () => button === undefined, isButton: () => button !== undefined,
      options: { getString: () => selected }, guild: { id: guildId, members: { async fetch() { return { id: actor, roles: { cache: { has: id => id === role && state.verified } } }; } } },
      async deferReply(payload) { assert.equal(payload.flags, 64); }, async editReply(payload) { state.replies.push(payload); } };
    return route(i);
  }
  return { state, run };
}
test('registration and owner controls are not acknowledged by the community router', async () => {
  const f = fixture(); assert.equal(await f.run(null, { button: 'cert:initial:home' }), false); assert.equal(f.state.replies.length, 0); assert.equal(f.state.queries.length, 0);
});
test('unverified and unready requests never reach storage or course dispatch', async () => {
  for (const options of [{ verified: false }, { ready: false }]) {
    const f = fixture(options); await f.run('begin'); assert.equal(f.state.queries.length, 0); assert.equal(f.state.dispatched.length, 0);
  }
});
test('catalog contains only Linux community paths and performs no database query', async () => {
  const f = fixture(); await f.run('catalog'); assert.equal(f.state.queries.length, 0);
  const body = f.state.replies[0].content;
  for (const title of ['Linux Fundamentals', 'Linux Administration', 'Linux Security Engineering']) assert.ok(body.includes(title));
  assert.ok(!body.includes('/begin path:soc-analyst'));
});
test('begin selects only the caller path without resetting module progress', async () => {
  const f = fixture(); await f.run('begin'); assert.equal(f.state.queries.length, 1);
  assert.deepEqual(f.state.queries[0].values, [actor, 'linux-fundamentals']);
  assert.ok(!f.state.queries[0].sql.includes('learner_module_progress'));
  assert.ok(!/DELETE|TRUNCATE/.test(f.state.queries[0].sql));
});
test('SOC begin and historical SOC continue cannot dispatch a classroom', async () => {
  const f = fixture({ path: 'soc-analyst' }); await f.run('begin'); assert.equal(f.state.queries.length, 0);
  await f.run('continue'); assert.equal(f.state.dispatched.length, 0); assert.equal(f.state.queries.length, 1);
});
test('continue opens only the caller allowed course', async () => {
  const f = fixture(); await f.run('continue'); assert.deepEqual(f.state.dispatched, ['linux-fundamentals']);
  assert.deepEqual(f.state.queries[0].values, [actor]);
});
test('legacy Linux buttons translate to the generic handler after matching the selected path', async () => {
  const f = fixture(); await f.run(null, { button: 'linux-open-m1' }); await f.run(null, { button: 'linux-m1-lesson' });
  assert.deepEqual(f.state.dispatched, ['academy:linux-fundamentals:1:open', 'academy:linux-fundamentals:1:lesson:0']);
  f.state.path = 'linux-administration'; await f.run(null, { button: 'linux-open-m1' }); assert.equal(f.state.dispatched.length, 2);
});
test('community progress and badges use caller-scoped course and badge filters', async () => {
  const f = fixture(); await f.run('progress'); await f.run('badges');
  assert.ok(f.state.queries[0].sql.includes('course_key=ANY($2::text[])'));
  assert.equal(f.state.queries[0].values[0], actor); assert.equal(f.state.queries[0].values[1].length, 3);
  assert.ok(!f.state.queries[0].values[1].includes('soc-analyst'));
  assert.deepEqual(f.state.queries[1].values, [actor, ['linux-foundations']]);
  for (const query of f.state.queries) assert.ok(!query.sql.includes('certification_'));
});
test('role removal prevents the next button dispatch and storage access', async () => {
  const f = fixture(); await f.run(null, { button: 'linux-open-m1' }); const count = f.state.queries.length;
  f.state.verified = false; await f.run(null, { button: 'linux-m1-lab-complete' });
  assert.equal(f.state.queries.length, count); assert.equal(f.state.dispatched.length, 1);
});
test('storage errors use a private generic response without leaking details', async () => {
  const f = fixture(); f.state.fail = true; await f.run('begin');
  assert.ok(!f.state.replies[0].content.includes('private database details'));
  assert.deepEqual(f.state.replies[0].allowedMentions, { parse: [] });
});
