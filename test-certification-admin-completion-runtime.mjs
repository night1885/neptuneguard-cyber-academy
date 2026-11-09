import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAdministratorCompletionCourseRouter } from './certification-admin-completion-runtime.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';
const actor = '1223123544301633568', owner = '1223123544301633567', student = '1223123544301633569', guildId = '1339276399390887957', course = COURSE_SECTION_KEYS[0];
function interaction(customId, extra = {}) { return { customId, user: { id: actor }, guildId, guild: { id: guildId }, deferred: false, messages: [], isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false, async deferReply() { this.deferred = true; }, async reply(payload) { this.messages.push(payload); }, async editReply(payload) { this.messages.push(payload); }, async showModal(payload) { this.modal = payload; }, ...extra }; }
async function fixture() {
  const state = { admin: true, calls: [], legacy: [], disposed: 0 };
  const route = createAdministratorCompletionCourseRouter({}, {}, { enabled: true, ownerId: owner }, guildId, { verifiedRoleId: owner, createBaseRouter: () => async i => { await i.editReply({ embeds: [{ title: 'Initial console' }], components: [] }); return true; } }, {
    createVerifier: () => async () => state.admin,
    createCompletion: (_pool, _config, options) => ({ async completeCourse(...args) { assert.equal(await options.verifyAdministrator(args[0]), true); state.calls.push(args); return { alreadyCompleted: false }; } }),
    async createNavigation() { return { async handle() { return false; }, async handleAdmin(i) { state.legacy.push(i.customId); return false; }, decorateAdminInteraction: i => i, dispose() { state.disposed++; } }; }
  });
  await route.initialize(); return { state, route };
}
const token = i => i.messages.at(-1).components[0].components[0].custom_id;
test('non-owner admin reaches completion form from initial console and confirms exact target', async () => {
  const f = await fixture(), home = interaction('cert:initial:home'); await f.route(home);
  const entry = home.messages.at(-1).components.find(row => row.components.some(item => item.custom_id === 'cert:admincomplete:open')); assert.ok(entry);
  const open = interaction('cert:admincomplete:open'); await f.route(open); assert.equal(open.modal.custom_id, 'cert:admincomplete:form');
  const form = interaction('cert:admincomplete:form', { isButton: () => false, isModalSubmit: () => true, fields: { getTextInputValue: name => name === 'student' ? student : course } });
  await f.route(form); assert.equal(f.state.calls.length, 0); await f.route(interaction(token(form))); assert.deepEqual(f.state.calls, [[actor, student, course]]);
});
test('legacy completion button is redirected and never reaches old owner completion handler', async () => {
  const f = await fixture(), legacy = `cert:courselife:complete:${student}:${course}`, i = interaction(legacy, { user: { id: owner } });
  await f.route(i); assert.ok(!f.state.legacy.includes(legacy)); await f.route(interaction(token(i), { user: { id: owner } })); assert.deepEqual(f.state.calls, [[owner, student, course]]);
});
test('legacy assignment and assignment-confirmation routes remain delegated unchanged', async () => {
  const f = await fixture();
  for (const id of [`cert:courselife:assign:${student}`, 'cert:courselife:confirm:00000000-0000-0000-0000-000000000000']) { await f.route(interaction(id)); assert.ok(f.state.legacy.includes(id)); }
  assert.equal(f.state.calls.length, 0);
});
test('non-admin and wrong-server entry cannot open a modal', async () => {
  const f = await fixture(); f.state.admin = false; const denied = interaction('cert:admincomplete:open'); await f.route(denied); assert.equal(denied.modal, undefined);
  f.state.admin = true; const wrong = interaction('cert:admincomplete:open', { guildId: student }); await f.route(wrong); assert.equal(wrong.modal, undefined);
});
test('permission removal after form and before confirmation prevents completion', async () => {
  const f = await fixture(), i = interaction(`cert:admincomplete:request:${student}:${course}`); await f.route(i); f.state.admin = false; await f.route(interaction(token(i))); assert.equal(f.state.calls.length, 0);
});
test('disposal invalidates pending confirmations and disposes managed navigation', async () => {
  const f = await fixture(), i = interaction(`cert:admincomplete:request:${student}:${course}`); await f.route(i); const confirm = token(i); f.route.dispose();
  await f.route(interaction(confirm)); assert.equal(f.state.calls.length, 0); assert.equal(f.state.disposed, 1); await assert.rejects(f.route.initialize(), /disposed/);
});
test('application default selects integrated runtime while executable retains isolated UI-review hook', async () => {
  const application = await readFile(new URL('./certification-restored-application.js', import.meta.url), 'utf8');
  assert.match(application, /import \{ attachAdministratorCertificationRuntime as attachCertificationRuntime \} from '\.\/certification-admin-completion-runtime\.js'/);
  assert.match(application, /attachRuntime = attachCertificationRuntime/);
  const source = await readFile(new URL('./restoration.js', import.meta.url), 'utf8');
  assert.match(source, /uiReviewEnabled \? \{ attachRuntime/);
  assert.match(source, /attachCertificationRuntime\(sharedClient/);
});
