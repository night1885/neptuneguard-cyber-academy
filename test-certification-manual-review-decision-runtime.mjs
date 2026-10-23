import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import { loadCertificationConfig } from './certification-config.js';
import { readReadOnlyPreviewFlag, createReadOnlyPreviewPool, createReadOnlyPreviewRouter } from './certification-read-only-preview.js';
import { readRegistrationPilotOptions, createRegistrationPilotPolicy, createRegistrationPilotRouter } from './certification-registration-pilot-guard.js';

// Exercises the actual runtime body and pilot router with synthetic startup/Discord dependencies.
const owner = '222222222222222222', student = '111111111111111111', guild = '333333333333333333', channel = '444444444444444444';
const tick = () => new Promise(resolve => setImmediate(resolve));
async function fixture({ enabled = true, failSchema = false, failDecision = false, failConstruction = false, initializeGate, disposeGate, decisionGate } = {}) {
  const env = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_ENABLED: 'true', CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: enabled ? 'true' : 'false',
    CERTIFICATION_REGISTRATION_PILOT: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'false', CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false',
    CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false', ACADEMY_OWNER_ID: owner, ACADEMY_ADMIN_CHANNEL_ID: channel,
    GUILD_ID: guild, CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS: student,
    CERTIFICATION_ENROLLMENT_MANIFEST_JSON: JSON.stringify({ agreementVersion: 'runtime-v1', agreementSha256: 'a'.repeat(64),
      comprehensionCheck: { version: 'check-v1', questions: [{ prompt: 'Synthetic question?' }], correctAnswers: ['Synthetic guide'] } }) };
  const client = new EventEmitter(), bot = {}, everyone = {}, trace = [], state = { factories: 0, initializes: 0, decisions: 0, disposes: 0, ends: 0, entered: false, stopped: false };
  client.isReady = () => false;
  client.guilds = { async fetch() { return { roles: { everyone }, members: { async fetch() { return {}; }, async fetchMe() { return bot; } } }; } };
  client.channels = { async fetch() { return { guildId: guild, isTextBased: () => true, send() { assert.fail('No publication'); },
    permissionsFor: member => ({ has: () => member === bot }) }; } };
  const backing = { async connect() { return { async query() { return { rows: [] }; }, release() {} }; }, async end() { state.ends++; } };
  const base = async interaction => { await interaction.reply({ content: 'Synthetic read view' }); return true; };
  base.initialize = async () => { trace.push('base-initialize'); };
  base.dispose = () => { trace.push('base-dispose'); };
  let captured;
  const createDecisionHandler = (config, targetGuild, options) => {
    state.factories++; captured = options; assert.equal(targetGuild, guild); assert.equal(config.manualReviewDecisionsEnabled, true);
    if (failConstruction) throw new Error('Synthetic constructor failure');
    const handler = async interaction => { state.decisions++; state.entered = true; if (decisionGate) await decisionGate; await interaction.reply({ content: 'Synthetic decision branch' }); return true; };
    handler.ready = false;
    handler.initialize = async () => {
      state.initializes++; trace.push('decision-initialize');
      if (initializeGate) await initializeGate;
      if (failDecision || state.stopped) throw new Error('Synthetic decision readiness failure');
      handler.ready = true; return { ready: true };
    };
    handler.dispose = async () => { state.disposes++; state.stopped = true; handler.ready = false; trace.push('decision-dispose'); if (disposeGate) await disposeGate; };
    return handler;
  };
  const context = { Events: { InteractionCreate: 'interactionCreate', ClientReady: 'clientReady' }, PermissionFlagsBits: { ViewChannel: 1, SendMessages: 2, EmbedLinks: 4 },
    console: { log() {}, error() {} }, loadCertificationConfig, readReadOnlyPreviewFlag, createReadOnlyPreviewPool, createReadOnlyPreviewRouter,
    readRegistrationPilotOptions, createRegistrationPilotPolicy, createRegistrationPilotRouter,
    readApplicationClosureFlag: () => false, readCourseRuntimeOptions: () => ({ enabled: false }),
    loadCertificationDatabaseConnection: () => ({ connectionString: 'synthetic-primary' }), createCertificationDatabasePool: () => backing,
    createCertificationRouter: () => base, createClosureRuntimeRouter() { assert.fail(); }, createCourseRuntimeRouter() { assert.fail(); },
    createCertificationService: () => ({ async getCourseAuthorization() { assert.fail('Pilot course authorization must remain blocked'); } }),
    validateCertificationSchema: async database => { trace.push('schema'); if (failSchema) throw new Error('Synthetic schema failure'); await database.query('SELECT 1'); },
    validateActiveEnrollmentAgreement: async database => { trace.push('agreement'); await database.query('SELECT 1'); },
    createRegistrationPilotHandlers: () => ({ registration: async () => true, learner: async () => true }),
    createOwnerRegistrationHandler() {}, createInvitationInteractionHandler() {}, replyRetentionHold: interaction => interaction.reply({ content: 'Synthetic hold', flags: 64 }) };
  const source = await readFile(new URL('./certification-runtime.js', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import [^\n]*\n/gm, '').replace(/^export /gm, '') + ';globalThis.attach=attachCertificationRuntime;', context);
  let runtime;
  try { runtime = context.attach(client, undefined, guild, env, { createDecisionHandler }); }
  catch (error) { error.state = state; error.listeners = client.eventNames().length; throw error; }
  return { runtime, client, trace, state, backing, env, get captured() { return captured; },
    async start(expected = true) { client.emit('clientReady'); for (let n = 0; n < 60 && !runtime.ready; n++) await tick(); assert.equal(runtime.ready, expected); },
    async dispatch(interaction) { client.emit('interactionCreate', interaction); for (let n = 0; n < 60 && !interaction.messages.length; n++) await tick(); assert.ok(interaction.messages.length); } };
}
function request() {
  const messages = [];
  const item = { customId: `cert:review:open:${student}`, user: { id: owner }, guildId: guild, channelId: channel, messages, deferred: false, replied: false,
    isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
    message: { flags: { has: flag => flag === 64 }, interactionMetadata: { user: { id: owner } } },
    async reply(payload) { messages.push(payload); item.replied = true; }, async followUp(payload) { messages.push(payload); }, async editReply(payload) { messages.push(payload); } };
  return item;
}
test('default-off runtime never constructs or routes a decision handler', async () => {
  const f = await fixture({ enabled: false });
  try { await f.start(); await f.dispatch(request()); assert.equal(f.state.factories, 0); assert.equal(f.state.decisions, 0); assert.equal(f.runtime.manualReviewDecisionsReady, false); }
  finally { await f.runtime.detach(); }
});
test('runtime initializes decisions after primary schema and agreement checks and keeps courses blocked', async () => {
  const f = await fixture();
  try {
    assert.equal(f.state.factories, 1); assert.equal(f.state.initializes, 0);
    assert.notEqual(f.captured.readPool, f.backing); assert.notEqual(f.captured.env, f.env);
    await assert.rejects(f.captured.readPool.connect());
    await f.start(); assert.equal(f.runtime.manualReviewDecisionsReady, true);
    assert.ok(f.trace.indexOf('decision-initialize') > f.trace.indexOf('agreement'));
    assert.ok(f.trace.indexOf('decision-initialize') > f.trace.indexOf('base-initialize'));
    const interaction = request(); await f.dispatch(interaction); assert.equal(f.state.decisions, 1); assert.equal(interaction.messages[0].flags, 64);
    assert.equal(await f.runtime.getCourseAuthorization(student), null);
  } finally { await f.runtime.detach(); }
  assert.equal(f.state.disposes, 1); assert.equal(f.state.ends, 1);
});
for (const options of [{ failSchema: true }, { failDecision: true }]) test(`startup failure holds decision admission: ${JSON.stringify(options)}`, async () => {
  const f = await fixture(options);
  try { await f.start(false); await f.dispatch(request()); assert.equal(f.state.decisions, 0); assert.equal(f.runtime.manualReviewDecisionsReady, false); if (options.failSchema) assert.equal(f.state.initializes, 0); }
  finally { await f.runtime.detach(); }
});
test('runtime waits for asynchronous decision disposal before closing the primary pool', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture({ disposeGate: gate });
  try { await f.start(); const closing = f.runtime.detach(); assert.equal(closing, f.runtime.detach()); await tick(); assert.equal(f.state.ends, 0); release(); await closing; assert.equal(f.state.ends, 1); assert.equal(f.state.disposes, 1); }
  finally { release(); await f.runtime.detach(); }
});
test('runtime drains admitted decision work and ignores late events during detach', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture({ decisionGate: gate });
  try {
    await f.start(); f.client.emit('interactionCreate', request());
    for (let n = 0; n < 60 && !f.state.entered; n++) await tick(); assert.equal(f.state.entered, true);
    const closing = f.runtime.detach(); await tick(); assert.equal(f.state.ends, 0);
    const late = request(); f.client.emit('interactionCreate', late); await tick(); assert.equal(late.messages.length, 0);
    release(); await closing; assert.equal(f.state.ends, 1); assert.equal(f.client.eventNames().length, 0);
  } finally { release(); await f.runtime.detach(); }
});
test('decision constructor failure closes primary backing before listener registration', async () => {
  await assert.rejects(fixture({ failConstruction: true }), error => error.state.ends === 1 && error.listeners === 0);
});
