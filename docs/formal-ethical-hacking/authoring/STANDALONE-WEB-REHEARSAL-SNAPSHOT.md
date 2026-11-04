# Standalone web rehearsal - pinned content composition candidate

Source-only, default-off review component based on commit 8fb527020f95ea4cdb966af2bcc84ead91c27ffe. It does not register a production course, start a client/pool, connect to a database, apply SQL, publish Discord content or change startup. Original core, lifecycle, adapter, schema and content drafts remain unchanged. Only the existing disposable CI workflow is extended.

## Content and progress binding

standalone-web-rehearsal-snapshot.mjs composes the actual bounded lifecycle/core and PostgreSQL adapter. It pins only entry and http to their existing fixed paths, exact UTF-8 byte sizes (6841 and 5511) and SHA-256 digests. The contentRevision is SHA-256 over JSON.stringify of the ordered object {format:1,courseKey,pages} as defined by the frozen manifest. Its current value is e51f04e41df9f7fa8cbbaf4da7266f3bbfbbc2b5ae4ccaeea14a1299737925c6.

Enabled composition requires reviewOnly, syntheticOnly and disposableReview all literally true, a trusted file-URL repositoryRoot, explicit guild/database profile and trusted authorize/query providers. Caller-supplied contentRevision configuration is rejected. The derived revision is passed to the actual adapter; the caller cannot substitute a different progress store or loader through this factory. Flags and matching database names do not authenticate users or prove infrastructure isolation.

Each returned page must match the selected file's pinned bytes. Each compare-and-set provider verifies the selected page before issuing adapter queries. Source drift fails closed even when length is unchanged. Construction performs no file read or query. This is per-selected-file verification, not a complete startup inventory. Direct use of the old core/loader/adapter does not acquire pinning automatically.

Files resolve inside a trusted checkout. The containment observation is not a race-free file capability against adversarial ancestor mutation. readFile still reads the complete file before size/hash validation; this is not an early streaming memory bound. The checkout and provider construction must remain trusted. No Markdown links are traversed and no lesson commands are executed.

## Actual local evidence

On 2026-11-01 local time, Node v20.20.1 ran node --test standalone-web-rehearsal-snapshot.test.mjs in a selected-source temporary workspace. All 13 tests passed, with zero failures, cancellations or skips. The three reused module blobs and two page blobs were matched to GitHub before execution.

Tests exercise exact actual draft text, fixed namespace, explicit gates, save/re-created-composition resume, same-length drift before read/save, missing/outside-root sources, revocation, foreign inputs, stale saves, simulated post-commit response loss, shutdown and wrong database identity. The real adapter executes against a scripted query double. Re-creating a composition is not an OS/process restart. No PostgreSQL server, Discord SDK/client, network, package installation, full checkout or existing-suite rerun occurred locally.

The updated read-only workflow runs this named suite alongside the existing core/lifecycle/adapter suites and unchanged nine-subtest real-PostgreSQL acceptance on Node 20/22 x PostgreSQL 16/18. It also triggers on changes to either pinned draft. The new pinned composition is not itself exercised against real PostgreSQL by that acceptance file. Inspect exact-head CI before claiming combined success; the earlier 36 green checks cover only the prior head.

## Remaining gates

Unknown save commitment, automatic reconciliation/idempotency, transaction-coupled authorization, stale-version notices, old-snapshot retention/deletion, trusted Discord identity/message/session binding, pagination, accessibility and independent review remain open. A timeout is not cancellation or rollback. stop retains the existing bounded drain semantics and does not close borrowed storage.

This is an internal synthetic review snapshot, not learner publication. W00 contains instructor discussion guidance; actual learner/staff separation and content approval remain mandatory before delivery. Bookmarks do not establish progress through teaching, grades, authorization or awards. No course completion, OSWE readiness, merge, deployment or live staging activity is authorized.
