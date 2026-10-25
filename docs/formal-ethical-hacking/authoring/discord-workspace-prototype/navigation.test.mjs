import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace } from './navigation.mjs';

const A = '100000000000000001', B = '100000000000000002';
const G = '100000000000000003', C = '100000000000000004', M = '100000000000000005';
const flags = { has: bit => bit === 64 };
function harness(overrides = {}) {
  const state = { now: 0, allowed: true, auth: 0, render: 0, tokens: 0 };
  const config = { enabled: true, guildId: G, entryChannelId: C, courseId: 'formal-ethical-hacking',
    clock: () => state.now, makeToken: () => (++state.tokens).toString(16).padStart(32, '0'),
    authorize: async args => { state.auth++; state.lastAuth = args; return state.allowed; },
    render: async ({ page }) => { state.render++; return `SYNTHETIC PAGE ${page + 1}`; }, ...overrides };
  const control = createWorkspace(config);
  function interaction(customId = 'fws:open', options = {}) {
    const calls = [];
    const value = { customId, guildId: G, channelId: C, user: { id: A },
      message: { id: M, flags }, deferred: false, replied: false,
      isButton: () => true, calls,
      async deferReply(payload) { calls.push(['deferReply', payload]); this.deferred = true; this.ephemeral = payload.flags === 64; },
      async deferUpdate() { calls.push(['deferUpdate']); this.deferred = true; },
      async reply(payload) { calls.push(['reply', payload]); this.replied = true; },
      async editReply(payload) { calls.push(['editReply', structuredClone(payload)]); this.last = payload; return { id: M, flags }; },
      ...options };
    return value;
  }
  async function open(options) { const value = interaction('fws:open', options); await control.handle(value); return value; }
  return { state, control, interaction, open };
}
const id = (value, index = 2) => value.last.components[0].components[index].custom_id;
const isNeutral = value => !JSON.stringify(value.calls).includes('SYNTHETIC PAGE');

