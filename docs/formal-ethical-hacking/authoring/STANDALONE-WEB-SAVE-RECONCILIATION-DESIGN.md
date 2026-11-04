# Web bookmark save reconciliation - design review, not implementation

Baseline: d5623188af57485f6e52f82d56a58df199e7cb9f. This batch appends two scripted characterization tests to the existing adapter contract suite and adds this design note. It changes no adapter/core/composition, schema, workflow, startup, credential, live database, Discord route or deployment. Nothing below is an implemented recovery API or authorization to install SQL.

## Why a bookmark reread is insufficient

The current schema keeps guild/actor/course/content namespace, page and revision, but no per-save operation identity or immutable receipt. The adapter's compareAndSet takes subject, expected revision and page; provider errors become a generic failure. A rejected call does not prove rollback.

The added tests run the actual unchanged adapter against a scripted query model with two writer instances for the same synthetic authorized namespace. They compare two histories:
- A commits http/revision 1, then loses acknowledgement; B's initial save conflicts.
- A fails before committing; B saves http/revision 1.

A sees the same generic original error, the same current http/revision 1, and conflict on an explicit stale attempt in both histories. If B next saves entry/revision 2, A again sees identical current state and stale conflict. Matching page/revision is not a receipt for A; a different latest page is not proof A never committed. A stale-attempt conflict describes that attempt, not the original operation's outcome. The adapter makes no automatic retry in either characterization.

These are selected source/model counterexamples, not real PostgreSQL timing or network-failure experiments. Their passing result records an unresolved limitation; it must not be presented as successful reconciliation or retained as the desired behavior of a future receipt API.

## Proposed protocol invariants - require independent review

1. Trusted composition must bind a durable operation ID to the original guild, actor, course, content revision, expected bookmark revision, selected page and reviewed finite validity/fencing context. An operation ID is not authentication. Do not accept caller-supplied identity or silently change the operation after uncertainty.
2. The bookmark compare-and-set and immutable operation result must commit atomically. Concurrent invocations of the same operation need server-side serialization/deduplication; identical replay returns its original result without another mutation. Changed payload under the same ID must reject, even if it would independently be permitted. The current direct-table adapter/grants do not implement this protocol.
3. Keep the original-operation receipt distinct from the latest bookmark. A saved receipt may remain true after a later authorized writer advances the bookmark. Never label a replayed historical receipt as the current bookmark or use it to overwrite later work.
4. After dispatch, timeout/disconnect/generic unavailable remains unknown unless transaction/receipt evidence establishes a specific result. A missing receipt from an ordinary unlocked read does not exclude a still-pending or not-yet-arrived request. Do not automatically retry, rebase expected revision, mint a replacement ID or release a scope solely by age.
5. Preserve the original minimal command metadata across restart before dispatch if recovery across restart is claimed. An in-memory token or bookmark reread is insufficient custody. Missing/corrupt custody requires a blocked/operator reconciliation path, not invented intent. Reauthorize explicit recovery and response delivery; checks around SQL are not atomic Discord/SQL revocation.
6. Specify bounded receipt/intent capacity, approved retention/deletion and late-request fencing before activation. Do not import the intake-report 24-hour policy as a bookmark policy. Purging a receipt must not allow a still-valid old operation to execute again. No deadline, production retention rule or cleanup authority is established here.

A future source-only SQL/adapter candidate needs separate review and disposable validation. If receipt writes are enforced through functions, review worker ownership and EXECUTE/direct-table privileges explicitly; a wrapper alone cannot turn the existing broad table grants into a database-enforced protocol. No current grants change in this batch.

## Acceptance obligations before enabling recovery

- Same-ID concurrency, identical replay and changed-payload rejection, including replay after later bookmark updates.
- Loss before/after commitment, absent-receipt races, late original requests, bounded waits and explicit recovery without duplicate mutation.
- Real process restart with preserved original command, competing owners and honest treatment of missing/corrupt custody.
- Actor/guild/course/content isolation and revoked/expired authority before replay or presentation.
- Receipt/intent capacity, finite validity, retention and post-deletion replay fencing.
- Actual PostgreSQL 16/18 restricted-worker behavior in the existing approved disposable environment, plus unchanged legacy regressions and independent review.

This list is a review plan, not completed acceptance. It does not require broadening any current scope, timeout or privilege guard.

## Local evidence and preservation

On 2026-11-01 local time, Node v20.20.1 ran the original adapter contract suite (13 passed) and the extended suite (15 passed), with zero failures/cancellations/skips. The adapter blob matched 427b44bee9e012d2f42efca5cc7231bc93b0af7e and the original test blob matched 358de3395af3e9d54b1ad55988662e3da5b1dfd4. The original test file is preserved byte-for-byte as the prefix of the candidate.

Only the actual adapter and named tests ran in a temporary selected-source workspace. Query responses and commitment histories were scripted; SQL was not parsed/executed. No server, network, dependency install, connected child process, full checkout or other suite was run locally. Existing disposable CI already includes the named adapter test; inspect new exact-head results after any approved publication. Prior green runs do not validate a new receipt protocol.

The rehearsal remains detached/default-off, internal and synthetic-only. Independent full-branch review, save recovery implementation, stale-version handling, learner/staff separation, private Discord integration, accessibility and release/staging/rollback approval remain open. No merge, live operation, learner-data collection, deployment or award is authorized.
