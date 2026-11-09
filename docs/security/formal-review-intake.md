# Disabled preview and confirmation coordinator

The core now has a read-only preview operation. It uses the same source checks as submission, repeats learner/course/exercise/readiness authorization, and rejects a preview that expires during reauthorization. Preview does not create a report, increment the work revision or persist an operation receipt. The storage transaction provider may still acquire a work-row lock.

The new intake coordinator is default-off and has no startup import, Discord listener, environment lookup, renderer or publication path. Its context must come from a trusted Discord interaction adapter, never client-supplied actor/guild/channel identifiers. Preview requires an explicit consent boolean; a real notice, consent interaction and durable consent policy are not implemented by that boolean.

## Confirmation binding and limits

A server-generated preview UUID is bound to the actor, guild, private work-channel ID, selected message, exact digest and work revision. A separate operation UUID is generated server-side and reused for authorized retries. Confirmation accepts only the preview ID and invokes the core's normal submission, which re-fetches the selected source and checks the digest and revision again. Client-supplied body, digest, operation ID or revision fields are rejected by the coordinator.

The session map retains identifiers, digest and submission parameters, not report text. Preview text is returned to the future private-response adapter and must not be logged, sent publicly or cached there. There are at most 100 session records and four unsettled controller operations. Unsettled provider work continues occupying admission; this module cannot cancel an arbitrary core callback.

Preview lifetime defaults to five minutes, can only be shortened to 20-300000 ms, and is clamped to the existing source/work deadline. Retries never refresh it. Idle timers remove session metadata, and disposal clears metadata and timers. No report deadline is shortened or extended by these session timers. They do not delete a Discord message or database record.

Cancel only removes an unattempted preview. It is denied after any confirmation attempt because a failed response does not prove that no database commit occurred. There is no withdrawal, grading or certificate operation.

## Uncertainty and lifecycle

Disposal suppresses new work and later output; it cannot roll back a core operation that has already committed. The coordinator borrows the core rather than disposing it. A runtime owner must first close shared readiness and dispose owned source/core components, then dispose and drain the coordinator. Drain waits for actual settlement and can wait indefinitely on a provider that never settles.

While a preview survives, a post-commit denial can be retried under the same server-generated operation key, subject to fresh authorization. Preview expiry or process restart loses this mapping. Durable recovery UI remains unimplemented; do not represent a neutral failure as proof of rollback or cancellation.

## Validation and release boundary

Thirty-four local Node tests passed with no failures or skips using the actual modified core and a scripted, serialized, rollback-capable in-memory transaction provider. These are not PostgreSQL, live Discord, SDK rendering, full-checkout regression CI or independent-review evidence for this batch. Existing core, source-reader and PostgreSQL suites must validate the committed head separately.

Private consent/preview/confirmation controls, reviewer UI, discovery, work/channel provisioning, durable recovery, real readiness composition, retention erasure and related-record deletion integration remain unfinished. No runtime wiring, migration, privilege grant, deployment, publication or evidence collection is included. The workflow is not ready for activation.
