# EH-WEB-03 — Authentication is not authorization

Draft; paper-based, not published. Requires EH-WEB-02. No authentication fixture, credential guessing, object enumeration or live account testing is introduced. Community Learning is unchanged. The policy below is fictional, not an implemented academy policy or operational permission.

## Outcomes
Separate identity verification from permission decisions. Model a subject, action, resource and context. Explain why a hidden interface control is not an access-control boundary.

## Your task and finish line
Apply the existing fictional policy to the same six paper cases, then submit the existing permission matrix and concise explanations. Identify the facts that support a decision, cite the relevant fictional rule and state missing information. Finish by separating the policy decision from any supplied evidence of implementation behaviour.

No request, browser manipulation, account inspection, identifier guessing, token processing or code execution is required. The earlier HTTP practical and cookie example supply no permission to test access to real submissions or instructor operations. A completed paper matrix is not an executed security assessment.

## 1. Distinguish identity from permission
Authentication establishes or verifies an identity claim. Authorization decides whether a subject may perform a particular action on a particular resource in the current context. A logged-in student is not automatically entitled to another student's submission, instructor grading controls or every course. Authentication can succeed while authorization correctly denies an operation.

A cookie's presence, a successful login page, a displayed role or a status code is not a complete authorization decision. Conversely, some explicitly public resources can be available without authentication. The relevant policy and resource/action context determine the decision; neither logged in nor logged out is a universal answer.

| Question | Required distinction | Unsupported shortcut |
|---|---|---|
| Who is making the request? | Authenticated or otherwise established subject context versus an untrusted claim | Treating a supplied role field as verified identity |
| What operation is proposed? | The particular action, not merely the visible page | Assuming read, edit, review and grade have the same permission |
| What object is involved? | The specific resource and its authoritative attributes | Treating access to one submission as access to all submissions |
| In what context? | Ownership, course relationship and lifecycle state under the stated policy | Assuming a generic role overrides every contextual restriction |

This builds on EH-WEB-02: session validation and the permission decision are separate. This lesson does not implement either system or assess real session validity.

## 2. Model the full decision and its trust boundary
Use subject -> action -> resource -> context as a reasoning model, not an executable access-control function.

- Subject: the requester whose relevant identity and attributes must come from trusted context. A role claimed in an untrusted request field is not that context.
- Action: the proposed operation, such as reading, updating, reviewing or assigning a grade. A hidden button does not eliminate the underlying operation.
- Resource: the particular submission or public description being considered. An identifier locates or references an object; it does not itself confer rights.
- Context: the relationships and conditions required by the applicable policy, including ownership, enrolled/assigned course and draft/submitted state in this exercise.

A role can contribute permissions, but resource ownership and contextual rules can also matter. Checking only that a user has a generic student role may miss which submission belongs to that user. A guessed or unguessable object identifier does not replace the permission check. These are design principles, not instructions to enumerate actual course data.

Mark a fact as supplied, trusted under the fictional exercise assumption, untrusted, or missing as appropriate. Do not invent a verified role, owner relationship, course assignment or draft state simply because it would make the answer easier. A claimed attribute and an authoritative attribute are different evidence.

## 3. Keep policy and enforcement separate
Authorization requires trusted server-side enforcement. Removing a button, hiding a navigation item or disabling a form does not by itself protect the underlying operation. OWASP recommends denying by default and validating permissions on every request. Do not trust client-supplied role or ownership claims without validation.

Deny by default means an unestablished permission is not an implied allow. It does not mean every legitimate operation should be denied forever: an allowed decision needs explicit applicable policy and sufficient trusted context. Missing information must be resolved through the authorized design/review process, not filled in with an assumption.

Checks must cover the relevant action and object, not just the existence of a logged-in session or the fact that a page was opened earlier. A previous successful read does not authorize a later edit, different resource or different course. This is reasoning about enforcement requirements, not a claim that any current academy endpoint implements them.

