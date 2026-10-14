# Restricted database-role fixture — scoped verification evidence

Source reviewed: test-certification-postgres-role.mjs at 1e04ba84c9cf3d430e38702d6566bd21f67e3c13. Unit and PostgreSQL 16/18 job conclusions succeeded for that head in Actions run 38521269266. This replaces the historical correction-pending status, not the requirement for raw-log/security review. This documentation commit needs its own exact-head CI check. No production least-privilege approval is established.

## Isolation and identity
The test requires CERTIFICATION_TEST_DATABASE_URL and CERTIFICATION_TEST_ALLOW_ROLE_DDL=true. It checks a loopback PostgreSQL URL without query/fragment and current_database=certification_test, then generates a schema, login role and test-only password. Roles are cluster-wide: these URL checks do not prove cluster isolation. Run only on the dedicated disposable cluster, never shared production. Cleanup closes the client/pool and drops only the generated schema/role.

The generated role is created NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS and NOINHERIT. Authentication asserts current_user and session_user both equal that role. It is not the migration/table owner. The pool/client wrapper is a fixture, not the full deployed runtime or its configuration.

## Exact fixture privileges
- Generated schema: USAGE, not CREATE.
- Agreements: SELECT, then UPDATE(version) column privilege to support the existing FOR SHARE query. No UPDATE privilege on content/hash.
- Enrollments: SELECT, INSERT, UPDATE.
- Lab requests: SELECT, UPDATE; no lab rows are seeded by this case.
- Audit events: INSERT; no audit read/update/delete/truncate grant in the fixture.
- Generated-schema sequences: USAGE.

These are tested fixture grants, not a production grant script. In particular, enrollment UPDATE is broad and the test does not establish minimal column-level privileges for every runtime path. Database grants do not independently authenticate the Discord actor; owner/eligibility checks remain trusted application logic.

## Agreement row-lock dependency
The test proves SELECT-only SELECT FOR SHARE fails with 42501. After UPDATE(version), the locked read succeeds. The column privilege remains real write privilege; a version-changing UPDATE is rejected by the enabled immutable-agreement trigger with P0001. Do not describe this as SELECT-only access or rely on immutability if the account can own/alter/disable safeguards. Any alternative locking design needs separate review. Production SQL and grants are not changed by this note.

## Lifecycle and denial assertions
The fixture applies migrations 001–005 and exercises schema/agreement readiness, age-aware typed acknowledgment submission, pending authorization denial, owner approval/idempotent approval, authorized permanent ID, suspension, missing-evidence reinstatement rejection, restricted evidence renewal/idempotency, separate reinstatement and revocation. Final status is revoked and the permanent student ID is preserved.

It expects six audit events for submission, approval, suspension, evidence renewal, reinstatement and revocation. This corrects the old five-event summary. The test denies agreement-content editing, audit UPDATE/DELETE/TRUNCATE, enrollment DELETE, student-ID trigger disabling and schema table creation with 42501. No provider-session termination or live Discord transport is exercised.

## Open production review
- Confirm exact database/schema, worker binding, runtime account and separate migration owner.
- Inspect PUBLIC/default privileges, role memberships and inherited capabilities, existing objects, function execution/security-definer behavior and search_path.
- Review agreement locking privileges, enabled trigger dependencies and whether narrower enrollment/lab/sequence grants meet all approved runtime paths.
- Verify actual worker TLS/certificate validation, network access, secret/configuration revision and backup/deletion/rollback arrangements.
- Complete raw-log/security review, controlled live Discord flows and operator/legal approvals.

The previously inspected Render account/effective-role arrangement is not this fixture role and must not inherit its verification claims. Refer to migration-and-database-preflight-review.md and ../deployment/certification-activation-checklist.md. No role provisioning, migration execution, merge, publication, deployment or enrollment activation is performed by this documentation update.
