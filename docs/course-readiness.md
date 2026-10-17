# Course readiness — staged restricted-runtime gate

Status: repository preparation only. No live runtime hookup, configuration, migrations/grants, assignment/completion, deletion, merge, deployment, or activation occurs in this patch.

validateCourseLifecycleReadiness checks base certification safeguards and course-specific catalog/permission metadata on one connection in a read-only transaction. It requires consistent table schemas, closure metadata columns, migration 007 column types/nullability without automatic defaults/generated identities, the account/course primary key, a validated nondeferrable ON DELETE RESTRICT parent foreign key, validated CHECK safeguards, and the enabled expected local BEFORE UPDATE row trigger.

The database login must be direct, non-elevated, not an owner of these tables, and unable to CREATE in their schema. It requires shared-enrollment SELECT and sufficient UPDATE privilege for row locking, course SELECT/INSERT/UPDATE, audit INSERT, and audit-sequence USAGE. DELETE/TRUNCATE/TRIGGER and audit UPDATE privileges are rejected. No privileges or catalog objects are changed by the checker. Table-wide course privileges reflect the current service's SELECT/RETURNING * queries; this is not a claim of the narrowest possible future column-grant design.

createReadyCourseLifecycle validates configuration/allowlists and returns the lifecycle service only after readiness passes. createReadyCourseNavigation pairs the actual non-tracking renderer with protected navigation, validates readiness before returning it, and disposes the controller on failure. It does not connect to runtime or bypass separate curriculum content/safety review.

Checks establish point-in-time catalog identity/shape and permissions, not full semantic proof of constraint expressions/function bodies or protection from every privileged/indirect path. Migration review and behavioral tests remain necessary. No claim of complete database security, instantaneous revocation of already displayed content, or provider erasure is made.

Disposable PostgreSQL 16/18 tests use a real restricted login and the actual gate, lifecycle service, navigation controller, and renderer with simulated Discord interactions. They cover independent active courses and stale-session denial after completion, rejected privileged login, absent migration, disabled trigger, cascading foreign key, unvalidated checks, insufficient/excessive privileges, and denied deletion. The explicit loopback certification_test URL and role-DDL opt-in are mandatory; absent configuration skips integration and is not acceptance. No new passing results are claimed before CI executes.

Existing default runtime routes remain unchanged. Still required: default-off course runtime composition, confirmed admin assignment/completion controls, combined runtime acceptance, content completeness/safety review, retention deletion/provider handling, final documents and target-environment acceptance.
