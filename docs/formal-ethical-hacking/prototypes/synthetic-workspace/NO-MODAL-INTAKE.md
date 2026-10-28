# Detached no-modal intake coordination — rehearsal only

Baseline b8a12dc24f3e15eb48fdde764655c20b7175ec3d. Related to Issue #30;
does not close it. This is coordinator/interaction-boundary source, not a live
intake service, Discord transport, production schema or operational approval.
Existing fws: reading routes, trusted read-only readers and retention fixtures
remain unchanged. nmi: is a separate detached button prefix; no listener, entry
button, client, pool, migration or startup flag is attached.

## Proposal status and enablement
Defaults off before touching providers. Enabled tests require detached-rehearsal
mode, distinct configured rehearsal/production guild IDs and explicit providers.
A supplied boundary is a guardrail, not proof of environment separation. The
24-hour creation-based draft rule and owner-only authority are explicitly marked
proposed-for-rehearsal, NOT approved or activated operational policy. The confirmed
submitted-report rule remains 24 elapsed hours after successful submission.
No production policy file is changed. No tokens or user-supplied credentials are used.

## Combined behavior
- Resolve learner/record/course/exercise binding through a trusted provider, not
  button payload owner IDs. Recheck binding and current authority around operations.
- Journal creating before calling the restrictive channel-creation provider; verify,
  admit only the learner, reverify and record availability before returning the ID.
  Repeated requests reuse an available verified record channel. Unknown/failed
  creation remains reconciliation-required; no blind create retry or guild sweep.
- Exact-source preview checks actor, guild/channel, message type/capability, bounds,
  original creation time and draft age. It snapshots up to 2000 Unicode code points /
  8192 UTF-8 bytes in a bounded private process cache for confirmation, not the DB.
- Confirmation re-fetches the exact source and compares content digest and original
  creation metadata. A changed/missing source requires refresh. Receipts are checked
  before refetch so a retry after source editing can still return the original ACK.
  Receipt identity includes the selected source, not merely an identical text digest.
- The storage provider must atomically enforce revision, immutable snapshot/source
  uniqueness, original timestamp/deadline, audit and idempotency receipt. ACK validation
  checks binding, source provenance, shape and expiry; it cannot authenticate a
  supplied provider or enforce those database invariants itself.
- Owner-only review additionally requires record authority, denies self-review and
  rejects expired report envelopes. Only allowlisted report fields reach a separately
  tracked reviewer-presentation provider; arbitrary instructor fields are excluded.
  Feedback mutation is blocked if that provider cannot attest tracking/deadline.
- Draft cleanup requires owner authority and an atomic storage claim excluding any
  submitted or concurrently submitting source. Creation time, not edit time, determines
  the proposed draft deadline. Submitted reports require the report cleanup path.
  Unknown deletion outcomes remain reconciliation-required, never claimed erased.

## Provider contracts — NOT implementations or proof
resolve/authorize must establish real identity, current account/course/exercise and
record authority from trusted backend state. The coordinator accepts an already
trusted SDK context; it is not a public authentication endpoint. Constructor strings
and matching object shapes cannot authenticate themselves.

journalRead/journalWrite need durable record-bound provisioning state and uniqueness
across processes. createRestricted must include restrictive initial overwrites;
verifyPrivate must inspect real effective access and drift, not trust a boolean tag.
admitLearner must not add reviewers/instructor roles. Administrators bypass ordinary
channel overwrites; privacy notice and operational roster remain approval gates.

latest/exact must provide fresh scoped, learner-authored message data with an explicit
content-capability result. Do not compensate for unavailable content with bulk guild
searches, public fallback, downloads or arbitrary URL fetching. Posting drafts already
puts content on Discord before the Submit action. Rejection is not source-post erasure.

receipt/submit/readReport/review need a separately reviewed database writer adapter.
Do not reuse the existing read-only pool or fabricate enrollment/course grants.
The previous SQL fixture has no complete coordinator/source-provenance/draft-claim
adapter. It must not be claimed to satisfy these provider contracts as-is.
The persistent source uniqueness key must include guild, channel and message ID;
reusing an old source under a new request must not reset its retention window.
readReport must filter current authorization/expiry before projecting protected body.

claimDraft must serialize with submission across processes; a local queue is not a
substitute. finishDraft must durably distinguish confirmed/unknown results with an
approved recovery/metadata retention policy. There is no purge scheduler or source
sweep. No channel deletion is implemented while shared-record policy is unresolved.

publishTrackedReview must manage a separately authorized private presentation and
its copy lifecycle, idempotency and expiry. A scripted tracked:true is not proof of
Discord erasure. Interaction tokens last 15 minutes; do not depend on an old ephemeral
response token to delete a report body 24 hours later. [web:2] The supplied learner
boundary deliberately emits metadata-only controls/source links, not copied report
text. It does not implement reviewer content/feedback UI or end-to-end accessibility.

## Lifecycle and limits
Operations are serialized within one coordinator instance, with at most 20 queued
operations and 20 unsettled provider promises. Each provider wait is bounded at
250 ms by default (5-1000 ms explicit range); timeout does not cancel remote work.
A late channel/create/submit/delete may still have happened. Initial journal/receipt
and claim providers must support reconciliation; this package does not recover lost
remote IDs or revoke a permission that failed to change.

Preview caches/control bindings have five-minute technical session bounds and fixed
capacity. Timers remove previews without relying only on another request; dispose
clears them and prevents late success. This is not secure memory erasure, durable
re-entry, approved personal-data retention or cancellation of issued requests.
The coordinator clock-regression guard is instance-local. It does not prove clock
correctness, cross-restart safety, real-time expiry during provider work or atomic
revocation/expiry versus Discord delivery. Final authorization/deadline checks narrow
but do not eliminate the external delivery race. App-level denial does not revoke
existing channel visibility or recall copied content.

## Actual preparation validation
Three JavaScript files syntax-checked on Node 20.20.1; 31 selected tests passed,
zero failures/cancellations/skips. Tests used fictional IDs/content and SCRIPTED
provider doubles: no live Discord, real SDK transport/serialization, PostgreSQL,
atomic production claims, renderer cleanup or private-permission proof was executed.
This is not full-checkout or CI validation. No production connection was created.
Proposed CI changes only add the isolated branch and append the test filename to the
existing consolidated Node 20/22 synthetic command; existing jobs/tests are retained.

Real adapters, approved policy/roster/notice, backups/log/cache rules, privacy/security
and accessibility review, staged reproduction and separate live approval still block
collection and destructive activation. Do not interpret these tests as live readiness.
