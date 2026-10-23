import test from 'node:test';
import assert from 'node:assert/strict';
import { loadManualReviewDecisionConnection } from './certification-manual-review-decision-connection.mjs';

const environment = () => ({ CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: 'true',
  CERTIFICATION_DATABASE_URL: 'postgresql://pilot_fixture:pilot_fixture_secret@127.0.0.1/academy_fixture', CERTIFICATION_DATABASE_TLS: 'disable',
  CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL: 'postgresql://decision_fixture:decision_fixture_secret@127.0.0.1:5432/academy_fixture',
  CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS: 'disable' });
test('separate explicit credentials bind to the same normalized endpoint without modifying environment', () => {
  const env = environment(), before = structuredClone(env), value = loadManualReviewDecisionConnection(env);
  assert.deepEqual(value.target, { expectedRole: 'decision_fixture', expectedDatabase: 'academy_fixture' });
  assert.deepEqual(value.primaryTarget, { expectedRole: 'pilot_fixture', expectedDatabase: 'academy_fixture' });
  assert.equal(value.connection.ssl, false);
  assert.ok(Object.isFrozen(value)); assert.ok(Object.isFrozen(value.connection)); assert.ok(Object.isFrozen(value.target));
  assert.deepEqual(env, before);
});
test('missing, shared, mismatched, or URL-option credentials are rejected with a safe error', () => {
  for (const value of [undefined, '',
    'postgresql://pilot_fixture:another_fixture_secret@127.0.0.1/academy_fixture',
    'postgresql://decision_fixture:pilot_fixture_secret@127.0.0.1/academy_fixture',
    'postgresql://decision_fixture:decision_fixture_secret@localhost/academy_fixture',
    'postgresql://decision_fixture:decision_fixture_secret@127.0.0.1:5433/academy_fixture',
    'postgresql://decision_fixture:decision_fixture_secret@127.0.0.1/other_fixture',
    'postgresql://decision_fixture@127.0.0.1/academy_fixture',
    'postgresql://decision_fixture:decision_fixture_secret@127.0.0.1/academy_fixture?sslmode=disable']) {
    assert.throws(() => loadManualReviewDecisionConnection({ ...environment(), CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL: value }),
      error => error.code === 'MANUAL_REVIEW_DECISION_CONNECTION_INVALID' && !error.message.includes('fixture_secret'));
  }
});
test('explicit enablement and matching TLS policies are required', () => {
  for (const value of [undefined, 'false', 'TRUE']) assert.throws(() => loadManualReviewDecisionConnection({ ...environment(), CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED: value }));
  assert.throws(() => loadManualReviewDecisionConnection({ ...environment(), CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS: 'verify-full' }));
  const env = environment();
  env.CERTIFICATION_DATABASE_URL = env.CERTIFICATION_DATABASE_URL.replace('127.0.0.1', 'db.example.invalid');
  env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL = env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_URL.replace('127.0.0.1', 'db.example.invalid');
  assert.throws(() => loadManualReviewDecisionConnection(env));
  delete env.CERTIFICATION_DATABASE_TLS; delete env.CERTIFICATION_MANUAL_REVIEW_DECISION_DATABASE_TLS;
  const value = loadManualReviewDecisionConnection(env);
  assert.equal(value.connection.ssl.rejectUnauthorized, true);
  assert.ok(Object.isFrozen(value.connection.ssl));
});
