import test from 'node:test';
import assert from 'node:assert/strict';
import { createProtectedCourseNavigation } from './certification-course-navigation.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';

const actor = '1223123544301633568', owner = '1223123544301633567', guildId = '1339276399390887957', roleId = '1339276399390887959';
const [first, second] = COURSE_SECTION_KEYS;
function fixture(options = {}) {
  const f = { time: 1000, role: true, studentId: 'NG-fixture', failQuery: false, renders: [], queries: [], states: new Map(COURSE_SECTION_KEYS.map(key => [key, 'active'])), onRender: null };
  const pool = { async query(sql, params) {
    f.queries.push({ sql, params }); assert.match(sql, /JOIN certification_course_enrollments/);
    if (f.failQuery) throw new Error('Private database error');
    if (params[0] !== actor || f.states.get(params[1]) !== 'active') return { rows: [] };
    const stamp = new Date();
    return { rows: [{ discord_user_id: actor, status: 'approved', student_id: f.studentId, approved_by: owner, approved_at: stamp,
      signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'fixture', agreement_content_sha256: 'a'.repeat(64),
      acknowledged_at: stamp, learner_confirmed_read_at: stamp, comprehension_passed_at: stamp, comprehension_check_version: 'fixture',
      age_eligible: true, age_declared_at: stamp, age_declaration_version: 'adult-18-v1',
      application_closed_at: null, application_closed_by: null, application_closed_as: null, course_status: 'active', authorized_course_key: params[1] }] };
  } };
  f.navigation = createProtectedCourseNavigation(pool, { enabled: true, ownerId: owner }, guildId, { verifiedRoleId: roleId, now: () => f.time, ...options,
    async renderPage({ courseKey, cursor, buttonId }) {
      f.renders.push({ courseKey, cursor }); if (f.onRender) await f.onRender();
      return { content: `PROTECTED CONTENT ${courseKey} ${cursor}`, components: [{ type: 1, components: [{ type: 2, style: 2, label: 'Next', custom_id: options.unsafeControl ? 'linux-m1-lesson-complete' : buttonId('lesson:0:1') }] }] };
    } });
  f.interaction = (customId, modal = false, changes = {}) => ({ customId, user: { id: actor }, guildId,
    guild: { id: guildId, members: { async fetch(id) { return { id, roles: { cache: new Set(f.role ? [roleId] : []) } }; } } },
    deferred: false, replied: false, messages: [], modal: null, isButton: () => !modal, isModalSubmit: () => modal,
    fields: { getTextInputValue: () => 'NG-fixture' },
    async showModal(value) { this.modal = value.toJSON(); },
    async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; this.messages.push(payload); },
    async editReply(payload) { this.messages.push(payload); }, ...changes });
  return f;
}
async function enter(f, course = first) {
  const open = f.interaction(`cert:course:open:${course}`); await f.navigation.handle(open); assert.ok(open.modal);
  assert.match(open.modal.custom_id, /^cert:course:submit:/);
  const submit = f.interaction(open.modal.custom_id, true); await f.navigation.handle(submit); return submit;
}
const last = i => i.messages.at(-1);
const pageId = i => last(i).components[0].components[0].custom_id;

test('protected navigation requires verified role context and a renderer', () => {
  assert.throws(() => createProtectedCourseNavigation({}, { enabled: true }, guildId), /Explicit course navigation/);
});

test('verified course entry creates bound page controls using SELECT authorization only', async () => {
  const f = fixture(), entered = await enter(f), page = f.interaction(pageId(entered));
  assert.match(last(entered).content, /PROTECTED CONTENT/); assert.equal(f.renders[0].courseKey, first);
  const before = f.queries.length; await f.navigation.handle(page);
  assert.equal(f.queries.length, before + 2); assert.match(last(page).content, /PROTECTED CONTENT/);
  assert.ok(f.queries.every(query => query.sql.startsWith('SELECT') && query.params[0] === actor && query.params[1] === first));
  assert.deepEqual(last(page).allowedMentions, { parse: [] });
});

