# Integrated report retention — owned disposable CI only

Related to Issue #30; does not close it. Baseline: dcf8065179761109dd48189c165cb161abb7a1c9 (PR #31 merge).
Never install these SQL files as academy migrations or import them into runtime.

## One feature package
The add-on reuses fixture.sql's demo assignments, record locks, scoped reviewer
grants, restricted worker and explicit disposable database guard. It adds immutable
submission snapshots and feedback, stored per-submission deadlines, revision heads,
minimal report-specific audit/receipts and one fictional external-copy outcome.
The base record stays metadata-only: body-bearing old read/mutate functions lose
worker EXECUTE in this add-on, preventing the legacy fixture API bypassing expiry.
The base fixture and its original tests are not modified.

Submission time comes from an admin-controlled database fixture clock, never an API
parameter. Each report expires at its own submitted_at + 24 elapsed hours. Feedback
and retries preserve that timestamp. New explicitly submitted revisions have new
IDs/deadlines; old snapshots are never overwritten. Reads, reviews and receipt
replays check both current database authority and the report deadline. A stale retry
after receipt purge may conflict; it must never create a replacement window.

Resubmission remains limited to working/changes-requested. Expiry does not reopen a
completed or pending review or silently authorize a new attempt. Post-expiry retry/
re-entry policy outside those transitions is not supplied. Shared record/reviewer/
assignment metadata is not erased by a report purge. No draft-expiry default is added.

## Deletion simulation and limits
Only the CI admin may invoke purge_report. The worker cannot invoke purge, read raw
tables, alter the clock, call the clock helper, or use old body/read/replay routes.
A not-due report is not deleted. Pending/failed fictional copy outcomes return
deletion-pending, not success. Confirmed is only a scripted test-provider outcome,
NOT a Discord deletion result. No Discord/HTTP client or real resource ID is used.
After that fictional confirmation, an expired snapshot and its own feedback, audit,
receipt and copy rows are deleted atomically. A failure must roll back those writes;
a newer submission, base record and assignment remain intact.

Keeping an overdue failed-copy fixture is a deliberately tested failure, not an
approved retention extension or claim of compliance. Production retry/failure logs,
retention exceptions, backups, exports, caches, orphan resources and deletion proof
remain unresolved. No report-linked tombstone retention default is invented.

## Trust, consistency and release boundaries
The harness can assert any demo actor; database authorization checks do not prove
Discord identity. Real namespaces remain rejected by the base fixture. Database
privilege/immutability tests are not protection against an unrestricted superuser.
The controlled fixture clock is not wall-clock validation. Its shared transaction
lock makes test ordering deterministic; this does not prove real-time expiry during
a long operation, external revocation consistency or delivery after commit. A new
client read is not a crash/restart, backup/restore or connection-loss recovery test.
No staging or production identity/storage/message adapter is wired.

Use existing Node 20/22 x PostgreSQL 16/18 CI. Run the original and new database test
files serially (--test-concurrency=1), because each owns and tears down the same fresh
service database/schema/role. Do not weaken the empty-database guard to run in parallel.
No new workflow/matrix, dependency, production migration, runtime flag, scheduler,
real intake, production connection, Discord operation or deployment is introduced.
All local and CI validation must be reported separately; PostgreSQL execution is
pending until this proposed source change is approved and its workflow runs.

Local preparation: JavaScript syntax checked on Node 20.20.1; three offline
configuration-guard tests passed. The integration parent was deliberately filtered
out. Seventeen new PostgreSQL subtests are authored, NOT executed locally. No local
PostgreSQL engine or PostgreSQL/PLpgSQL parser was available. No SQL behavior,
transaction test or new matrix job is claimed as passed at preparation time.
