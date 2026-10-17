import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { pauseRetainingAcademyInteraction, replyRetentionHold, RETENTION_HOLD_MESSAGE } from './certification-retention-hold.js';
import { attachCertificationRuntime } from './certification-runtime.js';
const workspaceGuild = '333333333333333333';
function interaction(kind, id, deferred = false) {
  const replies = [];
  const i = { customId: kind === 'command' ? undefined : id, commandName: kind === 'command' ? id : undefined, deferred,
    isChatInputCommand: () => kind === 'command', isButton: () => kind === 'button', isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'menu',
    fields: { getTextInputValue() { assert.fail('Held workflows cannot read submitted fields'); } },
    async reply(payload) { assert.equal(payload.flags, 64); replies.push(payload); },
    async editReply(payload) { assert.equal(deferred, true); replies.push(payload); },
    async showModal() { assert.fail('Held workflows cannot open forms'); } };
  Object.defineProperty(i, 'user', { get() { assert.fail('Hold response does not need learner identity'); } });
  return { i, replies };
}
for (const id of ['start', 'begin', 'continue', 'progress', 'badges', 'student-progress', 'unknown-command']) {
  test(`academy command ${id} is held without reading identity or fields`, async () => {
    const x = interaction('command', id); assert.equal(await pauseRetainingAcademyInteraction(x.i), true);
    assert.equal(x.replies.length, 1); assert.equal(x.replies[0].content, RETENTION_HOLD_MESSAGE);
    assert.deepEqual(x.replies[0].allowedMentions, { parse: [] }); assert.deepEqual(x.replies[0].components, []);
  });
}
for (const id of ['linux-open-m1', 'linux-m1-lesson-complete', 'linux-m2-answer-a', 'academy:linux-administration:1:open', 'academy:linux-administration:1:lab-complete', 'badge-page:0']) {
  test(`legacy button ${id} is held`, async () => {
    const x = interaction('button', id); assert.equal(await pauseRetainingAcademyInteraction(x.i), true); assert.equal(x.replies.length, 1);
  });
}
test('catalog and unrelated interactions are not acknowledged by the academy hold', async () => {
  for (const [kind, id] of [['command', 'catalog'], ['button', 'cert:initial:home'], ['button', 'unrelated'], ['modal', 'unrelated']]) {
    const x = interaction(kind, id); assert.equal(await pauseRetainingAcademyInteraction(x.i), false); assert.equal(x.replies.length, 0);
  }
});
test('already deferred hold edits the reply without claiming data deletion', async () => {
  const x = interaction('button', 'linux-m1-quiz', true); await replyRetentionHold(x.i);
  assert.equal(x.replies.length, 1); assert.match(x.replies[0].content, /Existing records have not been deleted/);
});
test('real runtime holds certification buttons, modals and menus before database or field access', async () => {
  const client = new EventEmitter(); client.isReady = () => false; let ended = 0;
  const runtime = attachCertificationRuntime(client, {}, workspaceGuild, { CERTIFICATION_ENABLED: 'true',
    CERTIFICATION_DATABASE_URL: 'postgresql://fixture:fixture@localhost/certification_test', CERTIFICATION_DATABASE_TLS: 'disable' }, {
    createPool: () => ({ query() { assert.fail('Held certification interaction cannot query learner records'); }, connect() { assert.fail('Held certification interaction cannot write'); }, async end() { ended++; } }) });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    for (const [kind, id] of [['button', 'cert:register:open'], ['modal', 'cert:register:submit'], ['button', 'cert:register:confirm:00000000-0000-0000-0000-000000000000'],
      ['button', 'cert:submit:start'], ['modal', 'cert:submit:send:00000000-0000-0000-0000-000000000000'], ['button', 'cert:invite:start'],
      ['button', 'cert:access:confirm:00000000-0000-0000-0000-000000000000'], ['button', 'cert:labact:deny:00000000-0000-4000-8000-000000000001'],
      ['button', 'cert:enrollment:approve:222222222222222222'], ['button', 'cert:learner:home'], ['button', 'cert:admin:overview:0'], ['menu', 'cert:admin:section']]) {
      const x = interaction(kind, id); client.emit('interactionCreate', x.i); await tick();
      assert.equal(x.replies.length, 1); assert.equal(x.replies[0].content, RETENTION_HOLD_MESSAGE);
      assert.deepEqual(x.replies[0].allowedMentions, { parse: [] });
    }
  } finally { await runtime.detach(); }
  assert.equal(ended, 1);
});
