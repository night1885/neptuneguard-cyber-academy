import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createInstructorApplication } from './instructor-application.js';
import { courseContentText, handleConsoleCourses } from './certification-console-courses.js';
import { COURSES } from './course-registry.js';
const admin = '111111111111111111', other = '222222222222222222', guildId = '333333333333333333';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function fixture() {
  const client = new EventEmitter(), messages = [], acknowledgments = [], edits = [], logs = [];
  client.login = async () => {}; client.destroy = () => {};
  const app = createInstructorApplication({ client, guildId, adminId: admin, signals: new EventEmitter(), exit() {}, log: message => logs.push(message) });
  const makeMessage = (payload, privateMessage = true) => ({ payload, flags: { has: flag => privateMessage && flag === 64 } });
  function interaction(kind, id, message, changes = {}) {
    return { guildId, user: { id: admin }, message, commandName: kind === 'command' ? id : undefined, customId: kind === 'button' ? id : undefined,
      isChatInputCommand: () => kind === 'command', isButton: () => kind === 'button', isModalSubmit: () => false, isStringSelectMenu: () => false,
      deferred: false, replied: false, response: undefined,
      async reply(payload) {
        assert.equal(payload.flags, 64); assert.equal(this.deferred || this.replied, false);
        this.replied = true; this.response = makeMessage(payload); messages.push(this.response); acknowledgments.push('reply');
      },
      async deferReply(payload) {
        assert.equal(payload.flags, 64); assert.equal(this.deferred || this.replied, false);
        this.deferred = true; this.response = makeMessage({}); messages.push(this.response); acknowledgments.push('deferReply');
      },
      async deferUpdate() {
        assert.equal(this.message.flags.has(64), true); assert.equal(this.deferred || this.replied, false);
        this.deferred = true; this.response = this.message; acknowledgments.push('deferUpdate');
      },
      async update(payload) {
        assert.equal(this.message.flags.has(64), true); assert.equal(this.deferred || this.replied, false);
        this.replied = true; this.response = this.message; this.message.payload = payload; edits.push(this.message); acknowledgments.push('update');
      },
      async editReply(payload) {
        assert.ok(this.deferred || this.replied); assert.ok(this.response);
        this.response.payload = payload; edits.push(this.response);
      }, ...changes };
  }
  async function open(command = 'catalog') { await app.handle(interaction('command', command)); return messages.at(-1); }
  async function click(id, message, changes) { const i = interaction('button', id, message, changes); await app.handle(i); return i; }
  return { app, interaction, open, click, makeMessage, messages, acknowledgments, edits, logs };
}
for (const command of ['start', 'catalog']) {
  test(`${command} opens one private admin dashboard`, async () => {
    const f = fixture(), panel = await f.open(command);
    assert.equal(f.messages.length, 1); assert.deepEqual(f.acknowledgments, ['reply']);
    assert.match(panel.payload.embeds[0].author.name, /Admin Dashboard/);
    assert.equal(panel.payload.components[0].components[0].label, 'Course Overview');
    assert.deepEqual(panel.payload.allowedMentions, { parse: [] });
  });
}
test('course, module, refresh, back, and dashboard navigation reuse the original private panel', async () => {
  const f = fixture(), panel = await f.open();
  for (const id of ['cert:admin:courses:0', 'cert:admin:courses:course:0:0', 'cert:admin:courses:module:0:0:0',
    'cert:admin:courses:course:0:0', 'cert:admin:courses:0', 'cert:admin:overview:0']) {
    await f.click(id, panel); assert.equal(f.messages.length, 1); assert.equal(f.edits.at(-1), panel);
    assert.deepEqual(panel.payload.allowedMentions, { parse: [] }); assert.ok(panel.payload.embeds.length);
  }
  assert.equal(f.acknowledgments.filter(value => value === 'deferUpdate').length, 5);
  assert.equal(f.acknowledgments.at(-1), 'update'); assert.equal(f.acknowledgments.includes('deferReply'), false);
  assert.match(panel.payload.embeds[0].author.name, /Admin Dashboard/);
});
test('next and previous curriculum pages preserve one message and complete registered content', async () => {
  const f = fixture(), panel = await f.open();
  const course = COURSES[0], expected = courseContentText(course.modules[0]), pages = Math.max(1, Math.ceil(expected.length / 3500));
  let actual = '';
  for (let page = 0; page < pages; page++) {
    await f.click(`cert:admin:courses:module:0:0:${page}`, panel);
    actual += json(panel.payload.embeds[0]).description;
  }
  assert.equal(actual, expected);
  for (let page = pages - 1; page >= 0; page--) await f.click(`cert:admin:courses:module:0:0:${page}`, panel);
  const modulePages = Math.max(1, Math.ceil(course.modules.length / 5));
  for (let page = 0; page < modulePages; page++) await f.click(`cert:admin:courses:course:0:${page}`, panel);
  for (let page = modulePages - 1; page >= 0; page--) await f.click(`cert:admin:courses:course:0:${page}`, panel);
  assert.equal(f.messages.length, 1); assert.ok(f.edits.every(message => message === panel));
  assert.ok(f.acknowledgments.slice(1).every(value => value === 'deferUpdate'));
});
for (const id of ['cert:admin:overview:0', 'cert:admin:courses:module:0:0:0']) {
  for (const changes of [{ user: { id: other } }, { guildId: null }, { guildId: other }]) {
    test(`unauthorized ${id} never edits the source panel ${JSON.stringify(changes)}`, async () => {
      const f = fixture(), panel = await f.open(), original = panel.payload; await f.click(id, panel, changes);
      assert.equal(panel.payload, original); assert.equal(f.edits.length, 0); assert.equal(f.messages.length, 2);
      assert.deepEqual(f.acknowledgments, ['reply', 'reply']);
      assert.match(f.messages.at(-1).payload.content, /restricted to the configured admin and server/);
    });
  }
}
for (const id of ['cert:admin:overview:0', 'cert:admin:courses:module:0:0:0']) {
  test(`public or unverified source messages use a new private reply for ${id}`, async () => {
    for (const source of [{ flags: { has: () => false }, payload: { content: 'public fixture' } }, { payload: { content: 'unknown fixture' } }]) {
      const f = fixture(), original = source.payload; await f.click(id, source);
      assert.equal(source.payload, original); assert.equal(f.messages.length, 1); assert.ok(f.messages[0].payload.embeds.length);
      assert.equal(f.acknowledgments.some(value => value === 'update' || value === 'deferUpdate'), false);
    }
  });
}
test('invalid navigation clears stale curriculum in place without creating another message', async () => {
  const f = fixture(), panel = await f.open(); await f.click('cert:admin:courses:module:99999:0:0', panel);
  assert.equal(f.messages.length, 1); assert.match(panel.payload.content, /Invalid course/);
  assert.deepEqual(panel.payload.embeds, []); assert.deepEqual(panel.payload.components, []);
});
test('an edit failure after deferUpdate produces a generic error in the same panel', async () => {
  const f = fixture(), panel = await f.open(), i = f.interaction('button', 'cert:admin:courses:0', panel);
  const edit = i.editReply; let fail = true;
  i.editReply = async function(payload) { if (fail) { fail = false; throw new Error('PRIVATE-FAILURE'); } return edit.call(this, payload); };
  await f.app.handle(i);
  assert.equal(f.messages.length, 1); assert.match(panel.payload.content, /could not be completed/);
  assert.deepEqual(panel.payload.embeds, []); assert.deepEqual(panel.payload.components, []);
  assert.doesNotMatch(JSON.stringify([f.logs, panel.payload]), /PRIVATE-FAILURE/);
});
test('the shared renderer retains its default new-private-reply behavior outside the instructor adapter', async () => {
  const f = fixture(), panel = await f.open(), original = panel.payload;
  const i = f.interaction('button', 'cert:admin:courses:0', panel);
  await handleConsoleCourses(i, { enabled: true, ownerId: admin }, guildId);
  assert.equal(panel.payload, original); assert.equal(f.messages.length, 2); assert.equal(f.acknowledgments.at(-1), 'deferReply');
});
