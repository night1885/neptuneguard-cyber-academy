import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { Client, GatewayIntentBits, MessageManager } from 'discord.js';
import { createInstructorApplication, createInstructorClientOptions } from './instructor-application.js';
const admin = '111111111111111111', student = '222222222222222222', guildId = '333333333333333333';
const tick = () => new Promise(resolve => setImmediate(resolve));
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function fixture() {
  const client = new EventEmitter(), signals = new EventEmitter(), logs = [], exits = [], calls = [];
  client.login = async () => { calls.push('login'); }; client.destroy = () => { calls.push('destroy'); };
  client.users = { fetch() { assert.fail('Instructor mode cannot fetch learners'); } };
  const app = createInstructorApplication({ client, guildId, adminId: admin, signals, exit: code => exits.push(code), log: message => logs.push(message) });
  function interaction(kind = 'command', id = 'catalog', changes = {}) {
    const replies = [], deferrals = [];
    const i = { guildId, user: { id: admin }, commandName: kind === 'command' ? id : undefined, customId: kind === 'command' ? undefined : id,
      memberPermissions: { has: () => true }, isChatInputCommand: () => kind === 'command', isButton: () => kind === 'button',
      isModalSubmit: () => kind === 'modal', isStringSelectMenu: () => kind === 'menu', deferred: false, replied: false,
      fields: { getTextInputValue() { assert.fail('Instructor mode cannot read enrollment fields'); } },
      async reply(payload) { assert.equal(payload.flags, 64); this.replied = true; replies.push(payload); },
      async deferReply(payload) { assert.equal(payload.flags, 64); this.deferred = true; deferrals.push(payload); },
      async editReply(payload) { replies.push(payload); }, ...changes };
    return { i, replies, deferrals };
  }
  return { app, client, signals, logs, exits, calls, interaction };
}
test('explicit valid admin and guild are required', () => {
  for (const [adminId, guild] of [[undefined, guildId], [student, undefined], ['invalid', guildId], [admin, 'invalid']]) {
    assert.throws(() => createInstructorApplication({ client: {}, adminId, guildId: guild }), /Explicit valid/);
  }
});
for (const [kind, id] of [['command', 'start'], ['command', 'catalog'], ['button', 'cert:admin:courses:module:0:0:0']]) {
  for (const changes of [{ user: { id: student } }, { guildId: null }, { guildId: student }]) {
    test(`instructor ${id} rejects wrong identity/server ${JSON.stringify(changes)}`, async () => {
      const f = fixture(), x = f.interaction(kind, id, changes); await f.app.handle(x.i);
      assert.match(x.replies[0].content, /restricted to the configured admin and server/);
      assert.deepEqual(x.replies[0].embeds, []); assert.deepEqual(x.replies[0].components, []);
      assert.deepEqual(x.replies[0].allowedMentions, { parse: [] }); assert.equal(x.deferrals.length, 0);
    });
  }
}
test('instructor home uses existing start/catalog commands and course entry', async () => {
  for (const [kind, id] of [['command', 'start'], ['command', 'catalog'], ['button', 'cert:admin:overview:0']]) {
    const f = fixture(), x = f.interaction(kind, id); await f.app.handle(x.i);
    assert.equal(x.replies[0].embeds[0].title, 'NeptuneGuard — Instructor curriculum');
    assert.equal(x.replies[0].components[0].components[0].custom_id, 'cert:admin:courses:0');
    assert.match(x.replies[0].embeds[0].description, /No learner accounts/);
  }
});
for (const id of ['cert:admin:courses:0', 'cert:admin:courses:course:0:0', 'cert:admin:courses:module:0:0:0']) {
  test(`actual curriculum renderer works without a database: ${id}`, async () => {
    const f = fixture(), x = f.interaction('button', id); await f.app.handle(x.i);
    assert.equal(x.deferrals.length, 1); assert.equal(x.replies.length, 1); assert.ok(x.replies[0].embeds.length);
    const payload = x.replies[0]; assert.ok(payload.components.length <= 5);
    assert.deepEqual(payload.allowedMentions, { parse: [] });
    assert.ok(payload.embeds.every(embed => (json(embed).description || '').length <= 4096));
    assert.ok(payload.components.flatMap(row => json(row).components).some(button => button.custom_id === 'cert:admin:overview:0'));
  });
}
test('learner commands and record-changing forms cannot invoke legacy handlers', async () => {
  for (const [kind, id] of [...['begin', 'continue', 'progress', 'badges', 'student-progress'].map(id => ['command', id]),
    ['button', 'linux-m1-lesson-complete'], ['button', 'academy:linux-administration:1:answer-a'], ['button', 'cert:register:open'],
    ['modal', 'cert:submit:send:00000000-0000-0000-0000-000000000000'], ['menu', 'cert:admin:section']]) {
    const f = fixture(), x = f.interaction(kind, id); await f.app.handle(x.i);
    assert.match(x.replies[0].content, /does not provide student registration/); assert.deepEqual(x.replies[0].components, []);
  }
});
test('invalid course routes fail closed', async () => {
  const f = fixture(), x = f.interaction('button', 'cert:admin:courses:module:99999:0:0'); await f.app.handle(x.i);
  assert.match(x.replies[0].content, /Invalid course/); assert.deepEqual(x.replies[0].embeds, []);
});
test('SDK options disable user and message caches without enabling member/content intents', async () => {
  const options = createInstructorClientOptions(), client = new Client(options);
  try {
    assert.deepEqual(options.intents, [GatewayIntentBits.Guilds]);
    client.users.cache.set(student, { id: student }); assert.equal(client.users.cache.size, 0);
    const messages = options.makeCache(MessageManager); messages.set('fixture', {}); assert.equal(messages.size, 0);
  } finally { await client.destroy(); }
});
test('events and shutdown are isolated and application logs omit interaction/error details', async () => {
  const f = fixture(); await f.app.start('fixture-only');
  const x = f.interaction('command', 'catalog'); f.client.emit('interactionCreate', x.i); await tick(); assert.equal(x.replies.length, 1);
  f.client.emit('error', new Error('PRIVATE-TOKEN-AND-PAYLOAD')); assert.doesNotMatch(JSON.stringify(f.logs), /PRIVATE|222222222222222222/);
  const first = f.app.shutdown(); assert.equal(f.app.shutdown(), first); await first;
  assert.deepEqual(f.exits, [0]); assert.equal(f.calls.filter(call => call === 'destroy').length, 1);
  assert.equal(f.client.eventNames().length, 0); assert.equal(f.signals.eventNames().length, 0);
});
test('handler failure returns generic private response and logs no raw exception', async () => {
  const f = fixture(), x = f.interaction('command', 'catalog'); let failed = false;
  x.i.reply = async payload => { if (!failed) { failed = true; throw new Error('PRIVATE-DETAIL'); } x.replies.push(payload); };
  await f.app.handle(x.i); assert.match(x.replies[0].content, /could not be completed/);
  assert.doesNotMatch(JSON.stringify([f.logs, x.replies]), /PRIVATE-DETAIL/);
});
test('new startup import graph has no database or learner-runtime dependency', async () => {
  const seen = new Set();
  async function visit(file) {
    const url = new URL(file, import.meta.url); if (seen.has(url.href)) return; seen.add(url.href);
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /new\s+Pool\b|initializeDatabase|attachCertificationRuntime|createAcademyApplication|pool\.(query|connect)/, file);
    for (const match of source.matchAll(/^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gm)) {
      const target = match[1];
      if (target.startsWith('.')) await visit(new URL(target, url).href);
      else assert.ok(['discord.js', 'dotenv/config'].includes(target), `${file}: unexpected dependency ${target}`);
    }
  }
  await visit('./instructor.js'); assert.ok(seen.size >= 4);
  const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.start, 'node instructor.js'); assert.equal(pkg.main, 'instructor.js');
  const entry = await readFile(new URL('./instructor.js', import.meta.url), 'utf8');
  assert.doesNotMatch(entry, /DATABASE_URL|VERIFIED_ROLE_ID|CERTIFICATION_ENABLED|CERTIFICATION_DATABASE_URL/);
  const syntax = spawnSync(process.execPath, ['--check', 'instructor.js'], { cwd: new URL('.', import.meta.url), encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
});
