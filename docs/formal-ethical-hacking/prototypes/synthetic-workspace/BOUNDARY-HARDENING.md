# Detached boundary hardening batch

Prepared against boundary Git blob e2a7e0159ed6c9968eca9c9fb6ecc3dceae7d9a9 after PR #42.

## Reproduced finding and fix
An initial clock reading of -1 passed the previous guard because lastNow started at -1. The boundary now explicitly rejects negative readings before invoking coordinator operations. This aligns the lower bound with the coordinator, without claiming cross-process clock correctness.

## Preparation evidence
The 20 new scripted boundary cases produced 19 passes and one failure on the hash-matched baseline. With the negative-time guard, all 20 passed locally on Node 20.20.1, with no skips or cancellations. Cases cover literal readiness, readiness exceptions/rejected promises, invalid/regressing clocks, already acknowledged interactions, private control ownership, unsupported routes, provider exceptions, disposal/readiness loss during pending preparation, malformed preview metadata and 100 settled control bindings with expiry-based capacity recovery.

The capacity test is sequential: it does not establish a concurrent admission bound. Provider doubles are not live Discord SDK validation. Tests do not prove erasure, persistent storage, privacy permissions, reviewer UI or live readiness. No new combined-suite, Node 22, full-checkout or CI result is claimed at preparation time.

## CI and boundaries
Append the new suite and its path filters to the existing isolated Node 20/22 workflow. Retain the existing seven-case suite, permissions, timeout and action versions. Action-runtime warnings are not resolved by this batch.

No policy, retention deadline, SQL, dependency, startup or service setting changes. No database, Discord, deployment or live intake action. This candidate is local preparation; repository writes require exact approval.
