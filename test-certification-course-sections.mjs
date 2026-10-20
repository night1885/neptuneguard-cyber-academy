import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from './course-registry.js';
import { COURSE_SECTION_CATALOG, COURSE_SECTION_KEYS, createCourseSectionAuthorization, createCourseSectionLoginHandler } from './certification-course-sections.js';
import { createSectionIdentityVerifier } from './certification-section-identity.js';

const actor = '1223123544301633568', owner = '1223123544301633567', guildId = '1339276399390887957';
const config = { enabled: true, ownerId: owner };
const [first, second] = COURSE_SECTION_KEYS;
function enrollment() { return { discord_user_id: actor, status: 'approved', student_id: 'NG-fixture', approved_by: owner, approved_at: new Date(),
  signature_method: 'discord_account', acknowledgment_name: null, signature_reference: null, agreement_version: 'fixture', agreement_content_sha256: 'a'.repeat(64),
  acknowledged_at: new Date(), learner_confirmed_read_at: new Date(), comprehension_passed_at: new Date(), comprehension_check_version: 'fixture-check',
  age_eligible: true, age_declared_at: new Date(), age_declaration_version: 'adult-18-v1',
  application_closed_at: null, application_closed_by: null, application_closed_as: null }; }
function fixture() {
  const states = new Map(COURSE_SECTION_KEYS.map(key => [key, 'active'])), calls = [];
  return { states, calls, pool: { async query(sql, params) {
    calls.push({ sql, params }); assert.match(sql, /JOIN certification_course_enrollments/);
    if (params[0] !== actor || states.get(params[1]) !== 'active') return { rows: [] };
    return { rows: [{ ...enrollment(), course_status: 'active', authorized_course_key: params[1] }] };
  } } };
}
function interaction(customId, modal = false, studentId = 'NG-fixture') {
  return { customId, user: { id: actor }, guildId, deferred: false, replied: false, messages: [], modal: null,
    isButton: () => !modal, isModalSubmit: () => modal, fields: { getTextInputValue: () => studentId },
    async showModal(value) { this.modal = value.toJSON(); },
    async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; },
    async reply(payload) { this.replied = true; this.messages.push(payload); },
    async editReply(payload) { this.messages.push(payload); } };
}

test('course section mapping uses exact registry keys and title metadata only', () => {
  assert.deepEqual([...COURSE_SECTION_KEYS], COURSES.map(course => course.key));
  assert.ok(COURSE_SECTION_KEYS.length > 1); assert.ok(COURSE_SECTION_KEYS.includes('linux-fundamentals'));
  assert.ok(!COURSE_SECTION_KEYS.includes('training-readiness'));
  assert.ok(Object.isFrozen(COURSE_SECTION_KEYS) && Object.isFrozen(COURSE_SECTION_CATALOG));
  for (const course of COURSE_SECTION_CATALOG) { assert.deepEqual(Object.keys(course), ['key', 'title']); assert.ok(Object.isFrozen(course)); }
});

test('course authorization reads the requested course freshly and never falls back to global enrollment', async () => {
  const f = fixture(), authorize = createCourseSectionAuthorization(f.pool, config);
  assert.equal((await authorize(actor, first)).course_key, first);
  f.states.set(first, 'completed'); assert.equal(await authorize(actor, first), null);
  assert.equal((await authorize(actor, second)).course_key, second);
  const count = f.calls.length;
  assert.equal(await authorize(actor, 'training-readiness'), null); assert.equal(await authorize(actor, 'unknown-course'), null);
  assert.equal(f.calls.length, count);
  assert.deepEqual(f.calls.map(call => call.params), [[actor, first], [actor, first], [actor, second]]);
});

test('course-scoped identity requires both the account-bound ID and exact requested course', async () => {
  let returnedCourse = second; const calls = [];
  const verifier = createSectionIdentityVerifier({}, config, guildId, { sections: COURSE_SECTION_KEYS, readLimits: { limit: 20 },
    async authorizeCourseSection(subject, section) { calls.push([subject, section]); return { student_id: 'NG-fixture', course_key: returnedCourse }; } });
  const request = { discordUserId: actor, guildId, studentId: 'NG-fixture', section: first };
  assert.equal(await verifier.verify(request), false); returnedCourse = first;
  assert.equal(await verifier.verify(request), true);
  assert.equal(await verifier.verify({ ...request, studentId: 'someone-else' }), false);
  const count = calls.length;
  assert.equal(await verifier.verify({ ...request, guildId: actor }), false);
  assert.equal(await verifier.verify({ ...request, section: 'training-readiness' }), false); assert.equal(calls.length, count);
  assert.throws(() => createSectionIdentityVerifier({}, config, guildId, { sections: COURSE_SECTION_KEYS, authorizeCourseSection: true }), /authorizer/);
});

test('course entry rechecks completion at modal submission and permits another active course', async () => {
  const f = fixture(), verified = [];
  const handler = createCourseSectionLoginHandler(f.pool, config, guildId, { async onVerified(i, section) { verified.push([i.user.id, section]); } });
  const openFirst = interaction(`cert:section:open:${first}`); await handler(openFirst); assert.ok(openFirst.modal);
  f.states.set(first, 'completed');
  const submitFirst = interaction(openFirst.modal.custom_id, true); await handler(submitFirst);
  assert.equal(verified.length, 0); assert.match(submitFirst.messages.at(-1).content, /could not be verified/);
  const openSecond = interaction(`cert:section:open:${second}`); await handler(openSecond);
  const submitSecond = interaction(openSecond.modal.custom_id, true); await handler(submitSecond);
  assert.deepEqual(verified, [[actor, second]]);
  const replay = interaction(openSecond.modal.custom_id, true); await handler(replay);
  assert.equal(verified.length, 1); assert.match(replay.messages.at(-1).content, /could not be verified/);
});

test('course entry rejects the separate readiness section and ignores attempts to replace its allowlist', async () => {
  const f = fixture(), handler = createCourseSectionLoginHandler(f.pool, config, guildId, { sections: ['training-readiness'],
    authorizeCourseSection() { assert.fail('Untrusted override must not be used'); }, async onVerified() { assert.fail('Readiness is not a curriculum course'); } });
  const open = interaction('cert:section:open:training-readiness'); await handler(open);
  assert.equal(open.modal, null); assert.match(open.messages.at(-1).content, /could not be verified/); assert.equal(f.calls.length, 0);
});

test('legacy section verifier retains default enrollment checks when no course authorizer is supplied', async () => {
  const queries = []; const pool = { async query(sql) { queries.push(sql); return { rows: [enrollment()] }; } };
  const verifier = createSectionIdentityVerifier(pool, config, guildId, { sections: ['training-readiness'] });
  assert.equal(await verifier.verify({ discordUserId: actor, guildId, studentId: ' NG-fixture ', section: 'training-readiness' }), true);
  assert.equal(queries.length, 1); assert.ok(!queries[0].includes('JOIN certification_course_enrollments'));
});

test('database errors deny course-specific ID verification without falling back', async () => {
  let calls = 0; const pool = { async query() { calls++; throw new Error('Missing course schema'); } };
  const verifier = createSectionIdentityVerifier(pool, config, guildId, { sections: COURSE_SECTION_KEYS, authorizeCourseSection: createCourseSectionAuthorization(pool, config) });
  assert.equal(await verifier.verify({ discordUserId: actor, guildId, studentId: 'NG-fixture', section: first }), false); assert.equal(calls, 1);
});
