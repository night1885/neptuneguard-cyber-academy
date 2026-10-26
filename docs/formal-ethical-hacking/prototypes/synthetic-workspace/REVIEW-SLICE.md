# Synthetic submission and review — offline state slice

Independent executable prototype beside workspace.mjs, not integrated into it. Never import this model into academy runtime or use real learner records. This batch implements no Discord handler, evidence upload, database, schema migration, production identity adapter or deployed review workflow. Architecture and publication manifests remain unchanged.

## Run the named test
From this directory in a trusted checkout with Node available:

```sh
node --test review.test.mjs
```

Only Node built-ins are imported. No package installation or network connection is needed by these files. Do not use broad discovery across deliberately defective teaching fixtures. The existing application and combined maintainer runner do not import or run this new model through a new integration.

## Implemented synthetic behavior
The store keeps at most 20 records and 100 unique mutation request results in memory. Draft creation generates a UUID and starts at revision zero in working state. An owner can submit a demo-evidence reference from working or changes-requested state. A separately authorized non-owner can record changes-requested or review-recorded from submitted state using a demo-feedback reference. Resubmission increments the revision, replaces the demo evidence reference and clears the previous current feedback reference. No full history or retention contract is implemented.

Submit/review commands require the expected revision. A stale revision conflicts without overwriting the current record. Mutation request IDs are scoped to actor/workspace/course/record; an identical authorized replay returns its original result without another transition, while a changed body under the same key conflicts. Replays recheck the injected authorization callback. An original replay result can be an older snapshot; use read for current state. Draft creation itself has no idempotency key and repeated creation can create separate drafts.

Operations serialize through one promise queue within this instance only. Authorization is checked before a mutation and again before the synchronous in-memory commit. Stored records and replay results are copied before exposure so the tested response mutation does not alter the stored record. Neutral dependency failures disclose no exception message. Neither a successful submission nor a recorded review grants enrollment, course/lab access, a formal completion decision or an award.

## Trust boundary and missing implementation
Context and privateWorkspace:true are harness values, not verified Discord identity or actual private delivery. authorize is an explicit test-double dependency. The tests model one synthetic reviewer; this is not a real instructor-assignment adapter. The store has no exercise/lesson-specific authorization, lab-scope decision, student-ID replacement, live revocation consistency guarantee, audit service or retention policy.

Only demo-prefixed actor/workspace values and demo-ethical-hacking are accepted. Evidence/feedback references must be primitive strings matching their demo patterns; raw URLs and coercible objects are rejected in the tested cases. These markers reduce accidental use but do not prove that arbitrary values are synthetic or safe. No content is uploaded, fetched, scanned or stored as evidence. Unknown role/owner fields in the tested context/command are not authoritative. Comprehensive hostile-JavaScript-object validation is outside this prototype.

All state and replay information disappear on disposal or process exit. The queue is not a database transaction, distributed lock or cross-instance concurrency control. There is no durable idempotency, rollback/restart recovery, authoritative timestamping or append-only history. Capacity exhaustion fails closed; the request-cap boundary is implemented but was not exercised by the supplied tests. Hanging/reentrant callbacks, callback timeouts and production service failure recovery remain unimplemented.

## Local execution record
The exact model and test contents ran in a temporary local directory under Node v20.20.1. Twelve top-level tests passed, zero failed and zero were skipped. Multiple assertions inside a test are not extra top-level tests.

Tests cover: create/submit/review with no grants; changes-requested and resubmission; cross-owner/forged-role/forged-owner denial; wrong workspace/course/private marker; unassigned reviewer and self-review; stale revision; identical mutation replay; conflicting reused request ID; simulated revocation before commit and authorizer failure; two concurrent submissions with one stale conflict; raw/coercible reference rejection and response-copy isolation; constructor requirements, record-capacity boundary and disposal.

This is a local synthetic state-model result, not GitHub CI, a database acceptance test, a browser/Discord session or the complete first-journey workflow. The earlier navigation slice still has no submission/review controls; the two modules have not been composed or integration-tested in this batch. A separate local JSON execution artifact was generated and is not automatically committed as CI evidence.

## Next gates
Review this provisional lifecycle and its contracts, then compose only a bounded synthetic harness before considering real adapters. Real persistence, evidence handling, reviewer assignment, exercise authorization, audit/retention/deletion, accessibility and live interaction behavior need explicit designs and tests. No learner data, feature flag, runtime import, Community Learning behavior, manifest status or deployment is changed here.
