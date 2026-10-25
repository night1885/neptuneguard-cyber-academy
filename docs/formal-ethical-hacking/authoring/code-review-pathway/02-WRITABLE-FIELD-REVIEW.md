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
