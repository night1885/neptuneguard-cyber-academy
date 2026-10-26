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

## Build a causal trace, not a list of tool names

For the same-course nonowner example, distinguish these values and decisions:

| Step | Input or operation | Evidence boundary |
|---|---|---|
| Harness context | ALICE supplied as ng.actor | A trusted fictional assumption, not a real authenticated session |
| Route selection | /notes/note-b becomes key note-b | Choosing an object does not authorize reading it |
| Database lookup | Key bound as the SELECT parameter | Treating input as a SQL value does not implement ownership |
| Loaded row | student-b, course-a, draft | Facts to compare with the actor and policy, not a disclosure grant |
| Starter student branch | Student role and draft state | Missing owner equality admits the selected nonowner |
| Repaired student branch | subject_id equals owner as well as existing conditions | Blocks this route while preserving legitimate policy cases |
| Response | Selected status, headers and encoded body | Inspect returned data and metadata, not only a Boolean or status |

Trace the exact branch in source before reading an expected answer. In the first denial
condition, `or` permits early rejection; later, `note is None or not self.policy(...)`
short-circuits the policy call for a missing row. The classmate disclosure requires an
existing row and an allowed starter policy decision. Do not claim the problem is an
unrestricted SQL query simply because lookup returns a row: the query is parameterized
and selects one key, while the missing comparison is an authorization defect.

The reference changes the injected policy, not routing, SQL binding or body serialization.
The factory chooses that function through reviewed source, not a request field. A narrowly
scoped finding should identify the missing subject/resource relationship and the returned
fictional note, then explain which control remains assumed. No conclusion about real
session forgery, a live endpoint or all application records follows from this fixture.

## Explain a repair with legitimate controls

Rejecting every request can suppress the forbidden disclosure and still fail the intended
application contract. Compare four questions: does the owner retain access; does the assigned
instructor retain access under the fictional course/state rule; is the nonowner denied; and
is the denied response free of note data? Preserve other-course and lifecycle restrictions
instead of weakening them to make one positive test pass.

The selected author rerun reproduced four starter assertion failures and separately tested
a disposable deny-all policy against the reused reference requirements. That counterexample
also produced four failures, this time from broken legitimate behavior. Equal failure counts
do not mean equal defects, adequate coverage or four separate vulnerabilities. Identify the
actual failing assertions and source cause, restore the correct policy and rerun. No mutant
or deny-all change belongs in the published correct reference.

## Test response construction and call order explicitly

A HEAD result has no body bytes in this fixture but still has a policy decision and headers.
Compare allowed and denied HEAD with their corresponding GET representations; an empty body
alone would conceal an incorrect allowed status. Content-Length here is derived from the
encoded JSON representation. The Unicode supplement checks the decoded fictional text and
actual serialized byte length; default json.dumps escaping means it does not prove that raw
non-ASCII characters travelled unescaped on a network.

Route/method/query rejection can occur before the actor gate in this handler. The supplement
records that call order; it does not promote this arrangement into a universal production
security policy. Likewise matching absent/denied status and body does not establish equal
timing, identical infrastructure behavior or complete resource non-enumeration.

The harness permits only HTTP_-prefixed entries in its optional header map. A proposed
ng.actor override through that map is rejected by the harness before an application request.
This is one test-harness input distinction, not an authenticated proxy deployment. Actor's
annotations and isinstance check do not validate every field value; reviewed callers must
still respect the stated contract. Do not expand the input surface or use real principals
to fill those gaps.

The additional source-path checks use actual in-memory calls, not mocked network success.
Some policy-call assertions use a test double to establish whether the policy was reached;
that result does not replace the real repaired-policy tests. Read-only request checks compare
stored rows before and after the selected read. They are not transaction, concurrency or
persistence validation. Selected missing-table handling remains only a generic dependency
response check, not a full logging or privacy audit.

## Proposed independent review checkpoint

This draft addition is not an activated grading gate or new practical scope. Before adding
a case, record the rule, the closest permitted control, the value that changes, the expected
branch, the data that must be absent, and one untested assumption. Keep the original tests
and correct reference unchanged. Use only invented actors/records and the existing approved
in-process setup; no listener or client request is needed.

For a handover, separate source prediction, actual in-process observation, local repair,
positive/negative retest and remaining real-world assumptions. State that identity trust,
server integration, database persistence/concurrency and a supported learner toolchain have
not been established by these selected checks. Source-based reasoning and a green reference
suite do not complete the advanced-web pathway or validate a production academy policy.

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