| Supplied observation or artefact | What it can help describe | What it cannot establish alone |
|---|---|---|
| Fictional policy text | Intended permission boundaries for this exercise | That code or an endpoint enforces them |
| A visible/hidden interface control | What the interface exposes or presents | Protection of the underlying operation |
| A role or owner claim in client-controlled data | What the requester asserted | Authoritative identity, role or ownership |
| A supplied HTTP status | The reported response status in that observation | Whether protected data or a forbidden effect was returned/performed |
| Supplied response content or state-change evidence | What data/effect is expressly shown in the supplied record | The applicable permission without identity/resource/policy context |
| Optional offline reader output | Selected facts parsed from the provided fictional records | Real authentication, endpoint enforcement or live access testing |

No browser, proxy, request replay, developer-console change or repository policy import is needed to answer the paper cases. Tool availability would not create permission for those actions.

## 4. Existing fictional policy for this exercise
Use these same six rules. Their order below gives convenient rule references, not an additional precedence algorithm. Apply relevant rules together and explain conflicts or missing context instead of inventing an unstated exception.

- An enrolled student may read and update their own draft submission.
- A student may not read another student's submission or assign grades.
- An assigned instructor may review submissions for their assigned course.
- An instructor may not assume access to unrelated courses.
- A submitted record is not editable by its student under this simplified exercise policy.
- An unauthenticated user may read public course descriptions only.

This is a fictional policy, not the academy's implemented policy or a live permission grant. Do not add new permissions, roles, course assignments or lifecycle exceptions. The fact that one operation is not explicitly discussed is not permission to perform it. The later code fixture has its own separately stated policy and prerequisites; do not silently import its narrower rules into these paper cases or treat this text as production configuration.

## 5. Apply the model to the same six paper cases
For each proposed action identify the subject, action, resource, ownership/course context, lifecycle state and required decision. Separate a clear policy denial from missing information that must be resolved. Under a deny-by-default policy, an unknown permission is not an implied allow.

Paper cases:
1. An enrolled student edits their own draft in their course.
2. The same student reads a classmate's submission.
3. An assigned instructor reviews a submission in another course.
4. A student edits their own already submitted record.
5. A visitor reads a public course description.
6. A requester claims an instructor role in an untrusted request field.

For each case, cite the relevant fictional rule and list any missing facts. Do not send requests or access records to answer these cases. These are the original six cases, not six observed application responses or an expanded assessment bank.

### Complete the existing matrix — do not invent evidence
| Case | Subject and trusted/supplied facts | Action/resource | Ownership, course and state context | Relevant rule(s) | Decision justified by supplied facts | Missing or untrusted information |
|---|---|---|---|---|---|---|
| 1 | To complete | To complete | To complete | To complete | To complete | To complete |
| 2 | To complete | To complete | To complete | To complete | To complete | To complete |
| 3 | To complete | To complete | To complete | To complete | To complete | To complete |
| 4 | To complete | To complete | To complete | To complete | To complete | To complete |
| 5 | To complete | To complete | To complete | To complete | To complete | To complete |
| 6 | To complete | To complete | To complete | To complete | To complete | To complete |

This is a format for the existing permission-matrix deliverable, not an additional worksheet file or submission. A concise equivalent text layout is acceptable for drafting. The learner must supply the reasoning; no completed answer matrix is provided here.

Use the following process without turning it into a test script:
1. Extract only facts actually supplied by the case.
2. Identify the proposed action and particular resource.
3. Match the relevant ownership, course and lifecycle conditions to the unchanged fictional rules.
4. State the decision justified by those facts and separately name any missing or untrusted information.
5. State the reasoning limit: a paper policy decision does not prove real enforcement or an actual unauthorized effect.

Do not claim a live service denied a request simply because the fictional policy requires denial. Likewise, not enough information to justify access is not an observation that protected data was disclosed. Keep the intended decision and implementation evidence in separate statements.

