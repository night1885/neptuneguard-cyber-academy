import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';
const owner = '1223123544301633567', guild = '1330353166830665859';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
for (const privateSource of [false, true]) {
  test(`configuration retains admin branding and Overview navigation with privateSource=${privateSource}`, async () => {
    const replies = [], calls = [];
    const pool = { query() { assert.fail('Configuration navigation must not query'); }, connect() { assert.fail('Configuration navigation must not write'); } };
    const config = { enabled: true, ownerId: owner };
    const interaction = { customId: 'cert:console:settings', user: { id: owner }, guildId: guild, message: { flags: { has: () => privateSource } },
      isButton: () => true, isModalSubmit: () => false, isStringSelectMenu: () => false,
      async deferReply(p) { assert.equal(p.flags, 64); calls.push('reply'); }, async deferUpdate() { calls.push('update'); }, async editReply(p) { replies.push(p); } };
    assert.equal(await createCertificationRouter(pool, config, guild)(interaction), true);
    assert.deepEqual(calls, [privateSource ? 'update' : 'reply']);
    const payload = replies[0], controls = payload.components.flatMap(row => json(row).components);
    assert.equal(json(payload.embeds[0]).title, 'Admin Dashboard — Configuration');
    const overview = controls.find(button => button.custom_id === 'cert:admin:overview:0');
    assert.equal(overview.label, 'Overview'); assert.equal(overview.style, 1);
    assert.ok(controls.some(button => button.custom_id === 'cert:admin:courses:0' && button.label === 'Course Overview'));
    assert.equal(new Set(controls.map(button => button.custom_id)).size, controls.length);
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  });
}
