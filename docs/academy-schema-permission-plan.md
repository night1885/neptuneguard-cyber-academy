# Academy schema and runtime permission change plan

Status: PROPOSED PLAN ONLY — October 19, 2026. Committing or approving this document does not authorize executing SQL, querying application rows, creating/changing roles, granting/revoking privileges, changing hosting settings, publishing messages/agreements, merging, or deploying. No executable production change bundle is supplied.

## Resolved review target and evidence boundary

Render workspace: My Workspace (tea-db1p6jp42hec73dnfs4g). Academy database: neptuneguard-cyber-academy-db (dpg-db1touu7bikc73bl9vhg-a), database name neptuneguard_cyber_academy_db. Worker: neptuneguard-cyber-academy (srv-db1ula3tqb8s73bcqdc0). Do not apply this plan to the separate verification-bot database or service.

The read-only October 19 inventory reported PostgreSQL 18.6, four certification foundation tables in public, and the three legacy learner tables. The follow-up catalog query confirmed absent application_closed_at/application_closed_by/application_closed_as columns and absent public.certification_course_enrollments. Existing account-acknowledgment constraint and agreement/student-ID trigger metadata were present; function bodies and actual trigger enforcement were not verified. Table existence is not proof of learner-row contents or historical erasure. No application rows or counts were inspected.

The inspection effective role neptuneguard_cyber_academy_db_user owned the four certification tables and reported SELECT/INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER privileges; its session role was neptune_db. Earlier role metadata reported create-role/create-database capability, but not superuser or row-security bypass. These are inspection-connection findings, not proof of worker credentials or runtime binding. Row-security flags were off on the returned tables; this alone does not establish public access or absence of other controls.

Render reported the academy worker on main with automatic deployment off and deployment 7e04271eaf25f641830b0220f5404ebc6588e198 marked live. This is a dated metadata observation, not an ongoing guarantee of worker health, configuration, or Discord behavior.

## Pinned migration sources for review

Review repository commit 79eac847f4be40f18942bd42279e93f0a19aae75, not an unreviewed moving branch:

1. migrations/006-application-closure-metadata.sql (observed Git blob 71140fd7b16921706383c6a799227f673c69d928). It follows migrations 001–005, adds nullable closure fields, a closure-consistency constraint, and an immutable-closure trigger/function. It supplies no closure defaults, backfill, deletion, scheduler, or grants. Existing denial must not be converted automatically into explicit closure.
2. migrations/007-course-enrollment-lifecycle.sql (observed Git blob b0f91f9cda392c5b2aa356f9866d0cd43c69c4b3). It follows migrations 001–006, creates minimal course-assignment/completion storage with restrictive parent linkage, checks, and an immutable-lifecycle trigger/function. It supplies no assignments, completion backfill, grants, or deletion. Enrollment approval alone must not become a course assignment.

Existing catalog shape is not a migration journal or proof that every earlier migration was applied correctly. Verify required earlier columns, constraints, indexes, trigger/function behavior, ownership, and search-path/schema placement before executing either script. IF NOT EXISTS and named-object checks do not repair arbitrary incompatible existing objects; do not treat rerun tolerance as automatic repair. Do not drop legacy name/signature/progress fields or tables as part of this additive change.

## Preflight gates before any production change request

- Reconfirm the exact database/service identities, current deployed commit, branch, and deployment setting. Do not retrieve or paste secret values into the plan. Verify worker binding using an independently reviewed method; an inspection connection is insufficient.
- Confirm the approved execution identity, its migration authority, schema/search path, execution window, lock/statement limits, recovery evidence, and responsible operator. Review actual provider backup/recovery behavior; a provider inventory entry is not a tested recovery point.
- Recheck catalog state immediately before execution. If it differs from the approved assumptions, stop and revise the exact change request.
- Keep restoration and deletion activation separate from schema work. Preserve the existing instructor release and do not change flags/start commands as a side effect. No existing application is assumed to be safely paused merely because a repository example contains false flags.
- Review the full scripts and possible effects on existing objects/data. Constraint validation and trigger replacement must be included in the operational review; this is not a zero-impact change. No learner backfill, cleanup, deletion, or data export is bundled.

## Proposed separation of identities and privileges

This is a design to resolve into exact role names, object names, credentials, grants and approval payloads later, not approved SQL:

