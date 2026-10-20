import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applicationDeletionEligibleAt, auditDeletionEligibleAt } from './certification-retention-deadlines.js';

for (const [label, input, expected] of [
  ['Friday closure excludes closure date and weekend', '2026-10-16T15:00:00Z', '2026-10-22T04:00:00.000Z'],
  ['Saturday closure counts Monday through Wednesday', '2026-10-17T15:00:00Z', '2026-10-22T04:00:00.000Z'],
  ['Monday closure counts Tuesday through Thursday', '2026-10-19T15:00:00Z', '2026-10-23T04:00:00.000Z'],
  ['spring daylight-saving change', '2026-03-05T15:00:00Z', '2026-03-11T04:00:00.000Z'],
  ['autumn daylight-saving change', '2026-10-29T15:00:00Z', '2026-11-04T05:00:00.000Z'],
  ['no holiday exclusions', '2026-12-23T15:00:00Z', '2026-12-29T05:00:00.000Z'],
  ['closure date uses New York rather than UTC', '2026-10-20T02:00:00Z', '2026-10-23T04:00:00.000Z']
]) {
  test(`application deadline: ${label}`, () => {
    assert.equal(applicationDeletionEligibleAt(input).toISOString(), expected);
  });
}
for (const [input, expected] of [
  ['2026-01-31T12:34:56.789Z', '2026-04-30T12:34:56.789Z'],
  ['2026-11-30T23:59:59.123Z', '2027-02-28T23:59:59.123Z'],
  ['2027-11-30T23:59:59.123Z', '2028-02-29T23:59:59.123Z'],
  ['2026-08-31T00:00:00Z', '2026-11-30T00:00:00.000Z']
]) {
  test(`audit deadline clamps destination month and preserves UTC time ${input}`, () => {
    assert.equal(auditDeletionEligibleAt(input).toISOString(), expected);
  });
}
test('explicit offsets describe the same instants as their UTC equivalents', () => {
  assert.equal(applicationDeletionEligibleAt('2026-10-16T11:00:00-04:00').toISOString(), '2026-10-22T04:00:00.000Z');
  assert.equal(auditDeletionEligibleAt('2026-01-31T07:34:56.789-05:00').toISOString(), '2026-04-30T12:34:56.789Z');
});
test('Date inputs are accepted without mutating the supplied object', () => {
  const input = new Date('2026-01-31T12:34:56.789Z'), before = input.getTime();
  assert.ok(applicationDeletionEligibleAt(input) instanceof Date); assert.ok(auditDeletionEligibleAt(input) instanceof Date);
  assert.equal(input.getTime(), before);
});
for (const input of [null, undefined, {}, new Date(NaN), '2026-10-17', '2026-10-17T12:00:00', '2026-02-30T12:00:00Z', '2026-10-17T12:00:00.123456Z']) {
  for (const [label, calculate] of [['application', applicationDeletionEligibleAt], ['audit', auditDeletionEligibleAt]]) {
    test(`${label} calculation rejects invalid or unsupported timestamp ${String(input)}`, () => {
      assert.throws(() => calculate(input));
    });
  }
}
test('deadline module contains no database, Discord, environment, or scheduling integration', async () => {
  const source = await readFile(new URL('./certification-retention-deadlines.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /(?:from\s+['"]|import\s*\(|process\.env|setInterval|setTimeout|DELETE\s+FROM|\.query\()/);
});
