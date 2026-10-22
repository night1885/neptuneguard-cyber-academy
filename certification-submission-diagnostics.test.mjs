import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionDiagnostic, submissionFailureReference } from './certification-submission-diagnostics.mjs';

test('logs only allowlisted metadata and preserves the original error', () => {
  const records = [];
  const diagnostic = createSubmissionDiagnostic({ log: record => records.push(record) });
  diagnostic.setStage('enrollment_update');
  const error = Object.assign(new Error('SECRET_ANSWER'), {
    code: '23514', constraint: 'certification_account_acknowledgment_required',
    detail: 'SECRET_DISCORD_ID', query: 'SECRET_DATABASE_URL', answers: ['SECRET_TOKEN']
  });
  const keys = Reflect.ownKeys(error);
  const id = diagnostic.report(error);
  assert.match(id, /^[a-f0-9-]{36}$/);
  assert.equal(submissionFailureReference(error), id);
  assert.equal(records[0].stage, 'enrollment_update');
  assert.equal(records[0].category, 'database');
  assert.equal(records[0].sqlState, '23514');
  assert.equal(records[0].constraint, 'certification_account_acknowledgment_required');
  assert.doesNotMatch(JSON.stringify(records), /SECRET/);
  assert.deepEqual(Reflect.ownKeys(error), keys);
  assert.equal(diagnostic.report(error), id);
  assert.equal(records.length, 1);
});

test('unknown codes, constraints and stage labels are not echoed', () => {
  const records = [];
  const diagnostic = createSubmissionDiagnostic({ log: record => records.push(record) });
  diagnostic.setStage('SECRET_STAGE');
  diagnostic.report({ code: 'SECRET_CODE', constraint: 'SECRET_CONSTRAINT' });
  assert.equal(records[0].stage, 'interaction');
  assert.equal(records[0].category, 'unexpected');
  assert.equal(Object.hasOwn(records[0], 'sqlState'), false);
  assert.equal(Object.hasOwn(records[0], 'constraint'), false);
  assert.doesNotMatch(JSON.stringify(records), /SECRET/);
});

test('getters, proxies and primitive thrown values cannot break reporting', () => {
  const diagnostic = createSubmissionDiagnostic({ log() { throw new Error('logger failure'); } });
  const error = Object.defineProperty({}, 'code', { get() { throw new Error('getter'); } });
  assert.doesNotThrow(() => diagnostic.report(error));
  assert.doesNotThrow(() => createSubmissionDiagnostic({ log() {} }).report(
    new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('proxy'); } })
  ));
  assert.doesNotThrow(() => createSubmissionDiagnostic({ log() {} }).report('SECRET'));
});

test('concurrent trackers retain separate stages and references', async () => {
  const records = [];
  const run = async stage => {
    const diagnostic = createSubmissionDiagnostic({ log: record => records.push(record) });
    diagnostic.setStage(stage);
    await Promise.resolve();
    return diagnostic.report(new Error('private'));
  };
  const ids = await Promise.all([run('audit_insert'), run('agreement_verification')]);
  assert.notEqual(ids[0], ids[1]);
  assert.deepEqual(records.map(record => record.stage), ['audit_insert', 'agreement_verification']);
});
