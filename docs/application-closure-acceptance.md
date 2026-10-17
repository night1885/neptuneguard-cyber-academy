# Combined application closure acceptance — disposable fixtures

Status: test preparation only. No production database, live Discord API, deployed environment, feature flag, notifications, migration/grant, closure, deletion, merge, or deployment is changed by this patch.

The combined test uses the actual attachCertificationRuntime, restoration router, closure runtime wrapper, readiness checker, owner UI, service, and PostgreSQL migrations together. Only the Discord client/interactions and database pool provisioning are fixture adapters. It does not replace closure service or readiness with successful stubs.

The suite requires an explicit loopback certification_test URL and CERTIFICATION_TEST_ALLOW_ROLE_DDL=true. Each case creates its own random schema and restricted login, migrates disposable tables, inserts a clearly labeled fixture agreement/application, and grants fixture-only runtime privileges. The runtime owns the worker pool; cleanup drains it, then drops the test schema and role. No real Discord client is logged in; channel publication is forbidden by the fixture.

Cases cover private student-detail entry, read-only category/confirmation preview, cancellation, unauthorized/wrong-server token rejection, actual atomic closure/audit, token replay, preserved learner acknowledgment, course-authorization denial, and preservation of restoration section-login boundaries. Runtime credentials cannot delete enrollment or audit rows.

Negative cases cover unavailable runtime before Discord lookups when migration 006 is missing, default-off startup without the closure migration/entry, and real audit-trigger failure rolling back closure before a fresh confirmation retries. A displayed deletion-eligibility timestamp is not deletion execution.

CI runs these tests on PostgreSQL 16 and 18. An absent test URL or role-DDL opt-in skips the integration suite; that is not acceptance. Passing results are not claimed until the proposed commit runs. Existing individual unit, schema, service, lifecycle, and readiness suites remain enabled.

Passing combined fixtures would establish an automated application-closure checkpoint, not full live Discord/provider or target-credential acceptance. Keep the live flag off pending separately approved release steps. Course-completion/shared-record handling, actual retention deletion and audit expiry, provider/backup verification, final documents/configuration, and production activation remain outstanding.
