# Report-retention boundary inspection — synthetic only

Addresses the first controlled-clock boundary checks in Issue #30; it does not
complete that issue. Never import this module into academy runtime.

The confirmed report rule is 24 elapsed hours after successful submission, not
registration or review closure. This inspector accepts fictional metadata only,
never report bodies. It requires an explicit trusted fixture clock and computes
the deadline from the supplied original submission time. Exactly at the deadline
the window is expired. Another submission on the same record has its own deadline.
Drafts and shared records return policy-unresolved, not an invented expiry rule.

All results explicitly deny authorization, deletion and live intake. An open
retention window does not establish identity, ownership or reviewer authority.
Input validation does not prove that timestamps or identifiers are authoritative.
A real adapter would need trusted stored timestamps and its own authorization.
Inspection does not persist snapshots, enforce immutable timestamps, perform actual
retry handling, block real cached deliveries, or stop a real read/review handler.

The clock-regression guard is local to this inspector instance. It is not durable
clock protection across restarts and cannot prove the external clock is correct.
Repeated inspection is not an integration test of submission idempotency.

There is no SQL, driver, Discord/HTTP client, timer, deletion command, scheduler,
account-cleanup import or production flag. Existing enrollment retention and the
PostgreSQL fixture are unchanged. Actual purge/recovery, source-message deletion,
backup/log/cache policy, draft/shared-record policy, identity adapters, reviewer
and operator authority remain separate implementation and approval gates.

Run: node --test report-retention.test.mjs
Local preparation: Node 20 syntax checks and 13 selected tests passed; no database,
Discord API or full application regression was run. Proposed CI integration adds
only this test filename to the existing consolidated synthetic test command and
adds the isolated branch to that workflow's push branch allowlist. Existing job
settings/tests are preserved; no additional workflow or matrix is introduced.
