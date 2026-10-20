import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseLifecycleAdminControls, createReadyManagedCourseNavigation } from './certification-course-admin.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';

const owner = '1223123544301633567', student = '1223123544301633568', guildId = '1339276399390887957';
const [first, second] = COURSE_SECTION_KEYS;
function interaction(id, changes = {}) {
  return { customId: id, user: { id: owner }, guildId, deferred: false, replied: false, messages: [],
    isButton: () => true, isStringSelectMenu: () => false, async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { this.replied = true; this.messages.push(payload); }, async editReply(payload) { this.messages.push(payload); }, ...changes };
}
const last = i => i.messages.at(-1);
const confirmId = (i, action = 'confirm') => last(i).components[0].components.find(button => button.custom_id.startsWith(`cert:courselife:${action}:`)).custom_id;
async function fixture({ status = 'approved', completed = false, failChange = false } = {}) {
  const calls = [], queries = []; let stamp = 1000;
  const pool = { async query(sql) { queries.push(sql);
    if (sql.includes('FROM certification_enrollments')) return { rows: [{ discord_user_id: student, status, student_id: 'NG-fixture', approved_by: owner, approved_at: new Date(), application_closed_at: null, application_closed_by: null, application_closed_as: null }] };
    return { rows: [{ course_key: first, status: completed ? 'completed' : 'active', assigned_at: new Date(), completed_at: completed ? new Date() : null }] };
  } };
  const controls = await createCourseLifecycleAdminControls(pool, { enabled: true, ownerId: owner }, guildId, { now: () => stamp, async createLifecycle() {
    return { async assignCourses(...args) { calls.push(['assign', ...args]); if (failChange) throw new Error('Private failure'); return { activeCourseCount: 2, allAssignedCoursesCompleted: false }; },
      async completeCourse(...args) { calls.push(['complete', ...args]); if (failChange) throw new Error('Private failure'); return { activeCourseCount: 0, allAssignedCoursesCompleted: true }; } };
  } });
  return { controls, calls, queries, advance(ms) { stamp += ms; } };
}
const selection = keys => interaction(`cert:courselife:assign:${student}`, { isButton: () => false, isStringSelectMenu: () => true, values: keys });

test('course panel and selection only read before an exact bound assignment confirmation', async () => {
  const f = await fixture(), panel = interaction(`cert:courselife:open:${student}:0`); await f.controls.handle(panel);
  assert.ok(last(panel).embeds.length); assert.equal(f.calls.length, 0);
  const keys = [second], choice = selection(keys); await f.controls.handle(choice); keys.push(first);
  assert.ok(f.queries.every(sql => sql.startsWith('SELECT'))); assert.equal(f.calls.length, 0);
  await f.controls.handle(interaction(confirmId(choice)));
  assert.deepEqual(f.calls, [['assign', owner, student, [second]]]);
  const replay = interaction(confirmId(choice)); await f.controls.handle(replay); assert.match(last(replay).content, /already used/); assert.equal(f.calls.length, 1);
});

test('completion is separately confirmed and never represented as deletion or a certificate', async () => {
  const f = await fixture(), choice = interaction(`cert:courselife:complete:${student}:${first}`); await f.controls.handle(choice);
  assert.equal(f.calls.length, 0); const confirm = interaction(confirmId(choice)); await f.controls.handle(confirm);
  assert.deepEqual(f.calls, [['complete', owner, student, first]]); assert.match(last(confirm).content, /not deletion authorization/); assert.match(last(confirm).content, /no certificate was issued/);
});

test('wrong owner/server and invalid selections never query or consume another confirmation', async () => {
  const f = await fixture();
  for (const i of [interaction(`cert:courselife:open:${student}:0`, { user: { id: student } }), interaction(`cert:courselife:open:${student}:0`, { guildId: student }), selection(['unknown']), selection([second, second])]) await f.controls.handle(i);
  assert.equal(f.queries.length, 0); assert.equal(f.calls.length, 0);
  const choice = selection([second]); await f.controls.handle(choice); const id = confirmId(choice);
  await f.controls.handle(interaction(id, { user: { id: student } })); await f.controls.handle(interaction(id, { guildId: student }));
  assert.equal(f.calls.length, 0); await f.controls.handle(interaction(id)); assert.equal(f.calls.length, 1);
});

test('cancel, expiration and completed records do not create changes', async () => {
  const f = await fixture(), choice = selection([second]); await f.controls.handle(choice);
  await f.controls.handle(interaction(confirmId(choice, 'cancel'))); await f.controls.handle(interaction(confirmId(choice)));
  const expires = selection([second]); await f.controls.handle(expires); f.advance(300000);
  const expired = interaction(confirmId(expires)); await f.controls.handle(expired); assert.match(last(expired).content, /expired/); assert.equal(f.calls.length, 0);
  const complete = await fixture({ completed: true }), old = interaction(`cert:courselife:complete:${student}:${first}`); await complete.controls.handle(old);
  assert.match(last(old).content, /already completed/); assert.equal(complete.calls.length, 0);
});

test('suspended completion can be reviewed without offering new assignments', async () => {
  const f = await fixture({ status: 'suspended' }), panel = interaction(`cert:courselife:open:${student}:0`); await f.controls.handle(panel);
  assert.ok(!last(panel).components.some(row => row.components.some(component => component.type === 3)));
  const choice = interaction(`cert:courselife:complete:${student}:${first}`); await f.controls.handle(choice);
  assert.ok(confirmId(choice)); const assign = selection([second]); await f.controls.handle(assign); assert.match(last(assign).content, /could not be confirmed/);
});

test('student detail decoration respects five rows and adds no writes', async () => {
  const f = await fixture(), i = interaction(`cert:students:detail:${student}`), adapted = f.controls.decorateAdminInteraction(i);
  await adapted.editReply({ embeds: [{ title: 'Student' }], components: Array.from({ length: 5 }, (_, n) => ({ type: 1, components: [{ type: 2, style: 2, custom_id: `fixture:${n}`, label: 'Fixture' }] })) });
  assert.equal(last(i).components.length, 5); assert.ok(last(i).components.at(-1).components.some(button => button.custom_id === `cert:courselife:open:${student}:0`));
  assert.equal(f.queries.length, 0); assert.equal(f.calls.length, 0);
});

test('backend failure is sanitized and its confirmation cannot replay', async () => {
  const f = await fixture({ failChange: true }), choice = selection([second]); await f.controls.handle(choice); const id = confirmId(choice), confirm = interaction(id);
  await f.controls.handle(confirm); assert.match(last(confirm).content, /Review the current/); assert.ok(!last(confirm).content.includes('Private failure'));
  await f.controls.handle(interaction(id)); assert.equal(f.calls.length, 1); f.controls.dispose();
});

test('managed navigation disposes both components and cleans up if control readiness fails', async () => {
  let navigationDisposed = 0, controlsDisposed = 0;
  const createNavigation = async () => ({ async handle() {}, dispose() { navigationDisposed++; } });
  const managed = await createReadyManagedCourseNavigation({}, {}, guildId, {}, { createNavigation, async createControls() { return { async handle() {}, decorateAdminInteraction: i => i, dispose() { controlsDisposed++; } }; } });
  managed.dispose(); assert.equal(navigationDisposed, 1); assert.equal(controlsDisposed, 1);
  await assert.rejects(createReadyManagedCourseNavigation({}, {}, guildId, {}, { createNavigation, async createControls() { throw new Error('Readiness failure'); } }), /Readiness failure/);
  assert.equal(navigationDisposed, 2);
});