- Migration/ownership identity: separate from the worker login. Do not reuse the table-owning inspection connection as evidence of restricted runtime access. Do not revoke or alter an existing identity before its actual consumers and recovery path are known.
- Runtime identity: dedicated, non-owning login without superuser, database/role creation, replication, row-security bypass, or membership that restores administrative authority. Review effective privileges from role membership, PUBLIC, schema grants and default privileges; role attributes alone do not establish least privilege.
- Schema scope: resolve the intended schema explicitly. Allow only needed usage; do not grant schema creation or database-wide/all-table access as a shortcut. Shared-schema changes and effects on other consumers require separate review.
- Agreements: the existing restricted-role fixture uses SELECT plus UPDATE on version only to support the service's locking read. It denies content/hash updates and relies on immutable-version protection against actual version mutation. Verify the exact service requirement and safeguards rather than blindly widening UPDATE privileges.
- Enrollment and course lifecycle: review SELECT/INSERT/UPDATE requirements against the approved registration, approval, access-review, assignment and completion methods. No DELETE/TRUNCATE/DDL or safeguard-disabling capability belongs in the ordinary runtime grant bundle. Scope columns further where compatible with the actual SQL.
- Audit: separately review the INSERT and admin-view SELECT requirements; preview-only access needs only event_id/created_at. Runtime must not receive audit UPDATE/DELETE/TRUNCATE as a convenience. Resolve only the required audit sequence usage, not all-sequence grants copied from fixtures.
- Labs: grant only operations required by separately approved lab features. No lab-row deletion or retention schedule is inferred from course/application retention decisions.
- No legacy profile/progress/badge access is introduced. A future deletion executor, if approved, needs its own restricted design, preservation/dependency review, and explicit execution authorization; it is not this runtime login.

The test fixtures are evidence of particular tested combinations, not a complete production grant recipe. Relevant suites include test-certification-postgres-role.mjs, test-certification-course-acceptance.mjs, test-certification-retention-preview.mjs and test-certification-audit-retention-preview.mjs. Never copy disposable credentials or CERTIFICATION_TEST_* opt-ins into production.

## Proposed execution stages, each separately reviewed

1. Approve a fully resolved migration request with exact target, pinned script content, execution identity, schema, limits, recovery prerequisites, and stop conditions. Validate migrations 001–005 prerequisites; then apply 006, verify its outcome, and only then consider 007. Existing scripts have their own transactions; the pair is not one atomic transaction. Do not promise a single rollback across both commits.
2. Perform catalog verification for the new columns, constraints, foreign keys, indexes, trigger definitions/enabled states, function properties, and ownership. Catalog checks alone are not behavioral acceptance. Resolve any mismatch before grants or activation.
3. Approve an exact role/grant request only after its full privilege matrix and intended consumers are resolved. Verify the actual dedicated login and negative permissions in an isolated environment. Production behavioral probes or learner-record reads/writes require separate scope and approval; do not insert synthetic learners into production as an implicit acceptance test.
4. Approve any worker credential/configuration change independently, with secure secret handling and a recovery path. Verify actual runtime binding without exposing credentials. Keep agreement publication, entry-message publication, feature enablement, merge and deployment separate.

## Stop and recovery rules

Stop on unexpected objects, identity/permission mismatches, validation errors, timeouts, unverified recovery prerequisites, or changed target assumptions. Do not automatically retry with broader grants, disable triggers/checks, drop constraints, cascade-delete dependencies, or modify learner rows to force success.

For a failure within a script's uncommitted transaction, confirm transaction outcome before deciding how to proceed. A committed 006 followed by failed 007 is a partial staged outcome, not automatically rolled back as a pair. Record it and keep activation blocked.

After a committed additive migration, do not reflexively drop the new table/columns or replace safeguards to revert: newly recorded metadata could be lost. Keep the current approved application configuration, investigate, and prepare a separately reviewed recovery/change request. No destructive down migration is authorized here.

## Acceptance still outstanding

Exact production identity/grant selection, verified recovery/provider behavior, approved migration execution, complete post-migration checks, safe target-environment acceptance, preservation/dependency decisions, restricted deletion and scheduling/retries/alerts, final learner-document publication, entry-message placement, and release authorization remain open. Repository CI success is not proof of any of those production outcomes.
