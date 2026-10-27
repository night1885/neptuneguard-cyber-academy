# Offline first-practical review rehearsal

Baseline inspected: 40f977b24224415100f9e55a08c24429a41c7d30.
Synthetic-only test checkpoint, not a learner workflow or course activation.

## Reuse and local evidence
The test reuses workspace.mjs and review.mjs unchanged. Their locally reconstructed bytes
were checked against Git blobs 168931ed437e5d3855165fb4e8c98ddae5159353 and
c685401e32f9a365c65aa072fcc92d22bee3cb93 before execution. Eight local tests passed.
This batch adds a first-practical-specific fixture, not a new review engine.

The fictional happy path records prototype results: working revision 0, submitted revision 1,
changes-requested revision 2, submitted revision 3, review-recorded revision 4. The simulated
learner view refreshes on the same bound message. It grants no grade, progression, durable
progress, lab permission or award. review-recorded is not competency acceptance.

Other cases cover cross-learner denial, duplicate submission, stale review, reviewer revocation
between authorization checks, non-demo evidence input, forged client claims, demo/formal
namespace separation, expiry and absence of durable recovery after disposal.

## Strict fictional boundary
Only hardcoded demo-evidence-* and demo-feedback-* labels are used. They do not point to
files, URLs, screenshots, actual HTTP observations or a real report. The computed trace is
explicitly fictional; it contains no fabricated lab transcript or contemporaneous timestamp.
No learner answers or instructor marking guidance are included.

These existing engines say never to import them into the academy runtime. The test uses only
demo-* identities and demo-ethical-hacking. The real formal course key is explicitly rejected;
this does not bridge the formal reading packet into the synthetic review store.
privateWorkspace=true and edit-existing-private-message are prototype declarations, not
proof of live Discord privacy. The authorizer uses fictional assignments, not the real
identity, course-assignment or reviewer backend. In-memory serialization is not durable
transaction, audit recovery or an approved privacy/retention policy. No real data is collected.

## Reproduction and CI
In this directory run: node --test first-journey-rehearsal.test.mjs
The existing consolidated workspace workflow includes this test on Node 20/22 alongside
all prior synthetic tests. No existing test, permission, trigger or runtime command is removed.
Local results do not substitute for the new exact-head CI results.

## Remaining implementation gates
Evidence formats and limits, storage/persistence, record-scoped reviewer authority, revocation,
retention/deletion, revisions/idempotency/conflicts and audit recovery need an approved real
workflow contract before any runtime handler, migration or learner collection. The complete
practical also retains its authorization, supported setup, support/incident and accessibility
gates. Nothing here approves formal grading, progression, practical permission or release.
