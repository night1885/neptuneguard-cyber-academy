import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificationRouter } from './certification-admin-router.js';

const owner = '1223123544301633567';
const guildId = '1330353166830665859';
const sections = ['students', 'enrollments', 'labs'];

async function render(section, size, page, dropdown) {
  const replies = [];
  const records = Array.from({ length: size }, (_, index) => ({
    discord_user_id: String(1223123544301633568n + BigInt(index)),
    status: 'pending', agreement_version: 'test-v1',
    request_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    lab_key: 'test-lab'
  }));
  const target = section === 'students' ? `cert:students:list:${page}` : `cert:admin:${section}:${page}`;
  const pool = {
    async query(sql) { assert.match(sql, /^SELECT\b/); return { rows: records }; },
    async connect() { assert.fail('Pagination must not write records'); }
  };
  const interaction = {
    customId: dropdown ? 'cert:admin:section' : target,
    values: [section], user: { id: owner }, guildId,
    isButton: () => !dropdown, isStringSelectMenu: () => dropdown, isModalSubmit: () => false,
    async deferReply(payload) { assert.equal(payload.flags, 64); },
    async editReply(payload) { replies.push(payload); },
    async reply() { assert.fail('Authorized navigation should use its deferred reply'); }
  };
  assert.equal(await createCertificationRouter(pool, { enabled: true, ownerId: owner }, guildId)(interaction), true);
  assert.equal(replies.length, 1);
  assert.deepEqual(replies[0].allowedMentions, { parse: [] });
  const rows = replies[0].components.map(row => row.toJSON());
  const components = rows.flatMap(row => row.components);
  const ids = components.map(component => component.custom_id).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'Component custom IDs must be unique, including disabled buttons');
  assert.ok(ids.every(id => id.length <= 100));
  assert.ok(rows.length <= 5);
  assert.ok(rows.every(row => row.components.length >= 1 && row.components.length <= 5));
  assert.equal(rows[0].components[0].type, 3);
  assert.equal(rows[0].components[0].options.find(option => option.default).value, section);
  const previous = components.find(component => component.label === 'Previous');
  const refresh = components.find(component => component.label === 'Refresh');
  const next = components.find(component => component.label === 'Next');
  assert.equal(previous.disabled, page === 0);
  assert.equal(next.disabled, size <= 5);
  assert.equal(refresh.custom_id, target);
  if (page > 0) assert.equal(previous.custom_id, target.replace(/:\d+$/, `:${page - 1}`));
  if (size > 5) assert.equal(next.custom_id, target.replace(/:\d+$/, `:${page + 1}`));
}

for (const section of sections) {
  for (const size of [0, 1, 6]) {
    for (const page of [0, 1]) {
      test(`${section}: ${size} records on page ${page} have valid unique navigation IDs`, async () => {
        await render(section, size, page, false);
      });
    }
    test(`${section}: dropdown with ${size} records produces unique IDs`, async () => {
      await render(section, size, 0, true);
    });
  }
}
