# Synthetic Discord-first workspace — offline navigation slice

Isolated executable prototype, not academy runtime or a Discord bot. Never import it into production. This batch explores a Discord-shaped button view without changing the architecture manifest, registering a course, connecting a service or activating the formal programme. It is not a complete implementation of the proposed first-journey workflow contract.

## Run only the named local test
From this directory, in a trusted checkout with Node available:

```sh
node --test workspace.test.mjs
```

Only Node built-ins are imported. No discord.js dependency, npm install, Discord API call, database, migration, filesystem-based evidence store or network client is used by the prototype. The test runner uses its ordinary local execution environment; this is not a sandbox for unreviewed code.

## What it actually does
The module holds bounded synthetic navigation sessions in memory, binds them to demo actor/workspace/course/message values, checks an injected authorization test double before and after page loading, and returns an edit-existing-private-message plan with three button payloads. Only overview, lesson and help cursors are accepted. Expiry, disposal, errors, over-capacity admission and oversized pages can prevent the content plan from being returned.

The same synthetic message identifier is retained across successful navigation plans. There is no modal or slash-command implementation. The test-only course key is demo-ethical-hacking, not a production course registration. Actor/workspace/message identifiers require a demo- prefix and do not accept Discord snowflake-shaped IDs. This separation is an accident-reduction measure, not an authentication mechanism or proof that data is synthetic.

## Critical trust and privacy limitations
The input actorId and privateWorkspace marker are values supplied by the harness. No trusted Discord interaction, guild membership or actual message visibility is established. The injected authorize function is a test double, not a server-backed course-assignment or restricted-lab adapter. The loadPage callback must receive fabricated data only; the module does not inspect text to prove it contains no real evidence.

visibility:private-required and operation:edit-existing-private-message express delivery intent. The module does not send, create, edit or make a real message private. A future adapter must verify the actual authenticated actor, authorized course, message owner and private surface; a client-controlled Boolean is not privacy enforcement. No ephemeral-token lifetime or live Discord re-entry behavior was tested.

Revocation during the simulated load prevents that response plan. This is not a general race-free revocation guarantee for a distributed service. Callback timeouts, production clock rollback, rendering-order races, real SDK limits, malicious JavaScript object behavior and live message failures need separate design/tests. The prototype is read-only and has no evidence, feedback, submission, reviewer, revision, grade or durable-progress operation.

## Executed local tests
The exact module and test contents ran in a temporary local directory on Node v20.20.1. Twelve top-level tests passed, zero failed and zero were skipped. Some tests contain multiple assertions/cases; do not count those as additional top-level tests.

Coverage: successful synthetic button plan with no grants; cross-actor denial without invalidating the owner's session; changed workspace/course/message/privacy marker; unknown token/cursor; exact expiry boundary; authorization revocation during loading; neutral authorization/renderer failure; required constructor dependencies/bounds; stable message target across navigation; capacity recovery after expiry; disposal during load; and rejection of real-shaped identifiers/oversized pages.

These are locally executed prototype tests, not GitHub CI, a full application suite, student hardware validation or a live Discord acceptance test. A separate JSON execution artifact was generated locally, not silently committed as CI evidence. The existing root application and maintainer runner are unchanged and do not import or discover this module through a new integration.

## Next slice and gates
Before live integration, approve the architecture and trusted identity/privacy contracts, then implement and test the real message and authorization adapters separately. Evidence collection, reviewer authority, persisted revisions, idempotency, concurrency, retention/deletion and failure recovery remain future slices under their own reviewed contracts. No feature flag, manifest, learner record, Community Learning path, enrollment, lab permission, award or deployment is changed here.
