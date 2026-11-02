# Standalone web rehearsal — bounded provider lifecycle

Source-only synthetic review extension. This batch adds a wrapper and tests; it does not edit the original core, import the wrapper into startup or enable Discord/Render/database activity.

## Implemented contract

createBoundedWebRehearsal remains default-off without accessing providers. Enabled composition also passes through the core's explicit reviewOnly/syntheticOnly gates. Provider waits default to 250 ms (allowed 5–1000), shutdown drain to 1000 ms (5–2000), admitted operations to 20 (1–20) and outstanding provider promises to 8 (1–8). Excess work returns unavailable rather than queueing indefinitely.

Every authorize/load/read/compareAndSet provider call is wrapped. A timed-out call remains counted as outstanding until the underlying promise settles; late rejection is handled. Provider methods retain their receiver through forwarding closures. These are per-call waits, not one global operation deadline or a per-user fairness/rate-limit policy. JavaScript timers cannot preempt blocking synchronous code or an event-loop stall. Trusted provider construction must still be reviewed.

stop is idempotent: it blocks admission, stops the core and waits for admitted operations plus unsettled providers up to the drain bound. It returns drained:true only if those promises settle, or drained:false when the bound expires. The first stop result is cached; a false result is not silently upgraded after late settlement. No provider is claimed cancelled and no database pool is closed by this wrapper. A settled rejected promise counts as drained, not as a successful operation.

## Unknown save outcomes

A provider can commit after the caller receives unavailable or after stop/revocation. Timing out or suppressing the response is not rollback. The wrapper makes no automatic retry and implements no idempotency/reconciliation protocol. A durable adapter and recovery process must distinguish confirmed, conflicting and unknown write outcomes before live use. Do not blindly close shared storage after drained:false or infer that no bookmark changed.

## Actual validation

On 2026-11-01 local time, the new named Node test suite ran in a disposable local directory against the committed core reconstructed from Git blob 1a8d75bbc9193083d98e72410d9b51cad87572f7 at commit 5edcaf151a812a7c97094e3766b966b77ae1d0d3. That blob identity was verified before execution. Ten tests passed with zero failures/cancellations/skips.

Cases: disabled provider isolation; invalid bounds/review gates; normal read and idempotent stop; hung authorization/false drain; operation admission; retained capacity after timeout; late save commitment with no retry; late rejection handling; stopped read suppression/settlement; and stopped write commitment without a false cancellation claim.

Controlled promises and synthetic in-memory records exercise actual wrapper/core composition. They are not PostgreSQL, real concurrent transactions, a process crash/restart, SDK/Discord delivery, staging, full-checkout regressions or CI. The original 13-test core suite was not rerun in this batch; its earlier evidence is separate. Reproduce the new suite with node --test standalone-web-rehearsal-lifecycle.test.mjs from a trusted checkout root.

## Remaining integration gates

Durable storage/schema, real restart/crash/concurrency tests, content revisioning, retention/deletion, trusted course/student/guild binding, private message/button adapter, pagination, stale-control tests, fairness/rate policy, save reconciliation, full-source/SDK/integration validation and independent staging/rollback review remain open. The unwrapped original core remains intentionally unchanged and does not gain lifecycle bounds automatically.

No existing file, production course registration, prerequisite, permission, startup, CI definition, package manifest, database, learner record, Discord message, Render setting, deployment or award is changed. Repository automation may run on a commit. This is not completion of the internal rehearsal or course release.
