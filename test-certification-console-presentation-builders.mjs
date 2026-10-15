import test from 'node:test';
import assert from 'node:assert/strict';
import { styleConsolePayload } from './certification-console-presentation.js';

class Builder {
  constructor(data) { this.data = structuredClone(data); }
  toJSON() { return structuredClone(this.data); }
  static from(data) { return new this(data); }
}

test('color styling preserves builder interfaces expected by existing router tests', () => {
  const embed = new Builder({ title: 'Audit history', description: 'Read-only', fields: [] });
  const row = new Builder({ type: 1, components: [{ type: 2, style: 2, label: 'Overview', custom_id: 'cert:admin:overview:0' }] });
  const result = styleConsolePayload({ embeds: [embed], components: [row] }, 'cert:audit:0');
  assert.equal(typeof result.components[0].toJSON, 'function');
  assert.equal(result.components[0].toJSON().components[0].style, 1);
  assert.equal(result.embeds[0].data.title, 'Audit history');
  assert.equal(result.embeds[0].toJSON().color, 0x9b59b6);
  assert.equal(embed.data.color, undefined);
  assert.equal(row.toJSON().components[0].style, 2);
});

test('raw payloads stay raw and keep disabled and destructive styles', () => {
  const payload = { content: '', embeds: [{ title: 'Lab records' }], components: [{ type: 1, components: [
    { type: 2, style: 2, label: 'Refresh', custom_id: 'cert:labview:pending:0', disabled: true },
    { type: 2, style: 4, label: 'Revoke', custom_id: 'cert:access:revoke:x' }
  ] }], allowedMentions: { parse: [] } };
  const result = styleConsolePayload(payload, 'cert:labview:pending:0');
  assert.equal(result.embeds[0].color, 0xf1c40f);
  assert.equal(result.components[0].toJSON, undefined);
  assert.deepEqual(result.components[0].components.map(item => item.style), [2, 4]);
  assert.deepEqual(result.allowedMentions, { parse: [] });
});
