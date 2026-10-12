# Readiness verification coverage — new tests pending

The PostgreSQL readiness test directly calls the production readiness checker against catalog rows from migrations 001–004 in a generated schema. It verifies a complete schema, disabled-trigger rejection and restoration, matching and mismatched active agreements, missing columns, and a missing table. Destructive alterations occur only inside the temporary schema in the dedicated loopback certification_test database, with the same explicit URL and database-name checks as the earlier suites. The generated schema is removed afterward.

The disposable PostgreSQL CI job now runs this suite alongside transaction/concurrency and agreement-immutability tests. The new suite is skipped without CERTIFICATION_TEST_DATABASE_URL in ordinary unit-test runs. Job-level success must be checked for the exact new commit. These new tests have not yet been executed at preparation time.

Six runtime startup tests attach the actual runtime to a mock Discord client and pool. They cover successful readiness without publication, missing columns, disabled safeguards, changed agreement content, everyone-visible admin channels, and missing bot permissions. They test startup control flow, not live Discord permission resolution or transport. The existing CI unit-test glob includes them.

Earlier successful checks apply to earlier commits and do not establish success for these added tests. Controlled live testing must still examine actual role/member overwrites, least-privilege database roles, configured migrations, private replies, and the full learner/owner flow. No production manifests, secrets, or real agreements are provided here.

This commit adds verification coverage and a disposable CI command only. It does not change runtime behavior, apply production migrations, publish content or buttons, merge, deploy, or enable enrollment.
