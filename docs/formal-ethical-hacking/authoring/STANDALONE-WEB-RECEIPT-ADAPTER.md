# Detached web receipt adapter - candidate contract batch

Baseline: 7a0ef30a70584b26c5a9f7cfc10d3c0ef6ae6def. This draft adds an adapter, its scripted contract tests and this note, and extends the existing marker-gated receipt CI workflow. Existing SQL, SQL acceptance runner, legacy adapter, core, pinned composition, schema/grants, dependencies and startup remain unchanged. No Copilot is used.

## Interface and trust boundary

createWebReceiptStore is default-off without accessing providers. Enabled use requires literal reviewOnly/syntheticOnly/disposableReview gates, a fixed actor/guild/course/content/generation binding, exact ng_web_review_ci database and web_receipt_ci_worker role, and explicit getResources/isReady ports. It creates no pool, connection, listener or environment fallback. Methods recordSave(context,command) and readReceipt(context,command) require actor/guild context and the exact original operationId/expectedRevision/pageKey command. The adapter never generates an operation ID or rebases a command.

Each attempt borrows one client, opens a transaction, installs local statement/lock/idle-transaction bounds, and checks database/worker/version/contract/schema/table/function/membership metadata on that same client before the parameterized RPC. The role/schema checks assume trusted infrastructure and do not prove physical isolation or authenticate Discord identity. Configured contentRevision must later come from reviewed pinned composition; this adapter does not load or hash lesson bytes.

Plain own data-property records are captured before awaiting providers. Extra fields, accessors and symbol properties reject. Receipts must match the entire fixed scope and original command, use the exact metadata-only field set and contain a valid saved revision or a conflict with null result revision. A confirmed historical receipt is not the latest bookmark.

## Outcomes and uncertainty

- receipt: the validated saved/conflict receipt was returned only after acknowledged COMMIT and final readiness/release checks.
- receipt-not-visible: read_receipt returned NULL; this is not proof no original request is pending or can arrive.
- unavailable: this attempt could not produce a confirmed receipt. Even confirmed rollback describes this attempt, not the lifetime of an original operation that might have committed earlier.
- outcome-unknown: a dispatched write lacks confirmed rollback, or COMMIT was attempted without acknowledgement. A subsequent successful ROLLBACK does not downgrade uncertain COMMIT to no-write.
- acknowledgement-unavailable: COMMIT is known acknowledged but disposal, readiness loss or release failure suppressed the receipt.
- disabled: the factory remains off.

Operation IDs are preserved in classified failures when a valid command was captured. No raw provider error, automatic replay, retry or replacement request is emitted. SQLSTATE errors do not become invented business receipts. Current-attempt rollback must never automatically free an unresolved original operation.

## Actual local checks

On 2026-11-02, Node v20.20.1 ran the named adapter suite, including strict unhandled-rejection mode. All 64 tests passed with zero failures/cancellations/skips. Tests use scripted borrowed clients, query responses, faults and controlled promises. They cover original-command/receipt binding, invalid privileges/inputs, NULL lookup, rollback/COMMIT/release classification, capture races, rejected asynchronous ports, disposal, readiness loss, accessor/symbol rejection and one-attempt admission. SQL strings were not parsed or executed locally. No PostgreSQL server/connection, package installation, network, SDK, full checkout or other suite was exercised.

The workflow adds the new paths and one named strict contract step. Repository permissions, four-combination Node 20/22 x PostgreSQL 16/18 matrix, marker, service fixture, SQL hash and existing enabled SQL acceptance step are preserved. New exact-head CI is pending approval/publication. The existing fifteen SQL cases test backend functions directly, not this new adapter; real adapter/SQL composition acceptance is still required.

## Remaining gates

This is not a drop-in compareAndSet progress provider and is not wired to the existing rehearsal. It has no durable command custody, receipt-aware controller, current-bookmark read, namespace ownership registry, cross-instance admission or restart recovery. busy prevents only overlap inside one instance; it does not persist a fence after an unknown result or bound the number of instances. Those obligations remain with a reviewed parent.

Pool acquisition, resource providers, query transport, COMMIT, rollback and release can remain pending. An embedding lifecycle must bound caller waits, retain outstanding work and avoid claiming physical cancellation or closing shared storage after a false drain. dispose rejects future work and rechecks current work; it is not cancellation/drain. Readiness rechecks are not transaction-coupled Discord authorization. Server scope checks and private presentation still require trusted composition.

No schema/privilege application, service credential, real learner record, Discord publication, startup activation, merge or deployment is authorized by this source draft. Independent human/security review, actual restricted-worker adapter composition, durable intent/explicit reconciliation, privacy/retention/restore decisions, learner/staff separation and release/staging/rollback approval remain open.
