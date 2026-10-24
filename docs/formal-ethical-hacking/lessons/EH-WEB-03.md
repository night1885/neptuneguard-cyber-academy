# EH-WEB-03 — Authentication is not authorization

Draft; paper-based, not published. Requires EH-WEB-02. No authentication fixture, credential guessing, object enumeration or live account testing is introduced.

## Outcomes
Separate identity verification from permission decisions. Model a subject, action, resource and context. Explain why a hidden interface control is not an access-control boundary.

## Distinguish the decisions
Authentication establishes or verifies an identity claim. Authorization decides whether a subject may perform a particular action on a particular resource in the current context. A logged-in student is not automatically entitled to another student's submission, instructor grading controls or every course. Authentication can succeed while authorization correctly denies an operation.

Authorization requires trusted server-side enforcement. Removing a button, hiding a navigation item or disabling a form does not by itself protect the underlying operation. OWASP recommends denying by default and validating permissions on every request. Do not trust client-supplied role or ownership claims without validation.

A role can contribute permissions, but resource ownership and contextual rules can also matter. Checking only that a user has a generic student role may miss which submission belongs to that user. A guessed or unguessable object identifier does not replace the permission check. These are design principles, not instructions to enumerate actual course data.

## Fictional policy for this exercise
- An enrolled student may read and update their own draft submission.
- A student may not read another student's submission or assign grades.
- An assigned instructor may review submissions for their assigned course.
- An instructor may not assume access to unrelated courses.
- A submitted record is not editable by its student under this simplified exercise policy.
- An unauthenticated user may read public course descriptions only.

This is a fictional policy, not the academy's implemented policy or a live permission grant.

## Apply the model
For each proposed action identify the subject, action, resource, ownership/course context, lifecycle state and required decision. Separate a clear denial from missing information that must be resolved. Under a deny-by-default policy, an unknown permission is not an implied allow.

Paper cases:
1. An enrolled student edits their own draft in their course.
2. The same student reads a classmate's submission.
3. An assigned instructor reviews a submission in another course.
4. A student edits their own already submitted record.
5. A visitor reads a public course description.
6. A requester claims an instructor role in an untrusted request field.

For each case, cite the relevant fictional rule and list any missing facts. Do not send requests or access records to answer these cases.

## Offline evidence-reading support
Use the [fictional authorization evidence pack](AUTHORIZATION-EVIDENCE-CASEPACK.md), its [blank worksheet](AUTHORIZATION-EVIDENCE-WORKSHEET.md) and linked JSON fixture. The exercise separates the policy decision, supplied HTTP status and actual content in the invented response. It includes an allowed owner read; two forbidden-content disclosures carrying different status codes; a 200 with denial text only; an untrusted role claim; and missing ownership context. Its optional reader processes local JSON without requests or imports of the vulnerable teaching policy. This support adds no live test, identifier guessing, new prerequisite, required deliverable or runtime/publication change.

## Reason about vulnerability claims
A broken-access-control finding needs evidence that an actual permission boundary was crossed under the applicable policy. An exposed button, error message, 200 status or sequential identifier alone does not prove unauthorized data access. Conversely, a denial page does not establish that every backend operation is protected. Future practical work requires a reviewed fixture, explicit test identities and scoped operations before execution. Never turn a fictional case into a claim about a real user or system.

## Submission
Provide a permission matrix and concise explanations. Do not include real user IDs, tokens, submissions or instructor answers. Numeric scoring and formal pass thresholds remain pending; a completed matrix grants no course access or award. The supporting pack has only local synthetic-data consistency/reader checks; its cases are not actual request evidence.

Source: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html .
