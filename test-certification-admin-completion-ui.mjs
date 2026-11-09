import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdministratorCompletionControls } from './certification-admin-completion-ui.js';
const actor = '1223123544301633568', student = '1223123544301633569', guildId = '1339276399390887957';
const request = `cert:admincomplete:request:${student}:fixture`;
function interaction(customId, overrides = {}) { return { customId, user: { id: actor }, guildId, messages: [], deferred: false, isButton: () => true, async deferReply() { this.deferred = true; }, async reply(payload) { this.messages.push(payload); }, async editReply(payload) { this.messages.push(payload); }, ...overrides }; }
function fixture() {
  const state = { admin: true, time: 1000, calls: [], hook: null, fail: false };
  const controls = createAdministratorCompletionControls({ guildId, courseKeys: ['fixture'], now: () => state.time, async verifyAdministrator() { if (state.hook) await state.hook(); return state.admin; }, service: { async completeCourse(...args) { state.calls.push(args); if (state.fail) throw new Error('Private backend failure'); return { alreadyCompleted: false }; } } });
  return { state, controls };
}
async function prompt(f) { const i = interaction(request); await f.controls.handle(i); return i.messages.at(-1).components[0].components[0].custom_id; }
test('completion requires a bound single-use confirmation and exposes no assignment API', async () => {
  const f = fixture(), token = await prompt(f); assert.equal(f.state.calls.length, 0);
  const i = interaction(token); await f.controls.handle(i); assert.deepEqual(f.state.calls, [[actor, student, 'fixture']]);
  assert.match(i.messages.at(-1).content, /No certificate was issued/); assert.equal(f.controls.assignCourses, undefined);
  await f.controls.handle(interaction(token)); assert.equal(f.state.calls.length, 1);
});
test('wrong actor/server cannot consume another confirmation', async () => {
  const f = fixture(), token = await prompt(f);
  await f.controls.handle(interaction(token, { user: { id: student } })); await f.controls.handle(interaction(token, { guildId: student }));
  assert.equal(f.state.calls.length, 0); await f.controls.handle(interaction(token)); assert.equal(f.state.calls.length, 1);
});
test('permission removal denies confirmation and consumes it', async () => {
  const f = fixture(), token = await prompt(f); f.state.admin = false; await f.controls.handle(interaction(token));
  f.state.admin = true; await f.controls.handle(interaction(token)); assert.equal(f.state.calls.length, 0);
});
test('cancel and expiration never call backend', async () => {
  const f = fixture(), token = await prompt(f); await f.controls.handle(interaction(token.replace(':confirm:', ':cancel:')));
  await f.controls.handle(interaction(token)); const next = await prompt(f); f.state.time += 300000; await f.controls.handle(interaction(next)); assert.equal(f.state.calls.length, 0);
});
test('expiration or disposal during asynchronous verification blocks admission', async () => {
  for (const action of [f => { f.state.time += 300000; }, f => f.controls.dispose()]) {
    const f = fixture(), token = await prompt(f); f.state.hook = async () => action(f); await f.controls.handle(interaction(token)); assert.equal(f.state.calls.length, 0);
  }
});
test('backend failures are sanitized and cannot replay', async () => {
  const f = fixture(), token = await prompt(f); f.state.fail = true; const i = interaction(token); await f.controls.handle(i);
  assert.ok(!i.messages.at(-1).content.includes('Private backend failure')); await f.controls.handle(interaction(token)); assert.equal(f.state.calls.length, 1);
});
test('unknown courses and non-button or private cross-user contexts are rejected', async () => {
  const f = fixture();
  for (const i of [interaction(request.replace('fixture', 'unknown')), interaction(request, { isButton: () => false }), interaction(request, { message: { flags: { has: () => true }, interactionMetadata: { user: { id: student } } } })]) await f.controls.handle(i);
  assert.equal(f.state.calls.length, 0); assert.equal(await f.controls.handle(interaction('unrelated')), false);
});
