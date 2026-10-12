# Certification backend verification

## Repeatable command

From a repository checkout with a compatible Node.js runtime, run:

```sh
node test-certification-backend.mjs
```

The runner executes the repository's acknowledgment, enrollment approval, and access-management unit-test files together. It preserves test output and returns a nonzero exit status on test failure, launch failure, timeout, or signal termination. It does not start the bot or invoke migrations.

## Local development check — October 12, 2026

A local reconstruction of the tool-visible source and test assertions associated with commit 5de4564c02462a0c4d17726b46b0c780b843134e passed 27 Node.js tests: 5 acknowledgment, 13 enrollment approval, and 9 access-management tests, with no failures or skips. Formatting was condensed for local execution. This was not a Git checkout, an exact-file integrity verification, a GitHub Actions run, or execution of this newly added runner.

The tests mock database query responses. They exercise owner authorization, typed-name completeness, approval state checks, permanent ID handling, transaction command ordering, rollback on audit-write failure, suspension lab-revocation commands, and reinstatement without automatic lab restoration. They do not prove actual database rollback, row-lock behavior, schema compatibility, or production authorization.

## Outstanding verification and implementation

- Execute the runner against an actual checkout and retain its output in the normal development or CI process.
- Run the remaining repository tests and Discord review-screen tests with the project's dependencies installed.
- Verify proposed migrations against a disposable PostgreSQL database, including existing records and database constraints.
- Test concurrent approval and transactional audit failure using real PostgreSQL.
- Build and test learner enrollment submission against the exact approved agreement and server-side comprehension rules. The learner flow remains disconnected from submission.
- Revise the learner agreement and resolve age eligibility and acknowledgment-metadata retention before activation.

No deployment, migration application, enrollment activation, signature collection, or deletion of existing records is authorized by adding this runner or these notes. Passing these unit tests alone is not a release approval.
