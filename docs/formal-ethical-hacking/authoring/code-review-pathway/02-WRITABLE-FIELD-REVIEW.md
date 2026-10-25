# 2. Trace an update from JSON to committed state

Supporting draft. Requires [request tracing](01-REQUEST-TO-RESPONSE.md), the existing
update lab and its EH-WEB-08 prerequisite. This adds no real endpoint or network scope.

## Separate three decisions

Open update_lab.py, update_repaired.py and test_updates.py. Predict ALICE updating a draft
with text, expected_revision:0 and owner:"student-b". Locate these decisions independently:

- Object/operation: student owner, permitted course, draft state before the update.
- Writable properties: starter text/owner/course/state versus repaired text-only factory.
- Revision: true integer expected version used in a conditional update.

Owning an object before editing it does not imply permission to transfer ownership. An
instructor permitted to read is not thereby permitted to PATCH under this toy policy.

## Source-to-state investigation

Trace request -> byte stream -> selected note -> operation check -> content type/length ->
JSON parse -> required keys -> writable-field set -> value/encoding/revision checks ->
conditional UPDATE -> transaction completion -> returned representation.

expected_revision is removed before forming the writable-field set. Column identifiers
come from the fixed SCHEMA_FIELDS and configured editable policy; values use placeholders.
A bound owner value can still make an unwanted policy-authorized ownership change. Do not
mislabel every accepted forbidden property as SQL injection. Conversely, a text-only field
policy does not authorize BOB to edit ALICE's object: object and property checks both matter.

Body bounds and UTF-8/string checks are educational input constraints, not a general API
parser or Unicode security guarantee. The allowed schema field set may itself be too broad
for the caller even when input is syntactically valid.

## Verify state preservation

The UPDATE predicate includes id, expected revision, owner, course and draft state. Success
increments revision. Follow test_stale_no_overwrite: a 409 alone is insufficient evidence;
inspect the accepted text and revision that remain stored. This is sequential testing,
not a simultaneous-writer or distributed-consistency test.

Follow test_commit_failure_no_success_or_change. Its wrapper rolls back then raises a
fictional OperationalError; the response is generic 503 and the row remains unchanged.
It does not establish power-loss recovery, a real disk fault or PostgreSQL behavior.

## Distinguish syntax, authority and state change

A field can be recognized by the schema yet forbidden for this operation. The constructor
checks that configured editable fields come from SCHEMA_FIELDS; that constrains identifier
selection but does not establish that the chosen set is appropriate for the actor. The
starter selects four recognized fields, while the reference selects text only. The handler
otherwise remains the same. A syntactically valid owner value can therefore be policy-wrong
without being a SQL-injection string.

Trace set(document) minus expected_revision, the subset check against self.editable, then
the assignment/value lists. The client-supplied revision participates in a comparison; it
is not assigned directly into the stored revision column. The server increments revision
when its conditional UPDATE affects one row. Bind placeholders protect values from becoming
SQL structure; the schema and configured policy govern which field names reach assignments.
These are distinct controls and neither replaces object/operation authorization.

| Question | Selected source condition | Independent limitation |
|---|---|---|
| May this actor edit this object? | Student owner, enrolled course, draft state | Identity is supplied by the fictional trusted harness |
| Which properties may change? | Required text/revision and editable-field subset | Recognized schema fields can still be too broadly allowed |
| Does this match the expected version? | Revision in the conditional WHERE clause | A sequential stale-request test is not a concurrent-writer test |
| Did the database transaction finish? | Context-manager completion | Does not establish disk/crash recovery or remote persistence |
| What did the caller receive? | Readback, serialization and response | Response delivery can fail after a state change |

## Pair acceptance boundaries with rejection evidence

A useful text-boundary pair is an allowed one-character or 256-character value and a rejected
257-character value under this teaching contract. A valid JSON body padded with whitespace
to exactly 1024 bytes tests byte-bound acceptance; it is different from a 256-character text
limit. Invalid UTF-8 fails decoding, missing text fails the required-key check, and an
out-of-contract revision fails its selected integer/range check. These tests do not harden
the code into an arbitrary hostile-input importer or establish universal API limits.

For a payload combining valid text with forbidden owner/course/state fields, compare the
entire stored row before and after rejection. Do not accept a 400 status alone as proof
that no partial write occurred. The reference's field check precedes its UPDATE in this
selected path. Keep a legitimate text update as a positive control; rejecting every payload
would not satisfy the intended application behavior.

The selected supplemental tests also observe that sending the current text again with the
current revision is an accepted update and still increments revision. Equality of old/new
text does not make this handler's operation revision-neutral or implement an idempotency
key. Two successful sequential updates using successive expected revisions are not evidence
of simultaneous transactions, distributed conflict resolution or safe automated retries.

## A generic failure response does not identify the commit outcome

Keep the existing rollback example narrow: its wrapper explicitly rolls back and raises
before reporting success, so that particular test observes unchanged stored text/revision.
It does not justify a rule that every 503 means no change. Locate the separate row read
that occurs after the transaction context has completed.

In an additional test-owned wrapper, the second handler SELECT is deliberately made to
raise an OperationalError after the UPDATE commits. The handler returns its generic 503,
but a separate permitted inspection of the synthetic in-memory row finds the accepted text
and incremented revision. The wrapper injects an error at a chosen point; it does not
simulate a real disk failure, network loss, production incident or concurrent workload.

This provides two distinguishable observations under the same selected error status:

- Simulated failure with explicit rollback: 503, unchanged test-owned row.
- Injected post-commit read failure: 503, changed test-owned row.

A report must therefore name the failure stage and actual inspected state instead of
inferring it from the status code. In a real design, retry/reconciliation and idempotency
requirements need their own specification and validation. This paper/source-review point
authorizes no new endpoint, client retry, production database check or external observation.
The unchanged toy reference is not being advertised as a production reliability design.

## Proposed independent handover checkpoint

This supporting draft extension adds no activated grading requirement. For one allowed
update, one forbidden-field rejection, one stale revision and the two injected failure
stages, record: actor/context assumption, expected current state, proposed changed fields,
source branch, response and actual stored state or not-run label. Separate predicted,
observed, simulated and missing evidence. Preserve the original flawed starter and correct
reference; mutations belong only in a disposable local copy.

Explain how a repair reduces writable authority while preserving permitted text edits,
why a recognized field name is not permission, and why a client-visible error does not
alone establish transaction outcome. Finish with limitations for real authentication,
transport, durable storage, concurrency, supported learner setup and assessment calibration.
Nothing in these checks completes an advanced-web or professional assessment pathway.

## Review challenge and deliverable

Explain why each claim is unsupported, citing code/tests and a narrower correct statement:

1. Every recognized schema column is editable by an owner.
2. SQL placeholders prevent unauthorized property changes.
3. Instructor readability implies edit permission.
4. A 409 alone proves no overwrite.
5. Simulated rollback proves crash recovery.

Build a repair/retest matrix covering allowed text, forbidden owner/course/state, another
owner, stale revision and dependency failure. If separately permitted, use only the existing
lab's named commands: test_updates and test_update_reference test_update_cli. Historical
contracts are 27 methods/three named starter failures and 29 methods/no reference-group
failures. Capture your own result or BLOCKED; preserve original source and unchanged tests.

The three field tests use fresh applications; do not reinterpret them as an authorized
multi-step chain or permission to edit actual accounts. Proceed to the
[independent investigation](03-INDEPENDENT-INVESTIGATION.md).
