# Synthetic submission/review buttons — offline dispatcher

Isolated prototype beside the existing navigation and review modules. It imports no Discord SDK and performs no transport, evidence upload, persistence or production authorization. Never import it into academy runtime. This batch does not modify workspace.mjs, review.mjs, their existing tests, application entry points or manifests.

## Named local test
From this directory in a trusted checkout with Node available:

```sh
node --test controls.test.mjs
```

The tests import the existing review.mjs and the new controls.mjs. The earlier review source was retrieved at commit 2f3ab70300ef2fb8719cf0bc7d692a9301874818; its local reconstruction matched Git blob c685401e32f9a365c65aa072fcc92d22bee3cb93 before execution. No broad fixture discovery or package installation is involved.

## What the control actually binds
A successful build reads the synthetic record through the store, checks a separate injected mutation-authority callback, rechecks the record revision and issues opaque random-token button IDs. The in-memory entry holds actor/workspace/course/message/private-marker context, action, expected record revision, mutation request ID and the fixed demo command. Record IDs, revisions, evidence and decisions are not accepted as overrides in press input. The custom ID contains only a prototype prefix and opaque token.

Owner controls can submit from working or changes-requested state. Non-owner review controls can request changes or record a review only when the record is submitted and the injected authority allows it. Model authorization and transition checks still apply when dispatch occurs. Knowing a token is not enough in the tested cross-actor/context cases. Unauthorized use does not consume the owner's valid control in the tested case.

Every command uses the fixed demo-evidence-a or demo-feedback-a reference. These buttons do not collect user-written evidence or feedback, choose uploaded files or verify any underlying content. Repeated submission can refer to the same fixed fabricated reference while creating a later model revision.

Before dispatch, press verifies the captured context, control lifetime, current store read and current mutation authority. It dispatches the captured command rather than caller-supplied command fields. The underlying model supplies stale-revision conflicts and identical-request replay behavior. A separately built old-revision control is a different request and conflicts after another control updates the record.

The module returns a same-message edit intent and demo record result, not a real message update. Components are button-shaped data only. workspace.mjs has not been modified to display or route these mutation controls, and the earlier journey harness remains unchanged. This slice composes controls with the review model, not all production services.

## Executed tests
The exact new module/test contents ran locally on Node v20.20.1: twelve top-level tests passed, zero failed and zero skipped. Multiple assertions/cases within a test are not additional top-level tests.

Coverage: button-click submit/changes-requested/resubmit/recorded-review cycle reaching revision 4 with no grants; cross-actor use; changed workspace/course/message/privacy marker; rejected command-field overrides; stale independently issued control; identical-control retry; expiry before dispatch; revoked review authority; neutral authorizer exception; unknown control/real-shaped actor; capacity/expiry/disposal; and read access without mutation authority. The previous 32 prototype tests were not rerun in this batch, so this is not a new combined-suite result. A local JSON execution artifact was generated separately, not committed as CI evidence.

## Limits that remain
actorId and privateWorkspace:true are supplied by the harness, not trusted SDK context or proof of privacy. The authorization callback is a test double. Production identity, actual private message checks, exercise-specific permission, live reviewer assignment, interaction acknowledgment and message-edit failures are unimplemented. No slash command, modal or live Discord session is added.

There are at most 100 control entries by default, with a bounded configurable lifetime/capacity. State disappears on disposal/process exit. Time is a supplied test clock, not a production monotonic-clock design. Expiry is checked before invoking the store; an operation already admitted is not transactionally cancelled if expiry/disposal occurs while a downstream call is in progress. There is no distributed transaction or race-free revocation guarantee. Callback timeouts, hostile JavaScript objects, restart recovery, durable idempotency, audit, retention and deletion need separate implementation/testing.

No real learner record, content, account, database or external service is used. The architecture remains undecided in the manifest and runtime integration/publication stay disabled. Community Learning, existing learner behavior, course registration, lab permissions, awards and deployment are unchanged.