test('completion invalidates an old course session while another active course remains accessible', async () => {
  const f = fixture(), a = await enter(f, first), b = await enter(f, second);
  f.states.set(first, 'completed'); const old = f.interaction(pageId(a)); await f.navigation.handle(old);
  assert.match(last(old).content, /no longer authorized/);
  const other = f.interaction(pageId(b)); await f.navigation.handle(other); assert.match(last(other).content, /PROTECTED CONTENT/);
  assert.equal(f.renders.at(-1).courseKey, second);
});

test('completion between modal opening and submission blocks content', async () => {
  const f = fixture(), open = f.interaction(`cert:course:open:${first}`); await f.navigation.handle(open);
  f.states.set(first, 'completed'); const submit = f.interaction(open.modal.custom_id, true); await f.navigation.handle(submit);
  assert.match(last(submit).content, /could not be verified/); assert.equal(f.renders.length, 0);
});

test('other accounts and servers cannot consume the session; expiration blocks it', async () => {
  const f = fixture(), entered = await enter(f), id = pageId(entered), before = f.queries.length;
  for (const changes of [{ user: { id: owner } }, { guildId: owner }]) {
    const forged = f.interaction(id, false, changes); await f.navigation.handle(forged); assert.match(last(forged).content, /unavailable/);
  }
  assert.equal(f.queries.length, before);
  const valid = f.interaction(id); await f.navigation.handle(valid); assert.match(last(valid).content, /PROTECTED CONTENT/);
  f.time += 300000; const expired = f.interaction(id); await f.navigation.handle(expired); assert.match(last(expired).content, /expired/);
});

test('permanent-ID rotation, role removal, and database errors deny existing sessions', async () => {
  for (const change of [f => { f.studentId = 'NG-reissued'; }, f => { f.role = false; }, f => { f.failQuery = true; }]) {
    const f = fixture(), entered = await enter(f), before = f.renders.length; change(f);
    const page = f.interaction(pageId(entered)); await f.navigation.handle(page);
    assert.match(last(page).content, /unavailable/); assert.equal(f.renders.length, before);
    assert.ok(!last(page).content.includes('Private database'));
  }
});

test('authorization and expiry are checked again after asynchronous rendering', async () => {
  for (const change of [f => { f.states.set(first, 'completed'); }, f => { f.time += 300000; }]) {
    const f = fixture(), entered = await enter(f); f.onRender = () => change(f);
    const page = f.interaction(pageId(entered)); await f.navigation.handle(page);
    assert.match(last(page).content, /unavailable/); assert.ok(!last(page).content.includes('PROTECTED CONTENT'));
  }
});

test('legacy activity controls are rejected rather than delivered', async () => {
  const f = fixture({ unsafeControl: true }), entered = await enter(f);
  assert.match(last(entered).content, /unavailable/); assert.deepEqual(last(entered).components, []);
});

test('session capacity is bounded and disposal invalidates navigation', async () => {
  const f = fixture({ maxSessions: 1 }), entered = await enter(f, first), blocked = await enter(f, second);
  assert.match(last(blocked).content, /could not be verified/);
  const before = f.queries.length; f.navigation.dispose();
  const page = f.interaction(pageId(entered)); await f.navigation.handle(page); assert.match(last(page).content, /unavailable/);
  assert.equal(f.queries.length, before);
  assert.equal(await f.navigation.handle(f.interaction('cert:section:open:training-readiness')), false);
});

test('unknown sections, malformed cursors, and copied private sources cannot render content', async () => {
  const f = fixture();
  for (const i of [f.interaction('cert:course:open:training-readiness'), f.interaction('cert:course:page:invalid:lesson:0:0'),
    f.interaction(`cert:course:open:${first}`, false, { message: { flags: { has: () => true }, interactionMetadata: { user: { id: owner } } } })]) {
    await f.navigation.handle(i); assert.match(last(i).content, /unavailable/);
  }
  assert.equal(f.renders.length, 0); assert.equal(f.queries.length, 0);
});
