# Standalone web persistence — disposable CI validation candidate

This batch enables a new source-validation workflow, not deployment, a live database change or course activation. It adds one integration test file, one workflow and this note. Existing sources, schema candidate, package dependencies and workflows remain unchanged. Existing repository automation may also run.

## Execution isolation and cost boundary

The workflow uses a fresh GitHub Actions PostgreSQL service container per job: Node 20/22 crossed with PostgreSQL 16/18, four jobs, each capped at ten minutes. It uses contents:read and checkout without persisted credentials. It requests no repository secrets or Render/Discord credentials. npm ci uses the existing lockfile with lifecycle scripts, audit and funding prompts disabled. Action versions and matrix follow the repository's existing disposable PostgreSQL workflow conventions.

Only the exact synthetic loopback owner URL and explicit WEB_REVIEW_DISPOSABLE_CI/CI flags are accepted by the connected test. The database is ng_web_review_ci with synthetic owner/worker credentials supplied only for these ephemeral service containers. Name/URL/flag checks are execution guards, not proof of infrastructure trust if an operator deliberately misroutes the local port. Never adapt the test to an academy or intake connection.

The test applies the candidate schema inside the disposable database, creates a restricted synthetic worker, grants only schema usage and table SELECT/INSERT/UPDATE, then uses that worker for adapter operations. It performs no production role, schema or privilege operation. Service-container teardown supplies disposal; no live resource cleanup is attempted.

## Test design

One parent acceptance test contains nine sequential subtests: worker identity/selected privilege limits; first save/duplicate insert/stale update; actor/guild/course/content boundaries; concurrent initial saves; concurrent updates; a separate Node process reading committed progress; an explicit rolled-back update; simulated response loss after a successful autocommit; and write rejection in a read-only transaction.

The new-process check tests a fresh application process reading an existing committed database row. It does not restart or crash the PostgreSQL server, validate filesystem durability or test a Render restart. Concurrent cases use separate worker pools, not a production load test. The unknown-save case throws in a trusted wrapper after a successful database query; it is a selected post-commit response-loss simulation, not actual network-failure injection or an implemented reconciliation policy. A rollback subtest uses a direct test-owned transaction, not a new runtime transaction manager.

The workflow also runs the existing core, lifecycle and adapter contract suites. It uses named files only, not broad teaching-fixture discovery. Without the explicit disposable flag, the connected test skips before importing pg or connecting; the new workflow supplies the flag. Inspect the resulting exact-head CI output and actual skip/failure counts before claiming success.

## Local validation actually performed

On 2026-11-01 local time, Node v20.20.1 syntax-checked the integration file successfully after a draft SQL-string quoting error was corrected. The workflow parsed locally as YAML and its trigger structure, read-only repository permission and four-combination matrix were inspected. No PostgreSQL connection, schema application, role creation, integration subtest, dependency installation or CI run was executed locally for this batch. A syntax check is not an integration pass, and YAML parsing does not establish GitHub Actions acceptance.

CI results are pending until the approved commit triggers and the exact commit's jobs are inspected. If any matrix job fails, preserve its source/status and diagnose before merge or activation. Do not relabel expected/skipped/not-run cases as successful acceptance.

## Remaining gates

Actual content pinning, stale-version presentation and retention/deletion, trusted course/student/guild composition, private Discord button/message/session adapter, pagination, full-checkout regressions, server/process crash recovery, real save reconciliation, accessibility and independent staging/rollback approval remain open. A successful disposable CI run would close selected database checks only, not production readiness or course completion.

No Render service/database, existing intake or academy data, startup, production registry, Discord message, permissions, learner record, deployment or award changes are authorized by this commit. Source writes and CI execution are the only requested external effects; merge, connected staging changes and deployment require separate approvals.
