# Course authorization and runtime routing integration

These libraries implement two production integration prerequisites. They do not complete or activate the learner-review workflow. No index/startup wiring, migration, grant or real listener registration is performed by importing them.

## Target-learner authorization

The generic certification service checks enrollment only and returns no course key. This adapter instead loads the actual certification course lifecycle with the sole ethical-hacking-reading key. It queries scope.learnerId even when scope.actorId is the reviewer, then requires the current returned student ID and course to match the work binding. Enrollment-only results, revoked/completed assignments, wrong identities and changed student IDs fail closed. No positive grants are cached. Exercise and reviewer authority remain separate core providers; reading access is not practical authorization.

Initialization verifies the expected reader database/login, direct restricted identity, bounded server statement timeout, reviewed search path, SELECT privileges and absence of direct table/column write privileges. This is not a full independent privilege audit. The caller must supply a reviewed, connection-bounded pool. The lifecycle receives only a SELECT facade: its exact current authorization query is checked and executed against explicitly public-qualified tables, preventing temporary-table name shadowing. Unexpected query changes fail closed and require review.

The default implementation uses the existing acknowledgment/agreement/course validator rather than reimplementing its eligibility policy. createLifecycle is a trusted server test seam, never client configuration. Eight outstanding reads are permitted. Timeout returns no grant but does not free an unsettled provider slot. Dispose closes admission; drain waits for actual settlement without closing the borrowed reader pool.

## Button/modal routing and ownership

The runtime bridge is separate from the existing isolated read-only formal runtime. It dispatches only frv: learner and frr: reviewer buttons/modals for the explicit application and guild. It does not loosen the old reviewOnly guards or consume cert:, fws:, fnv: or academy: routes.

Construction registers nothing. Initialization must affirm resource readiness, and attach is explicit. Both learner and reviewer handlers are required; a missing reviewer implementation cannot accidentally create a learner-only production bridge. Eight unsettled calls and in-flight interaction-ID deduplication bound admission. Readiness exceptions close admission. Each handler remains responsible for private origin, identity, authorization and output checks. The bridge alone does not establish those policies.

The bridge owns the supplied handlers. Detach removes only its listener, closes admission, invokes resource/handler stop callbacks, waits for work and handler drains, then calls the resource-owner closure callback. Failed listener removal or disposal/drain prevents resource closure. Drain has no guaranteed finite completion for a provider that never settles; it is not rollback. No bot login, dashboard publication, source collection or pool creation occurs here.

## Evidence and unfinished work

Local Node execution: 43 passing tests, zero failures, one skipped test requiring the installed project SDK. Local reader metadata and routes are scripted; the lifecycle factory is injected in those tests. The SDK-dependent case exercises the actual production course lifecycle and acknowledgment validator against scripted query rows, not a real enrollment database. The PostgreSQL 16/18 workflow now includes this test file and requires zero skips for committed-head acceptance.

These are not live SDK/gateway evidence or independent security review. Real enrollment-reader privilege testing, reviewer UI, work/channel provisioning and discovery, durable consent/recovery, database and Discord erasure, related-record deletion integration, approved notices and final startup wiring remain incomplete. In particular, the existing shared-retention dependency inventory still does not account for review data. No production collection or deployment is authorized by these tests or bridge readiness.
