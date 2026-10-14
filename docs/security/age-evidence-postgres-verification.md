# Migration 005 disposable PostgreSQL coverage

The schema/helper prerequisite at 0884a0a9f8747f955df717cf4693ff1cf31d617e passed the unit and PostgreSQL 16/18 jobs, but those database jobs did not exercise migration 005. This new test and workflow patch requires its own exact-head CI verification; no passing result is claimed at preparation time.

The new suite accepts only an explicitly configured loopback PostgreSQL database named certification_test, without URL query overrides or fragments, and verifies current_database before writes. It creates a generated schema, applies migrations 001–004, seeds a synthetic pre-005 row, and applies migration 005 twice. Cleanup drops only its generated schema. These checks reduce accidental targeting; the operator must still ensure the database cluster is disposable.

Coverage checks unchanged NULL eligibility on a legacy fixture, no fabricated audit event, required columns, rejected partial/false/malformed-version evidence with SQLSTATE 23514, complete current-policy evidence, rejection of an older policy by the application helper, and rollback of eligibility writes after an injected statement failure. No real learner contents are read. The tests do not start Discord or create roles.

The existing disposable PostgreSQL 16/18 jobs now explicitly include the suite. Ordinary unit CI without the test URL skips this database test; a skip is not a PostgreSQL verification pass. Workflow permissions, production-secret isolation, matrix versions, and dependency-install policy are unchanged. Updating the open PR may start CI and consume runner minutes.

This is migration/helper evidence, not application persistence, owner-approval enforcement, restricted-role evidence for the new columns, concurrency coverage for an integrated writer, or live activation readiness. Those remain follow-up work. No production migration, configuration change, merge, deployment, publication, or activation is performed or authorized by this patch.
