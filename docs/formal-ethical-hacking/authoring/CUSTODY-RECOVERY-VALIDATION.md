# Custody recovery validation — bounded checkpoint

This package closes the read-only inspector and interruption-test work. It does not implement or authorize remediation, production activation, automatic stale-lock removal, journal reset or mutation replay.

## Fixed evidence scope

One consolidated local run: 27 passed, 0 failed, 0 skipped. It contains 18 read-only inspection cases, four actual child SIGKILL cases after persisted prepared/pending/uncertain/resolved checkpoints, and five actual child SIGKILL cases at test-instrumented write boundaries. The committed state and storage reference bytes are verified by Git blob hashes in the test before execution. CI results for a new commit must be inspected separately.

Write-boundary instrumentation is generated only inside temporary test directories. Runtime storage is unchanged. Hooks pause after completed temp write, file sync, close, rename or directory sync. Before rename, the old journal and orphan temp remain; after rename, the new journal is visible. The lease remains and ordinary reopening is refused. Inspections and failed reopen attempts preserve file names and contents. Reads may update access timestamps.

## Recovery decision boundary

The inspector is disabled by default and reads bounded file contents only. It requires trusted directory/storage assumptions, an independently retained expected instance/scope identity and an operator quiescence attestation. The attestation and two matching observations are not proof that all writers are quiescent. A present lease is not automatically declared stale.

Every result sets mayActivate, mayRemoveLease and mayDiscardCommand to false and requires operator review. Prepared/pending/uncertain states retain original command custody. A resolved stored receipt is not current access or delivery authority. Missing, corrupt, insecure, mismatched, partial or orphan-containing snapshots are refused, not reset. No lock-deletion command is supplied.

## Limits and package closure

These tests do not simulate host/power failure, torn writes, disk corruption, an in-progress syscall, real network partitions, PostgreSQL crashes or distributed writer quiescence. Resolved test receipts are synthetic. Filesystem and parent-directory trust, coordinated rollback, global wait bounds and production authorization are not established. Snapshot-change detection is implemented; deterministic change-and-revert race coverage is not claimed.

The operational remediation design and independent review remain explicit release gates; they are not silently marked complete by these tests. Further optional recovery cases are outside this fixed package unless a concrete agreed blocker requires them. No academy runtime, SQL schema, Discord handler or Render setting is activated by this package.
