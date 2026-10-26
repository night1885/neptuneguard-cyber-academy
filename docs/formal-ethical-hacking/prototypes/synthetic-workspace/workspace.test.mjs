import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticWorkspace } from './workspace.mjs';

const context = () => ({ actorId: 'demo-learner-a', workspaceId: 'demo-server-a',
  courseKey: 'demo-ethical-hacking', messageId: 'demo-message-a', privateWorkspace: true });
const page = async ({ cursor }) => ({ title: 'DEMO ' + cursor, body: 'Synthetic lesson text only.' });
const make = options => createSyntheticWorkspace({ authorize: async () => true, loadPage: page, ...options });
const navigate = (app, result, extra = {}) => app.navigate({ ...context(), token: result.sessionToken, cursor: 'lesson', ...extra });

test('authorized synthetic entry produces buttons and no grants', async () => {
  const result = await make().open(context());
  assert.equal(result.ok, true);
  assert.equal(result.operation, 'edit-existing-private-message');
  assert.equal(result.visibility, 'private-required');
  assert.deepEqual([result.grantsAccess, result.progressSaved, result.evidenceCollected], [false, false, false]);
  assert.equal(result.payload.components[0].components.length, 3);
  assert.ok(result.payload.components[0].components.every(item => item.type === 2 && item.custom_id.length <= 100));
  assert.deepEqual(result.payload.allowedMentions, { parse: [] });
});

test('another actor cannot use the session', async () => {
  const app = make(), result = await app.open(context());
  assert.equal((await navigate(app, result, { actorId: 'demo-learner-b' })).ok, false);
  assert.equal((await navigate(app, result)).ok, true);
});

test('workspace course message and privacy changes are denied', async () => {
  for (const change of [{ workspaceId: 'demo-server-b' }, { courseKey: 'demo-other-course' },
    { messageId: 'demo-message-b' }, { privateWorkspace: false }]) {
    const app = make(), result = await app.open(context());
    assert.equal((await navigate(app, result, change)).ok, false);
  }
});

test('unknown tokens and cursors are denied', async () => {
  const app = make(), result = await app.open(context());
  assert.equal((await navigate(app, result, { token: 'forged' })).ok, false);
  assert.equal((await navigate(app, result, { cursor: 'submit-evidence' })).ok, false);
});

test('expiry at the boundary denies the page', async () => {
  let time = 0;
  const app = make({ now: () => time, ttlMs: 10 }), result = await app.open(context());
  time = 10;
  assert.equal((await navigate(app, result)).ok, false);
});

test('revocation after page loading prevents content release', async () => {
  let allowed = true;
  const app = make({ authorize: async () => allowed, loadPage: async () => {
    allowed = false; return { title: 'DEMO', body: 'Should not be delivered' };
  } });
  const result = await app.open(context());
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('Should not be delivered'), false);
});

test('authorization and renderer failures are neutral', async () => {
  for (const options of [{ authorize: async () => { throw new Error('private detail'); } },
    { loadPage: async () => { throw new Error('private detail'); } }]) {
    const result = await make(options).open(context());
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes('private detail'), false);
  }
});

test('dependencies and bounds must be explicit', () => {
  assert.throws(() => createSyntheticWorkspace());
  assert.throws(() => make({ ttlMs: 0 }));
  assert.throws(() => make({ maxSessions: 101 }));
});

test('successive navigation plans retain the same message', async () => {
  const app = make(), first = await app.open(context());
  const second = await navigate(app, first), third = await navigate(app, first, { cursor: 'help' });
  assert.equal(second.ok, true); assert.equal(third.ok, true);
  assert.equal(first.messageId, second.messageId); assert.equal(second.messageId, third.messageId);
});

test('capacity recovers after expiry', async () => {
  let time = 0;
  const app = make({ maxSessions: 1, ttlMs: 10, now: () => time });
  assert.equal((await app.open(context())).ok, true);
  assert.equal((await app.open(context())).ok, false);
  time = 10;
  assert.equal((await app.open(context())).ok, true);
});

test('disposal while loading prevents content release and reentry', async () => {
  let app;
  app = make({ loadPage: async () => { app.dispose(); return { title: 'DEMO', body: 'blocked' }; } });
  assert.equal((await app.open(context())).ok, false);
  assert.equal((await app.open(context())).ok, false);
});

test('real-shaped identifiers and oversized pages are refused', async () => {
  assert.equal((await make().open({ ...context(), actorId: '123456789012345678' })).ok, false);
  assert.equal((await make({ loadPage: async () => ({ title: 'DEMO', body: 'x'.repeat(3001) }) }).open(context())).ok, false);
});
