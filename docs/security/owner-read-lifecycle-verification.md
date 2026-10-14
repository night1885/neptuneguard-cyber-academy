# Owner-read lifecycle verification expansion

Test-only branch work: no runtime, workflow, deployment, policy or database configuration is changed. New regressions exercise lookup form exclusion, exactly-once submitted lookup admission, shared section/context budget, actor/guild/disabled boundaries, budget preservation on denial, busy-state release after read rejection, late rejection after response timeout, and failed timeout notification while database work remains pending.

Fixtures use synthetic Discord interactions and mocked pools. Node test execution detects unhandled rejections; these tests do not inject a real database disconnect or real Discord transport failure. Exact-head CI must be checked after commit.

Still outstanding: contextual access mutation tests against disposable PostgreSQL; actual runtime shutdown/drain during timed-out reads; real restart and network-partition behavior; controlled live Discord and mobile/accessibility review; security/raw-log, legal, database role/TLS/migration and release approvals. Nothing in this patch establishes production readiness or closes those gates.
