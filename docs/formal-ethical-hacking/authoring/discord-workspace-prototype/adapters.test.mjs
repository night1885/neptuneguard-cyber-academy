import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAccessAdapter } from './access.mjs';
import { createContentAdapter } from './content.mjs';
import { createReviewWorkspace } from './review-workspace.mjs';

const A = '100000000000000001', B = '100000000000000002';
const G = '100000000000000003', C = '100000000000000004';
const R = '100000000000000005', M = '100000000000000006', K = 'formal-ethical-hacking';
const original = JSON.parse(readFileSync(new URL('./draft-pages.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(original);
const context = () => ({ actorId: A, guildId: G, courseId: K });
function member(actor = A, guild = G, verified = true) {
  return { id: actor, guild: { id: guild }, roles: { cache: { has: key => key === R && verified } } };
}
function harness(overrides = {}) {
  const state = { member: true, verified: true, grant: { student_id: 'SYNTHETIC-STUDENT', course_key: K }, reads: [], time: 0, token: 0 };
  const config = { enabled: true, guildId: G, entryChannelId: C, courseId: K, verifiedRoleId: R,
    readMember: async (actor, guild) => { state.reads.push(['member', actor, guild]); return state.member ? member(actor, guild, state.verified) : null; },
    readCourseGrant: async (actor, course) => { state.reads.push(['grant', actor, course]); return state.grant; },
    bundle: fresh(), clock: () => state.time, makeToken: () => (++state.token).toString(16).padStart(32, '0'), ...overrides };
  return { state, config, access: createAccessAdapter(config) };
}
function interaction(customId = 'fws:open', overrides = {}) {
  const calls = [];
  return { customId, user: { id: A }, guildId: G, channelId: C,
    message: { id: M, flags: { has: bit => bit === 64 } }, calls, isButton: () => true,
    async deferReply(options) { calls.push(['deferReply', options]); this.deferred = true; this.ephemeral = options.flags === 64; },
    async deferUpdate() { calls.push(['deferUpdate']); this.deferred = true; },
    async reply(payload) { calls.push(['reply', payload]); this.replied = true; },
    async editReply(payload) { calls.push(['editReply', payload]); this.last = payload; return this.message; },
    ...overrides };
}
const next = value => value.last.components[0].components[2].custom_id;
const noReading = value => !JSON.stringify(value.calls).includes('**Course workspace scope**') &&
  !JSON.stringify(value.calls).includes('**Before a practical**');

test('access adapter is default-off', async () => {
  assert.equal(await createAccessAdapter()(context()), false);
});
test('enabled access requires explicit trusted readers', () => {
  assert.throws(() => createAccessAdapter({ enabled: true }), TypeError);
});
test('current member plus exact course grant authorizes with scoped arguments', async () => {
  const h = harness(); assert.equal(await h.access(context()), true);
  assert.deepEqual(h.state.reads, [['member', A, G], ['grant', A, K], ['member', A, G]]);
});
test('foreign actor format, guild and course fail before reads', async () => {
  const h = harness();
  for (const change of [{ actorId: 'bad' }, { guildId: B }, { courseId: 'linux-fundamentals' }]) {
    assert.equal(await h.access({ ...context(), ...change }), false);
  }
  assert.equal(h.state.reads.length, 0);
});
test('client owner or role additions are not accepted as context authority', async () => {
  const h = harness(); assert.equal(await h.access({ ...context(), owner: A, role: 'instructor' }), false);
  assert.equal(h.state.reads.length, 0);
});
test('absent member fails before course lookup', async () => {
  const h = harness(); h.state.member = false;
  assert.equal(await h.access(context()), false); assert.equal(h.state.reads.length, 1);
});
test('foreign member identity or guild fails', async () => {
  for (const value of [member(B), member(A, B)]) {
    const h = harness({ readMember: async () => value }); assert.equal(await h.access(context()), false);
  }
});
test('Verified role is necessary but not sufficient for this proposed adapter', async () => {
  const h = harness(); h.state.verified = false; assert.equal(await h.access(context()), false);
  h.state.verified = true; h.state.grant = null; assert.equal(await h.access(context()), false);
});
test('enrollment eligibility student id alone is not a course grant', async () => {
  const h = harness(); h.state.grant = { student_id: 'SYNTHETIC-STUDENT' };
  assert.equal(await h.access(context()), false);
});
test('wrong course, incomplete and unexpected grant shapes fail closed', async () => {
  const h = harness();
  for (const grant of [{ student_id: 'S', course_key: 'linux-fundamentals' },
    { student_id: '', course_key: K }, { student_id: 123, course_key: K },
    { student_id: 'x'.repeat(129), course_key: K }, { student_id: 'S', course_key: K, approved: true }]) {
    h.state.grant = grant; assert.equal(await h.access(context()), false);
  }
});
test('membership revocation during grant read is rejected by second member read', async () => {
  const h = harness({ readCourseGrant: async () => { h.state.member = false; return h.state.grant; } });
  assert.equal(await h.access(context()), false);
});
test('provider errors deny rather than expose dependency content', async () => {
  const h = harness({ readCourseGrant: async () => { throw new Error('PRIVATE'); } });
  assert.equal(await h.access(context()), false);
});
test('provider waits are bounded and do not cache the failure', async () => {
  let ready = false;
  const h = harness({ readTimeoutMs: 100, readMember: async () => ready ? member() : new Promise(() => {}) });
  assert.equal(await h.access(context()), false); ready = true;
  assert.equal(await h.access(context()), true);
});
test('grant revocation is seen on the next call without a positive cache', async () => {
  const h = harness(); assert.equal(await h.access(context()), true);
  h.state.grant = null; assert.equal(await h.access(context()), false);
});
test('draft content compiles three bounded reading pages', () => {
  const c = createContentAdapter({ courseId: K, bundle: fresh() });
  assert.equal(c.pageCount, 3);
  for (let page = 0; page < c.pageCount; page++) {
    const value = c.render({ courseId: K, page });
    assert.equal(typeof value, 'string'); assert.ok(value.length <= 1800); assert.ok(value.includes('\n\n'));
  }
});
test('content snapshots are isolated from later bundle mutation', () => {
  const b = fresh(), c = createContentAdapter({ courseId: K, bundle: b });
  b.pages[0].text = 'MUTATED'; assert.equal(c.render({ courseId: K, page: 0 }).includes('MUTATED'), false);
});
test('runtime or publication flags cannot activate the review bundle', () => {
  for (const change of [{ publishable: true }, { runtimeIntegration: true }, { mode: 'production' }]) {
    assert.throws(() => createContentAdapter({ courseId: K, bundle: { ...fresh(), ...change } }), TypeError);
  }
});
test('foreign course bundle and extra metadata are rejected', () => {
  for (const change of [{ courseId: 'linux-fundamentals' }, { instructorAnswers: [] }]) {
    assert.throws(() => createContentAdapter({ courseId: K, bundle: { ...fresh(), ...change } }), TypeError);
  }
});
test('answer or instructor page categories are rejected', () => {
  for (const change of [{ audience: 'instructor' }, { kind: 'answer' }]) {
    const b = fresh(); Object.assign(b.pages[0], change);
    assert.throws(() => createContentAdapter({ courseId: K, bundle: b }), TypeError);
  }
});
test('page count, duplicate ids and oversized content are rejected', () => {
  for (const mutate of [b => { b.pages = []; }, b => { b.pages[1].id = b.pages[0].id; },
    b => { b.pages[0].text = 'x'.repeat(1601); }, b => { b.pages[0].title = '@everyone'; }]) {
    const b = fresh(); mutate(b); assert.throws(() => createContentAdapter({ courseId: K, bundle: b }), TypeError);
  }
});
test('foreign course and invalid content cursors cannot render', () => {
  const c = createContentAdapter({ courseId: K, bundle: fresh() });
  for (const value of [{ courseId: B, page: 0 }, { courseId: K, page: true },
    { courseId: K, page: -1 }, { courseId: K, page: 3 }, { courseId: K, page: 0, owner: A }]) {
    assert.throws(() => c.render(value));
  }
});
test('composed workspace is default-off without readers or a bundle', async () => {
  const i = interaction(); assert.equal(await createReviewWorkspace().handle(i), false); assert.equal(i.calls.length, 0);
});
test('actual controller composes adapters for private entry and in-place next', async () => {
  const h = harness(), c = createReviewWorkspace(h.config), entry = interaction();
  await c.handle(entry); assert.equal(entry.calls[0][1].flags, 64);
  assert.ok(entry.last.content.startsWith('**Course workspace scope**'));
  const i = interaction(next(entry)); await c.handle(i);
  assert.equal(i.calls[0][0], 'deferUpdate'); assert.ok(i.last.content.startsWith('**Before a practical**'));
  assert.equal(i.calls.some(row => row[0] === 'reply' || row[0] === 'deferReply'), false);
  assert.deepEqual(i.last.allowedMentions, { parse: [] });
  c.dispose();
});
test('composed workspace denies enrollment-only or null grants without reading', async () => {
  for (const grant of [null, { student_id: 'SYNTHETIC-STUDENT' }]) {
    const h = harness(); h.state.grant = grant;
    const c = createReviewWorkspace(h.config), i = interaction(); await c.handle(i);
    assert.equal(noReading(i), true); assert.deepEqual(i.last.components, []); c.dispose();
  }
});
test('composed workspace rechecks assignment on navigation and retires controls', async () => {
  const h = harness(), c = createReviewWorkspace(h.config), entry = interaction(); await c.handle(entry);
  h.state.grant = null; const i = interaction(next(entry)); await c.handle(i);
  assert.equal(noReading(i), true); assert.deepEqual(i.last.components, []); c.dispose();
});
test('membership revoked at post-render check prevents composed entry delivery', async () => {
  let reads = 0;
  const h = harness({ readMember: async () => ++reads < 4 ? member() : null });
  const c = createReviewWorkspace(h.config), i = interaction(); await c.handle(i);
  assert.equal(noReading(i), true); assert.equal(reads, 4); c.dispose();
});
test('wrong actor controls do not invoke the composed grant readers', async () => {
  const h = harness(), c = createReviewWorkspace(h.config), entry = interaction(); await c.handle(entry);
  const before = h.state.reads.length, i = interaction(next(entry), { user: { id: B } });
  await c.handle(i); assert.equal(noReading(i), true); assert.equal(h.state.reads.length, before); c.dispose();
});
test('composed restart requires private button re-entry', async () => {
  const h = harness(), first = createReviewWorkspace(h.config), entry = interaction(); await first.handle(entry); first.dispose();
  const restarted = createReviewWorkspace(h.config), stale = interaction(next(entry)); await restarted.handle(stale);
  assert.equal(noReading(stale), true);
  const freshEntry = interaction(); await restarted.handle(freshEntry);
  assert.ok(freshEntry.last.content.startsWith('**Course workspace scope**')); restarted.dispose();
});

test('array-shaped grants with named properties are rejected', async () => {
  const h = harness(); h.state.grant = Object.assign([], { student_id: 'SYNTHETIC-STUDENT', course_key: K });
  assert.equal(await h.access(context()), false);
});
test('non-boolean role lookup does not establish membership eligibility', async () => {
  const h = harness({ readMember: async () => ({ id: A, guild: { id: G }, roles: { cache: { has: () => 'true' } } }) });
  assert.equal(await h.access(context()), false);
});
test('unsupported or boolean content schema versions are rejected', () => {
  for (const schemaVersion of [0, 2, true]) {
    assert.throws(() => createContentAdapter({ courseId: K, bundle: { ...fresh(), schemaVersion } }), TypeError);
  }
});
test('composition derives its page bounds from the supplied bundle', async () => {
  const h = harness(); h.config.bundle.pages.pop();
  const c = createReviewWorkspace(h.config), entry = interaction(); await c.handle(entry);
  const i = interaction(next(entry)); await c.handle(i);
  assert.equal(i.last.components[0].components[2].disabled, true); c.dispose();
});
test('composition does not expose permanent student identifiers in reading responses', async () => {
  const h = harness(), c = createReviewWorkspace(h.config), i = interaction(); await c.handle(i);
  assert.equal(JSON.stringify(i.calls).includes('SYNTHETIC-STUDENT'), false); c.dispose();
});
test('expired composed controls require fresh button entry, not new grant inference', async () => {
  const h = harness(), c = createReviewWorkspace(h.config), entry = interaction(); await c.handle(entry);
  h.state.time = 600000; const before = h.state.reads.length, stale = interaction(next(entry)); await c.handle(stale);
  assert.equal(noReading(stale), true); assert.equal(h.state.reads.length, before);
  const freshEntry = interaction(); await c.handle(freshEntry);
  assert.ok(freshEntry.last.content.startsWith('**Course workspace scope**')); c.dispose();
});
