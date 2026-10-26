# Review response-loss and replay regression slice

Isolated synthetic tests for the existing review.mjs. No production code, handler, package script, workflow, database, feature flag or architecture manifest change. Never import this prototype into academy runtime.

## Run

From this directory in a trusted maintainer checkout with reviewed Node.js 20+ available:

```sh
node --test review-recovery.test.mjs
```

Only Node built-ins and the adjacent review model are used. No npm install, service connection or real learner data is required. This is not an instruction to provision or reconnect an exercise guest.

## Four selected cases

1. A harness receives a successful submit result, then throws to simulate losing that response. Repeating the same request returns the original result without a new revision.
2. Replaying a submission after review returns its ORIGINAL receipt, while a separate authorized read returns CURRENT record state. A future presenter must not portray the receipt as current state.
3. Revoked authorization prevents replay of a previously successful receipt and prevents a protected read.
4. Identical concurrent review requests serialize through the model and produce one review revision.

## Actual local evidence

The four new top-level tests passed with zero failures and zero skips on Node v20.20.1 against an exact local transcription of review.mjs verified by Git blob SHA-1 c685401e32f9a365c65aa072fcc92d22bee3cb93. This is selected local execution, not GitHub CI, a full checkout run, a full prototype-suite regression or real Discord acceptance.

## Limits

The lost-response case throws in a harness AFTER the store returns successfully; it does not inject a failure inside the store, kill a process or prove durable commit recovery. The model and its request receipts remain in memory. Promise concurrency exercises its single-process queue, not multiple database workers. Identity, assignment, reviewer authority and the private-workspace marker are test inputs, not trusted Discord adapters.

No private message is sent or updated. Current-state refresh is demonstrated by an explicit authorized store.read, not implemented in a production presenter. No evidence storage, retention/deletion, grade, access grant or award is added. Existing review receipt semantics remain unchanged.

## Follow-up

Use the existing synthetic workspace as the integration baseline rather than importing parallel generated models. Before actual message delivery, specify current actor/course/exercise authority, protected read consistency, navigation envelope/revision handling and uncertain-delivery recovery. Review the platform and evidence policies before runtime integration, then obtain separate approval for any live connection or deployment.