test('disabled by default does not inspect or respond', async () => {
  let called = false;
  const c = createWorkspace({ authorize: () => { called = true; } });
  assert.equal(await c.handle({}), false); assert.equal(called, false);
});
test('enabled configuration requires explicit adapters and identifiers', () => {
  assert.throws(() => createWorkspace({ enabled: true }), TypeError);
});
test('commands and modals are not navigation', async () => {
  const h = harness();
  for (const customId of ['fws:open', 'fws:bad']) {
    const i = h.interaction(customId, { isButton: () => false });
    assert.equal(await h.control.handle(i), false); assert.equal(i.calls.length, 0);
  }
});
test('unrelated buttons are ignored', async () => {
  const h = harness(), i = h.interaction('other:open');
  assert.equal(await h.control.handle(i), false); assert.equal(i.calls.length, 0);
});
test('entry acknowledges privately before authorization and renders bounded buttons', async () => {
  const h = harness(), i = await h.open();
  assert.deepEqual(i.calls[0], ['deferReply', { flags: 64 }]);
  assert.equal(i.last.content, 'SYNTHETIC PAGE 1');
  assert.equal(i.last.components[0].components.length, 3);
  assert.deepEqual(i.last.allowedMentions, { parse: [] });
  assert.equal(h.state.auth, 2);
  assert.deepEqual(h.state.lastAuth, { actorId: A, guildId: G, courseId: 'formal-ethical-hacking' });
  assert.equal(i.last.components[0].components[0].disabled, true);
});
test('next and home defer-update and edit the same private workspace', async () => {
  const h = harness(), entry = await h.open(), next = h.interaction(id(entry));
  await h.control.handle(next);
  assert.equal(next.last.content, 'SYNTHETIC PAGE 2');
  assert.equal(next.calls[0][0], 'deferUpdate');
  assert.equal(next.calls.some(row => row[0] === 'reply' || row[0] === 'deferReply'), false);
  const home = h.interaction(id(next, 1)); await h.control.handle(home);
  assert.equal(home.last.content, 'SYNTHETIC PAGE 1');
});
test('wrong actor cannot edit the owner message', async () => {
  const h = harness(), entry = await h.open(), other = h.interaction(id(entry), { user: { id: B } });
  await h.control.handle(other);
  assert.equal(other.calls[0][0], 'reply'); assert.equal(other.calls[0][1].flags, 64);
  assert.equal(other.calls.some(row => row[0] === 'editReply'), false); assert.equal(isNeutral(other), true);
});
test('wrong guild and channel reveal no content', async () => {
  const h = harness();
  for (const options of [{ guildId: B }, { channelId: B }, { user: { id: 'forged' } }]) {
    const i = await h.open(options); assert.equal(isNeutral(i), true);
  }
  assert.equal(h.state.auth, 0);
});
test('wrong message id and public message cannot reuse private controls', async () => {
  const h = harness(), entry = await h.open();
  for (const message of [{ id: B, flags }, { id: M, flags: { has: () => false } }]) {
    const i = h.interaction(id(entry), { message }); await h.control.handle(i);
    assert.equal(isNeutral(i), true); assert.equal(i.calls[0][0], 'reply');
  }
});
test('denied current course assignment does not render', async () => {
  const h = harness(); h.state.allowed = false;
  const i = await h.open(); assert.equal(isNeutral(i), true); assert.equal(h.state.render, 0);
});
test('revocation during rendering prevents protected delivery', async () => {
  const h = harness({ render: async () => { h.state.allowed = false; return 'SYNTHETIC PAGE 9'; } });
  const i = await h.open(); assert.equal(isNeutral(i), true);
});
test('revocation on navigation retires controls and clears through current private edit', async () => {
  const h = harness(), entry = await h.open(); h.state.allowed = false;
  const i = h.interaction(id(entry)); await h.control.handle(i);
  assert.equal(isNeutral(i), true); assert.equal(i.calls[0][0], 'deferUpdate');
  assert.deepEqual(i.last.components, []);
});
test('authorization dependency error is neutral', async () => {
  const h = harness({ authorize: async () => { throw new Error('PRIVATE DEPENDENCY'); } });
  const i = await h.open(); assert.equal(isNeutral(i), true);
  assert.equal(JSON.stringify(i.calls).includes('PRIVATE DEPENDENCY'), false);
});
test('expired sessions require entry button re-entry without rendering', async () => {
  const h = harness(), entry = await h.open(); h.state.now = 600000;
  const i = h.interaction(id(entry)); await h.control.handle(i);
  assert.equal(isNeutral(i), true); assert.equal(h.state.render, 1);
  const fresh = await h.open(); assert.equal(fresh.last.content, 'SYNTHETIC PAGE 1');
});
test('re-entry invalidates prior controls', async () => {
  const h = harness(), old = await h.open(), fresh = await h.open();
  assert.notEqual(id(old), id(fresh));
  const i = h.interaction(id(old)); await h.control.handle(i); assert.equal(isNeutral(i), true);
});
test('stale control revision does not apply another transition', async () => {
  const h = harness(), entry = await h.open();
  await h.control.handle(h.interaction(id(entry)));
  const stale = h.interaction(id(entry)); await h.control.handle(stale);
  assert.equal(isNeutral(stale), true); assert.equal(h.state.render, 2);
});
test('malformed token is denied without rendering', async () => {
  const h = harness(), i = h.interaction('fws:not-a-token:0:next');
  await h.control.handle(i); assert.equal(isNeutral(i), true); assert.equal(h.state.render, 0);
});
test('bounded page navigation disables next on final page', async () => {
  const h = harness({ pages: 2 }), entry = await h.open(), next = h.interaction(id(entry));
  await h.control.handle(next); assert.equal(next.last.components[0].components[2].disabled, true);
});
test('same-actor concurrent entry fails closed', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness({ render: async () => { await gate; return 'SYNTHETIC PAGE 1'; } });
  const first = h.interaction(), task = h.control.handle(first);
  await new Promise(resolve => setImmediate(resolve));
  const second = await h.open(); assert.equal(isNeutral(second), true);
  release(); await task; assert.equal(first.last.content, 'SYNTHETIC PAGE 1');
});
test('capacity includes in-flight reservations', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = harness({ maxSessions: 1, render: async () => { await gate; return 'SYNTHETIC PAGE 1'; } });
  const first = h.interaction(), task = h.control.handle(first);
  await new Promise(resolve => setImmediate(resolve));
  const second = await h.open({ user: { id: B } }); assert.equal(isNeutral(second), true);
  release(); await task;
});
test('renderer overflow is never published', async () => {
  const h = harness({ render: async () => 'SYNTHETIC PAGE'.repeat(200) });
  const i = await h.open(); assert.equal(isNeutral(i), true);
});
test('dispose prevents new work and invalidates sessions', async () => {
  const h = harness(), entry = await h.open(); h.control.dispose();
  const i = h.interaction(id(entry)); assert.equal(await h.control.handle(i), false);
  assert.equal(i.calls.length, 0);
});
test('already acknowledged interactions are never edited by this controller', async () => {
  const h = harness(), i = h.interaction('fws:open', { deferred: true });
  assert.equal(await h.control.handle(i), true); assert.equal(i.calls.length, 0);
});
test('transport failure does not retain a valid session', async () => {
  const h = harness(), i = h.interaction('fws:open', { async editReply() { throw new Error('PRIVATE TRANSPORT'); } });
  await h.control.handle(i);
  const forged = h.interaction('fws:' + '1'.padStart(32, '0') + ':0:next');
  await h.control.handle(forged); assert.equal(isNeutral(forged), true);
});

