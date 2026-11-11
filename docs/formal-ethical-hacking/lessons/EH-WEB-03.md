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

## Expanded teaching: turn an access question into a justified decision

This supplement adds paper reasoning, not testing permission. Use the original fictional policy and existing authorization evidence pack only. No real identity, submission, token, course record or request belongs in these exercises. The example policy is not a statement of academy implementation.

### Separate a verified identity from an allowed operation

Authentication and authorization answer different questions. A verified identity provides context for a decision; it does not grant every operation associated with a successful login. Some resources are intentionally public, so authorization reasoning also includes what an unauthenticated visitor may do under the stated policy.

Start by writing a complete decision sentence: this subject may or may not perform this action on this resource in this context. If the sentence says only “students are allowed,” it is missing the action and resource boundary. If it says only “the user logged in,” it has not yet answered the permission question.

The original fictional policy permits an enrolled student to read and update their own draft. All relevant conditions matter. Being the owner does not waive the draft-state restriction. Being a student does not establish enrollment or ownership. Being an instructor does not establish assignment to the particular course.

### Build a permission matrix from explicit rules

Use columns for subject, action, resource, trusted ownership/course context, lifecycle state, relevant rule, policy decision and missing facts. Keep a separate observation column when interpreting the fictional evidence pack. A policy decision and a response observation are different records.

For a clear paper case, the matrix explains which rule controls the result. For an incomplete case, identify the missing authoritative fact without guessing it from the requester's preferred answer. Deny by default means a protected operation is not permitted merely because the available information failed to demonstrate a prohibition.

There are two distinct conclusions: “the provided facts do not establish permission” and “a real system disclosed protected data.” The former can follow from missing context; the latter requires actual applicable policy and disclosure evidence. Do not inflate uncertainty into a confirmed vulnerability claim.

### Worked policy transition — FICTIONAL

Suppose the paper facts expressly establish enrollment, ownership and a draft submission in the student's course. Updating that draft agrees with the stated policy. Now change only the expressly supplied lifecycle state to submitted. Updating is no longer permitted under the simplified rule, even though the person and resource owner are unchanged.

This comparison shows why authorization is not a one-time label assigned at login. The relevant action and resource state can change between decisions. It does not authorize making either update against the academy or changing any progression or grading rule.

For the instructor case, the assignment must cover the resource's course. A generic instructor role is insufficient when the exercise's rule is course-specific. Ask which course the trusted assignment covers rather than borrowing authority from a different instructor scenario.

### Identify where the decision's inputs come from

A requester can type a role, owner identifier or course label into untrusted input. Such a claim is not automatically the server's authoritative context. A diagram should distinguish the claimed value from the validated identity, trusted resource ownership and current policy used to decide.

Do not confuse this principle with a prescription to accept a different client field. A longer identifier, hidden form value or convincing label does not repair missing validation. The lesson asks where trust comes from, not how to construct a request that impersonates another subject.

Likewise, an unguessable identifier can reduce casual discovery but does not establish permission for a particular resource. A resource needs the applicable permission check even when its identifier is difficult to predict. No guessing or enumeration exercise follows from that design observation.

### Read policy, status and content independently

The existing evidence pack makes this distinction explicit. Its B/C cases provide the same prohibited fictional classmate content under different HTTP statuses. The policy and disclosed content determine the paper concern; the 403 label does not remove content already present in the supplied body.

Its denial-text-only example makes the converse point: a 200 does not independently establish that protected submission data was returned. Read the record's actual content and limitations. Do not invent a hidden data field, unrecorded database write or additional response to strengthen the story.

A response body is also not the complete record of every possible side effect. If no write evidence is supplied, a paper reviewer cannot certify that no write happened. State the narrow conclusion about the supplied body rather than universal enforcement or universal failure.

### Hidden controls are presentation, not the permission boundary

Hiding a button may help a user understand available actions, but a missing button does not establish server-side enforcement. Conversely, a visible button alone does not demonstrate that its underlying operation succeeds without permission.

The design question is whether the protected operation checks the actual subject, action, resource and context before allowing the effect or releasing protected content. The evidence question is what the supplied record demonstrates about that decision. Keep both questions separate from navigation design, which this supplement does not change.

### Write a bounded finding or uncertainty statement

For fictional analysis, identify the applicable rule, supplied context, supplied result, supported consequence and unknowns. Label the record fictional. If necessary context is absent, state what authoritative fact is needed instead of turning a generic error into a finding.

For any future authorized review, the actual scope and private evidence process control what may be retained. This lesson authorizes no additional retrieval to estimate scale. Real learner submissions, session values and instructor answers must not be collected merely to make a report persuasive.

### Formative questions with explained answers

1. Does a successful login decide whether a student's submitted record is editable? No. The resource's lifecycle restriction is a separate policy condition.
2. Why is ownership alone insufficient for the draft-update rule? The supplied policy also requires the applicable enrollment and draft context.
3. Can an unknown owner be treated as the requester? No. Missing authoritative context is not a permission grant.
4. Does a supplied 403 cure protected content in its body? No. The forbidden disclosure remains in that fictional record regardless of the status label.
5. Does a visible instructor control prove unauthorized grading? No. Presentation does not establish the underlying operation's result.
6. Can a completed matrix establish real enforcement? No. It demonstrates reasoning about supplied facts, not execution against an implementation.

Technical basis: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html . Existing offline support remains unchanged; no policy engine, live access decision or assessor calibration was executed by this supplement.