## Offline evidence-reading support
Use the [fictional authorization evidence pack](AUTHORIZATION-EVIDENCE-CASEPACK.md), its [blank worksheet](AUTHORIZATION-EVIDENCE-WORKSHEET.md) and linked JSON fixture. The exercise separates the policy decision, supplied HTTP status and actual content in the invented response. It includes an allowed owner read; two forbidden-content disclosures carrying different status codes; a 200 with denial text only; an untrusted role claim; and missing ownership context. Its optional reader processes local JSON without requests or imports of the vulnerable teaching policy. This support adds no live test, identifier guessing, new prerequisite, required deliverable or runtime/publication change.

Keep that pack's invented records labelled and distinct from the six paper cases unless the exercise explicitly supplies the connection. Do not use a response from one fictional record to fill a missing result in another case. A parser's output is not an observed application request.

## 6. Reason about vulnerability claims without reducing them to status codes
A broken-access-control finding needs evidence that an actual permission boundary was crossed under the applicable policy. Identify the relevant subject/context, action, resource, intended permission and observed disclosure or effect. If a necessary fact is absent, state that limitation rather than invent an owner relationship or successful unauthorized operation.

An exposed button, error message, 200 status or sequential identifier alone does not prove unauthorized data access. Conversely, a denial page does not establish that every backend operation is protected. If expressly supplied protected content is returned despite a denial status, the status label does not erase the disclosure. A 200 response containing only a denial message is not by itself proof that the protected data was obtained. Interpret the actual supplied facts rather than force every example into a finding.

Do not infer the security of every action, endpoint or resource from one allowed or denied example. Unpredictable identifiers and interface restrictions can have useful roles, but they do not replace authorization enforcement. These limits apply to the reasoning exercise; they are not instructions to discover additional identifiers or bypass a real interface.

Future practical work requires a reviewed fixture, explicit authorized test identities, scoped operations, authoritative resource/context facts and an evidence-handling/recovery plan before execution. Never turn a fictional case into a claim about a real user or system.

## 7. Submission and feedback
Provide the existing permission matrix and concise explanations. Cite the fictional rule(s), distinguish trusted facts from untrusted claims, identify missing information and state what your conclusion cannot establish. Use fabricated roles/resource descriptions only; do not include real user IDs, tokens, submissions or instructor answers.

| Existing review focus | What the explanation should demonstrate |
|---|---|
| Identity versus permission | Authentication can succeed while the particular action is denied, and explicitly public resources need not require login |
| Subject/action/resource/context | The specific operation and relationships are identified instead of relying on a generic role label |
| Trust and missing facts | Client assertions are not promoted to authoritative facts; uncertainty is explicit |
| Rule application | Decisions cite the unchanged fictional policy rather than an invented exception or another fixture's rules |
| Enforcement/evidence limits | UI controls, HTTP status, content and policy decisions are not treated as interchangeable proof |
| Scope and privacy | The work stays paper-based, uses fictional data and does not propose unauthorized access to validate an answer |

Feedback should identify the exact missing condition, unsupported trust assumption or evidence/decision confusion and request a focused explanation. Do not ask for a live request, another person's account or a guessed identifier to strengthen a paper answer. Record assistance separately from independent reasoning.

Numeric scoring, formal pass thresholds, resubmission rules and assessor calibration remain pending. A completed matrix grants no course access, practical permission, progression or award. Use the actual approved private submission route only after access, format, collection and retention policies exist; this repository and Markdown page are not a learner collection system.

## Sources and authoring boundary
Source: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html . Consulted 2026-11-02. Its recommendations inform the conceptual explanation; they do not establish that the academy's code, fixtures, private delivery or every endpoint enforces them.

This expansion changes only the existing EH-WEB-03. It preserves EH-WEB-02 as its prerequisite, the same six fictional rules, six paper cases, permission-matrix task and optional support links. It adds no case bank, real identity, target, request allowance, enumeration, authentication fixture, canonical lesson ID, prerequisite edge, reading-profile entry, runtime integration, publication flag, Discord handler, database change or deployment.

No authentication, authorization request, account/data access, identifier manipulation, vulnerable-policy execution, guest/browser reproduction, full repository suite, independent learner assessment or assessor calibration was performed for this authoring batch. The supporting pack's earlier checks retain their original scope: local synthetic-data consistency/reader checks, not actual request or enforcement evidence.
