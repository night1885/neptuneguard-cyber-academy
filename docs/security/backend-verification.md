# Certification backend verification

## Repeatable command

From a repository checkout with a compatible Node.js runtime, run:

```sh
node test-certification-backend.mjs
```

The runner now executes four unit-test files: acknowledgment, enrollment approval, access management, and enrollment submission. It preserves test output and returns nonzero on test failure, launch failure, timeout, or signal termination. It does not start the bot or invoke migrations.

## Local checks — October 12, 2026

### Earlier three-suite run

A local reconstruction of tool-visible source and assertions associated with commit 5de4564c02462a0c4d17726b46b0c780b843134e passed 27 tests: 5 acknowledgment, 13 approval, and 9 access-management tests, without failures or skips. Formatting was condensed. This was not a Git checkout or exact-file integrity verification.

### Submission suite

The 10 submission unit tests from commit 0738118e75819ec30ab389c9b46870cde4dbbb6f passed without failures or skips. Before execution, Git blob hashes of all three copied JavaScript files were verified against GitHub:

- certification-submission.js: 42da9e69baa974a65aa25be220add5978a9af1ab
- test-certification-submission.mjs: 5813b2f00c99e24d9ee8166efb08f4a496c6553f
- certification-acknowledgment.js: df9e3c5a18cbe3f4bd9247af55f648bcdda625f2

These exact copied files ran in a temporary directory with a minimal type=module package.json. This was not a full repository checkout, a GitHub Actions run, or execution of the updated four-suite runner.

The aggregate is 37 passing tests across two separate local runs, not a combined 37-test checkout run. All database calls were mocked.

## Limits and remaining work

Passing unit tests verifies assertions about validation and mocked query behavior. It does not prove PostgreSQL schema compatibility, real rollback, row-lock behavior, concurrent submissions or approvals, Discord interactions, or production authorization.

- Run the four-suite runner against an actual checkout and retain output in development or CI.
- Run the remaining repository and Discord review-screen tests with project dependencies.
- Test migrations 002 and 003, transaction failures, and concurrency against disposable PostgreSQL.
- Build authenticated Discord submission sessions, agreement display, expiry, and abuse controls.
- Approve the revised agreement, age eligibility, metadata retention, and real comprehension questions before activation.

No deployment, migration application, enrollment activation, agreement publication, or deletion is authorized by this verification update. Unit-test success alone is not release approval.
