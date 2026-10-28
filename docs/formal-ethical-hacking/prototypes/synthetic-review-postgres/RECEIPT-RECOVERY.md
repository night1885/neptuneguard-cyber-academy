# Disposable PostgreSQL receipt recovery validation

Source-only CI slice following coordinator commit 92efffb4756222bdc18ab5c7c40b16ddacfd4357. No SQL fixture, runtime, dependency or live policy change.

The new database test installs the four unchanged disposable fixtures, seeds one fictional assignment and report, verifies the restricted worker role, disposes a coordinator and closes its worker pool, then reconstructs both against the same fixture database. Six serial subtests cover receipt recovery, missing requests, a foreign actor, assignment revocation, changed current channel and exact expiry. Snapshot timestamps and receipt identities must remain unchanged. A submit-provider trap guards against accidental resubmission. Foreign-actor rejection occurs in the scripted identity adapter; assignment revocation is also checked through the SQL receipt function.

Local preparation: all three new JavaScript files passed syntax checks; five offline profile tests passed. Workflow YAML parsed and settings comparison confirmed only the push branch list and serial test command changed. No local PostgreSQL execution is claimed. Database results remain pending until the exact committed-head CI run is inspected.

CI retains Node 20/22 by PostgreSQL 16/18, existing service, read-only contents permission, timeouts, serial execution, guarded fixture setup and redacted failure diagnostics. The recovery branch is added to push triggers. Existing four database test files are retained; the original intake suite, focused recovery suite, profile suite and new database test are appended. No separate workflow dispatch is requested.

Profile guards require explicit CI opt-ins, exact loopback disposable credentials, supported PostgreSQL major and no general DATABASE_URL. The test verifies database/user/version/encoding, refuses an existing fixture schema or worker, and cleans the schema and role it installed. This is disposable test creation/cleanup, never a production migration or purge.

Limits: identity translation, journal and privacy verification remain scripted. Reconstruction is within one process, not OS/host restart. There are no concurrent workers or lost database-commit-response tests. The stored request ID is supplied directly; no learner-facing recovery route exists. No report body is delivered by recovery. No independent implementation review, Discord acceptance, live collection/deletion or deployment is claimed. Issue #30 remains incomplete.

No PR, merge, production database connection, live Discord operation, retention-policy change or deployment is authorized by this commit. Any such action requires separate exact approval.
