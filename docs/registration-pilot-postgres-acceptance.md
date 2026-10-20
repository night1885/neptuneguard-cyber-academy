# Pilot-specific disposable PostgreSQL acceptance

Base: 2e1c5b6e5945fe8475cb39972b652f9195b65551; draft PR #15 remains activation-blocked.

Adds one root test with nine subtests and an explicit step in the existing PostgreSQL 16/18 matrix. The unit job skips this database test when CERTIFICATION_TEST_DATABASE_URL is absent. If a URL is supplied, role-DDL opt-in is mandatory and protocol/loopback host/exact certification_test database/no query/no fragment checks run before creating any pool.

The CI test creates a generated schema and restricted login, applies actual migrations 001-005 in that schema, seeds an explicitly disposable agreement, and removes the generated schema/role after closing the worker pool. A dedicated writable probe table/function permits meaningful read-only transaction denial checks without granting deletion of application records. Test credentials are generated and never intentionally printed; no production fixture or credential is introduced.

Targets: a normal writable backing pool plus the actual read-only facade; actual parser/policy/services; invitation-only pending transition; service rejection before checkout; concurrent registration/submission behavior; missing provenance; real audit-failure rollback/retry; and role denial of approval metadata, audit deletion and safeguard changes. Snapshots use row_to_json::text to retain timestamp precision. The fixture role supports these service/readiness checks; its column grants are not a complete production dashboard permission plan. Row snapshots do not assert that sequences roll back or provider copies disappear.

Local evidence is syntax checking only. The pg import probe returned ERR_MODULE_NOT_FOUND and no local PostgreSQL fixture was started or queried. None of the new PostgreSQL subtests has a claimed pass result yet. The previously green checks apply to the old head, not this proposed change. New CI must establish PostgreSQL 16/18 results.

The workflow change adds only the explicit new acceptance command to the existing matrix. Committing to the open PR will trigger its existing CI, including fixture-only schema/role DDL and cleanup. It authorizes no production query, migration/grant, records, Render update, entry publication, merge or deployment. This does not settle full-runtime/live Discord acceptance, mode-aware preflight, invitation/audit-retention dependency, legal sufficiency or pilot activation approvals.
