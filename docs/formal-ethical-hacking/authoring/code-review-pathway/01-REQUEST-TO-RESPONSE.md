# 1. Trace a request to disclosed data

Supporting draft. Begin with [prerequisites and boundaries](README.md).
Goal: distinguish choosing an object from authorizing access to it.

## Predict before consulting the repair

Open application_lab.py and test_application.py in fixtures/application-ownership.
Predict ALICE's GET /notes/note-b: list subject, role, course membership, selected note's
owner/course/state and expected response. Mark the prediction before any permitted run.

Trace call_app into DemoApplication.__call__. The harness supplies ng.actor as an assumed
trusted Actor instance. HTTP_X_USER/HTTP_X_ROLE do not create that context. Actor annotations
and frozen fields are not authentication; no login, session validation or trusted-proxy
configuration is established by this fixture.

## Follow the actual branches

Create a trace with input, condition, selected branch, source anchor and consequence:

1. GET/HEAD method gate; unsupported methods produce 405 with Allow.
2. Query rejection; unsupported nonempty query produces 400.
3. Path prefix, bounded key and slash checks.
4. Actor type check; missing synthetic context produces 403.
5. Parameterized SELECT using the key; dependency failure produces a generic 503.
6. Missing record or policy denial; selected status/body are 404 and Not found.
7. Allowed branch; JSON exposes only the selected note id and text.

Parameterizing the lookup constrains SQL value interpretation; it does not establish the
caller's ownership. Locate can_read: the starter checks state/course, permits the fixture
instructor role, then permits student drafts without comparing subject_id with owner.
Explain why ALICE and BOB sharing course-a makes that omission observable.

Compare application_repaired.can_read only after writing the hypothesis. Its student branch
adds actor.subject_id == note["owner"]. Describe both the forbidden case it blocks and the
legitimate owner/instructor behavior it preserves under this fictional policy. Instructor
course visibility here is not approved production reviewer authority.

## Follow bytes and metadata, not just a verdict

respond serializes JSON and computes Content-Length before suppressing the body for HEAD.
HEAD still follows the policy path. Compare test_head_metadata and test_head_nonowner.
Then compare test_nonowner, test_nonowner_body and test_unknown_same_denial: status, absence
of fictional protected text, and selected absent/denied presentation are distinct assertions.
These checks do not establish timing indistinguishability or complete protocol conformance.

## Guided outputs

For owner, same-course nonowner, student submitted-note read, other-course instructor,
missing Actor with forged headers, and nonowner HEAD, record:

Case | Source facts | Predicted branch/response | Actual result or not run | Legitimate control
--- | --- | --- | --- | ---
To complete | To complete | To complete | Not run | To complete

If separately approved, use the original lab's named commands in its disposable context:
python3 -B -m unittest -v test_application; then test_reference test_cli. Historical contracts
are 20 methods/four intended starter failures and 22 methods/no reference-group failures.
Do not overwrite the repository starter or treat an import error as intended reproduction.

Write a causal finding from actor/resource facts through missing comparison to returned data,
with repair, legitimate control, retest status and one explicit limitation. Continue to
[writable-field review](02-WRITABLE-FIELD-REVIEW.md).
