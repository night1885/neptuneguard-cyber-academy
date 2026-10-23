import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { loadCertificationConfig } from './certification-config.js';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
import { handleConsoleStudent } from './certification-console-student.js';
import { readRegistrationPilotOptions, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';

const owner = '222222222222222222', student = '111111111111111111', guild = '333333333333333333', channel = '444444444444444444';
function fixture({ enabled = true, allowlist = student, recordPatch = {}, configPatch = {} } = {}) {
  const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: enabled ? 'true' : 'false',
    CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'false', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: channel,
    GUILD_ID: guild, CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: allowlist,
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'entry-v1', agreementSha256: 'a'.repeat(64),
      comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['Synthetic guide'] } }) };
  const config = { ...loadCertificationConfig(env), ...configPatch }, at = new Date();
  const record = { discord_user_id: student, student_id: null, status: 'pending', signature_method: 'discord_account',
    acknowledgment_name: null, signature_reference: null, agreement_version: 'entry-v1', agreement_content_sha256: 'a'.repeat(64),
    acknowledged_at: at, learner_confirmed_read_at: at, comprehension_check_version: 'check-v1', comprehension_submitted_at: at, comprehension_passed_at: null,
    comprehension_review_snapshot: createManualReviewSnapshot(config, ['Synthetic response']), age_eligible: true, age_declared_at: at,
    age_declaration_version: 'adult-18-v1', approved_by: null, approved_at: null, created_at: at, updated_at: at, ...recordPatch };
  const queries = [], pool = { async query(sql) {
    queries.push(sql); assert.ok(sql.startsWith('SELECT'));
    if (sql.startsWith('SELECT comprehension_submitted_at')) return { rows: [{ comprehension_submitted_at: record.comprehension_submitted_at, comprehension_review_snapshot: record.comprehension_review_snapshot }] };
    if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }] };
    if (sql.includes('FROM certification_audit_events')) return { rows: [] };
    return { rows: [{ ...record }] };
  } };
  return { config, env, record, pool, queries };
}
function request({ actor = owner, server = guild, targetChannel = channel, customId = `cert:students:detail:${student}` } = {}) {
  const messages = [];
  const item = { customId, user: { id: actor }, guildId: server, channelId: targetChannel, deferred: false, replied: false,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    message: { flags: { has: flag => flag === 64 }, interactionMetadata: { user: { id: actor } } },
    async deferReply(payload) { assert.equal(payload.flags, 64); item.deferred = true; },
    async reply(payload) { messages.push(payload); item.replied = true; }, async followUp(payload) { messages.push(payload); }, async editReply(payload) { messages.push(payload); } };
  return { item, messages };
}
const data = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const entries = payload => (payload.components || []).flatMap(row => data(row).components).filter(button => button.custom_id?.startsWith('cert:review:open:'));
test('eligible owner record exposes one SDK-valid read-only review entry within component limits', async () => {
  const f = fixture(), before = structuredClone(f.record), i = request();
  await handleConsoleStudent(i.item, f.pool, f.config, guild);
  const payload = i.messages[0], controls = entries(payload);
  assert.equal(controls.length, 1); assert.equal(controls[0].custom_id, `cert:review:open:${student}`);
  assert.equal(controls[0].label, 'Review responses and decide');
  assert.ok(payload.components.length <= 5);
  for (const row of payload.components) { assert.ok(data(row).components.length <= 5); assert.doesNotThrow(() => new ActionRowBuilder(data(row)).toJSON()); }
  for (const embed of payload.embeds) assert.doesNotThrow(() => new EmbedBuilder(data(embed)).toJSON());
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.deepEqual(f.record, before); assert.ok(f.queries.every(sql => sql.startsWith('SELECT')));
  assert.ok(Object.isFrozen(f.config.manualReviewDecisionStudentIds));
});
for (const options of [{ enabled: false }, { allowlist: '555555555555555555' }, { recordPatch: { status: 'approved' } },
  { recordPatch: { status: 'denied' } }, { recordPatch: { age_eligible: false } }, { recordPatch: { approved_by: owner } },
  { recordPatch: { agreement_content_sha256: 'b'.repeat(64) } }, { recordPatch: { student_id: '' } },
  { configPatch: { manualReviewDecisionStudentIds: [student] } }]) test(`ineligible records or untrusted UI scope show no decision entry: ${JSON.stringify(options)}`, async () => {
  const f = fixture(options), i = request(); await handleConsoleStudent(i.item, f.pool, f.config, guild);
  assert.equal(entries(i.messages[0]).length, 0);
});
test('entry is absent outside the admin channel and from audit timelines', async () => {
  for (const options of [{ targetChannel: '555555555555555555' }, { customId: `cert:student-audit:${student}:0` }]) {
    const f = fixture(), i = request(options); await handleConsoleStudent(i.item, f.pool, f.config, guild); assert.equal(entries(i.messages[0]).length, 0);
  }
});
test('unauthorized actors and guilds are rejected before reading responses', async () => {
  for (const options of [{ actor: student }, { server: '555555555555555555' }]) {
    const f = fixture(), i = request(options); await handleConsoleStudent(i.item, f.pool, f.config, guild);
    assert.equal(f.queries.length, 0); assert.equal(i.messages[0].flags, 64); assert.doesNotMatch(JSON.stringify(i.messages), /Synthetic guide|Synthetic response/);
  }
});
test('actual pilot router preserves the entry and routes its click only to the ready decision branch', async () => {
  const f = fixture(); let opened = 0;
  const decision = async i => { opened++; await i.reply({ content: 'Synthetic fresh review opened' }); return true; };
  decision.initialize = async () => ({ ready: true }); decision.dispose = () => {};
  const route = createRegistrationPilotRouter({ settings: readRegistrationPilotOptions(f.env),
    readViews: i => handleConsoleStudent(i, f.pool, f.config, guild), registration: async () => true, learner: async () => true,
    ownerDecisionsEnabled: true, ownerDecisions: decision });
  try {
    await route.initialize(); const i = request(); await route(i.item);
    const control = entries(i.messages[0])[0]; assert.ok(control); assert.notEqual(control.disabled, true);
    const click = request({ customId: control.custom_id }); await route(click.item); assert.equal(opened, 1);
    assert.equal(click.messages[0].flags, 64); assert.ok(f.queries.every(sql => sql.startsWith('SELECT')));
  } finally { await route.dispose(); }
});
