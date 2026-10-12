import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAcknowledgmentName, hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';

const complete = { signature_method: 'typed_name', acknowledgment_name: 'Example Learner',
  agreement_version: 'test-v2', acknowledged_at: '2026-10-12T07:00:00Z',
  learner_confirmed_read_at: '2026-10-12T07:00:00Z', comprehension_passed_at: '2026-10-12T07:00:00Z',
  signature_reference: null };

test('complete typed acknowledgment needs no uploaded-document reference', () => {
  assert.equal(hasCompleteTypedAcknowledgment(complete), true);
});

test('every required acknowledgment field is mandatory', () => {
  for (const field of ['signature_method', 'acknowledgment_name', 'agreement_version', 'acknowledged_at', 'learner_confirmed_read_at', 'comprehension_passed_at']) {
    assert.equal(hasCompleteTypedAcknowledgment({ ...complete, [field]: null }), false, field);
  }
  assert.equal(hasCompleteTypedAcknowledgment(null), false);
});

test('legacy document reference is not silently treated as a typed name', () => {
  assert.equal(hasCompleteTypedAcknowledgment({ ...complete, signature_method: 'signed_document', signature_reference: 'legacy-reference' }), false);
  assert.equal(hasCompleteTypedAcknowledgment({ ...complete, acknowledgment_name: null, signature_reference: 'legacy-reference' }), false);
});

test('names are trimmed and Unicode normalized without requiring multiple words', () => {
  assert.equal(normalizeAcknowledgmentName('  Example  '), 'Example');
  assert.equal(normalizeAcknowledgmentName('Jose\u0301'), 'José');
});

test('blank, oversized, non-text, and control-character names are rejected', () => {
  for (const value of ['', '   ', null, 42, 'A'.repeat(201), 'Example\nLearner', 'Example\u0000']) {
    assert.throws(() => normalizeAcknowledgmentName(value));
    assert.equal(hasCompleteTypedAcknowledgment({ ...complete, acknowledgment_name: value }), false);
  }
});