test('non-boolean authorization is rejected', async () => {
  const h = harness({ authorize: async () => 'true' });
  const i = await h.open(); assert.equal(isNeutral(i), true); assert.equal(h.state.render, 0);
});
test('missing private acknowledgement proof prevents rendering', async () => {
  const h = harness(), i = h.interaction('fws:open', {
    async deferReply() { this.deferred = true; this.ephemeral = false; }
  });
  await h.control.handle(i); assert.equal(isNeutral(i), true); assert.equal(h.state.render, 0);
});
test('expiry during rendering prevents delivery', async () => {
  const h = harness({ render: async () => { h.state.now = 600000; return 'SYNTHETIC PAGE 1'; } });
  const i = await h.open(); assert.equal(isNeutral(i), true);
});
test('failed entry releases capacity reservation', async () => {
  const h = harness({ maxSessions: 1 }); h.state.allowed = false;
  await h.open(); h.state.allowed = true;
  const i = await h.open(); assert.equal(i.last.content, 'SYNTHETIC PAGE 1');
});
test('token collision cannot overwrite another actor session', async () => {
  const h = harness({ makeToken: () => 'a'.repeat(32) }), first = await h.open();
  const second = await h.open({ user: { id: B } }); assert.equal(isNeutral(second), true);
  const next = h.interaction(id(first)); await h.control.handle(next);
  assert.equal(next.last.content, 'SYNTHETIC PAGE 2');
});
test('oversized TTL and capacity are rejected', () => {
  for (const config of [{ ttlMs: 840001 }, { maxSessions: 257 }, { pages: 0 }]) {
    assert.throws(() => harness(config), TypeError);
  }
});
test('crafted page underflow retires a session instead of rendering', async () => {
  const h = harness(), first = await h.open(), prev = h.interaction(id(first, 0));
  await h.control.handle(prev); assert.equal(isNeutral(prev), true); assert.equal(h.state.render, 1);
});
test('render exception is neutral and hides dependency details', async () => {
  const h = harness({ render: async () => { throw new Error('PRIVATE RENDER'); } });
  const i = await h.open(); assert.equal(isNeutral(i), true);
  assert.equal(JSON.stringify(i.calls).includes('PRIVATE RENDER'), false);
});

test('authorization timeout releases the actor and capacity', async () => {
  let ready = false;
  const h = harness({ maxSessions: 1, dependencyTimeoutMs: 100,
    authorize: async () => ready ? true : new Promise(() => {}) });
  const blocked = await h.open(); assert.equal(isNeutral(blocked), true);
  ready = true; const fresh = await h.open(); assert.equal(fresh.last.content, 'SYNTHETIC PAGE 1');
});
test('render timeout cannot later publish through the controller', async () => {
  let release;
  const h = harness({ dependencyTimeoutMs: 100,
    render: () => new Promise(resolve => { release = resolve; }) });
  const blocked = await h.open(); assert.equal(isNeutral(blocked), true);
  const before = blocked.calls.length; release('SYNTHETIC PAGE LATE');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blocked.calls.length, before); assert.equal(isNeutral(blocked), true);
});
