# Composed synthetic learner/reviewer journey — local tests

This batch composes the existing workspace.mjs and review.mjs inside a test harness only. It adds no application service, Discord interaction handler, database, upload path or production identity adapter. Never import these prototypes into academy runtime or use real evidence.

## Exact source and command
The existing modules were retrieved from commit 2f3ab70300ef2fb8719cf0bc7d692a9301874818. Local source reconstruction matched their Git blob hashes before execution:

- workspace.mjs: 168931ed437e5d3855165fb4e8c98ddae5159353
- review.mjs: c685401e32f9a365c65aa072fcc92d22bee3cb93

From this prototype directory in a trusted checkout with Node available:

```sh
node --test journey.test.mjs
```

The eight new top-level tests ran locally on Node v20.20.1: eight passed, zero failed, zero skipped. The prior 24 standalone tests were not rerun in this batch. This is a selected-file local execution, not a full checkout, GitHub CI or a live Discord journey. A separate JSON execution artifact was generated locally and is not silently committed as CI evidence.

## What was composed
The harness creates one synthetic record, supplies an in-memory assignment set and creates separate workspace instances whose page-loader closures are bound to a fixed synthetic actor and record. The loader calls the review store's authorized read and renders only synthetic status, revision and demo evidence/feedback references. The generic workspace loader does not independently receive an authenticated actor; the fixed harness closure is not a reviewed multi-user adapter.

Mutation steps invoke the model's submit/review functions directly from test code. The workspace still exposes only overview, lesson and help buttons. There is no submission/review button dispatcher, modal, slash command, real message edit or actual private surface. The tests demonstrate that refreshed view plans reflect model changes, not that a learner can perform these actions in Discord.

## Executed scenarios
1. Working record, submission, changes requested, resubmission and final recorded review. The record reaches revision 4 while the learner's refreshed view plans retain the same synthetic message ID. Access/award/durable-progress flags remain false.
2. Another synthetically assigned learner cannot render the owner's record or receive its demo evidence reference.
3. Removing the reviewer's synthetic assignment blocks their next rendered view.
4. A stale review conflicts and leaves the displayed record submitted at revision 1.
5. Identical submit replay leaves the rendered revision at 1 rather than creating another transition.
6. Revoking assignment after the store read but before page delivery prevents that page plan from returning its demo reference.
7. Attempted message retargeting is denied and leaves model state unchanged.
8. Disposing the store or using a fresh empty store cannot recover the old record; disposing the workspace prevents re-entry. This demonstrates the absence of durable recovery, not an implemented recovery feature.

## Remaining boundaries
All identities, assignments, course keys, private markers, message IDs and evidence references are synthetic harness values. No real guild membership, course/lab assignment, exercise scope, reviewer authorization or private delivery is established. The existing prototype limitations still apply, including in-memory state loss, callback failure/timeouts, concurrency beyond a single instance, production clock behavior, privacy/retention, audit and inaccessible or expired real messages.

This is not an end-to-end student platform or approval to collect evidence. Real architecture and trusted adapter contracts must be approved and implemented separately. The existing models, root application, course catalogue, manifests, Community Learning, publication flags, services and deployment remain unchanged.
