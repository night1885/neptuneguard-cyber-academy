# W04 — hypothesis and source-trace worksheet

Draft learner activity after [W04 teaching](STANDALONE-WEB-W04-TEACHING.md). Source reading only; no execution or network permission. Use synthetic fixture names and values. Do not invent observations.

## Source identity and assumptions

Record repository commit/blob, file/function anchors, relevant fixture policy, trusted harness assumptions and missing setup. Mark every result as source prediction, actual separately authorized observation, or not run. Reading the visible repair makes this familiar guided practice, not an unfamiliar assessment.

## Causal trace

| Step | Input/trust source | Condition/source anchor | Predicted branch | Data/effect permitted | Actual result or not run |
|---|---|---|---|---|---|
| Harness | To complete | call_app | To complete | To complete | Not run |
| Early gates | To complete | DemoApplication.__call__ | To complete | To complete | Not run |
| Actor | To complete | ng.actor type gate | To complete | To complete | Not run |
| Row lookup | To complete | parameterized SELECT | To complete | To complete | Not run |
| Decision | To complete | can_read | To complete | To complete | Not run |
| Presentation | To complete | respond | To complete | To complete | Not run |

Complete the table for the owner and same-course nonowner. Identify the first point at which their policy-relevant facts differ and the comparison the starter fails to make.

## Competing hypotheses

For SQL-construction, ownership-decision and response-construction hypotheses, record supporting source facts, contradicting facts, missing evidence and the smallest scoped observation that could discriminate them. Proposing a test is not permission to run it.

## Branch variants

1. Missing row: does the policy run? Explain short-circuiting and why this does not test a nonowner denial.
2. Missing Actor with fictional HTTP_X_ROLE: locate the actual trusted-context source rather than assuming a header creates an instructor.
3. Nonowner HEAD: separate authorization/status/metadata from body suppression.
4. Unsupported method: identify where rejection occurs; do not infer a universal production gate order from this fixture.
5. Deny-all repair: identify legitimate cases it breaks and why suppressing one forbidden result is insufficient.
6. Matching absent/denied status and body: state the timing/side-channel conclusions that remain unsupported.

## Observation plan and handover

Choose four narrow observation points and state the expected synthetic value, why it matters, the permitted recording method and what must not be collected. If no reviewed debugger/tool route exists, keep this a paper plan; do not install or attach to another process.

Write a short causal finding: policy → subject/resource facts → missing comparison → returned data → narrow repair goal → legitimate/forbidden controls → untested assumptions. Record hints and access support separately. Use an approved private submission route only; otherwise retain fictional notes locally. No score, award, progression or permission follows.
