# Web foundations — access-control reasoning capstone

Draft specification; not published or calibrated. Requires EH-WEB-01 through EH-WEB-03. Paper-based: no new service, hosted lab, real identity, token or application request is required. This is authoring material, not activated runtime progression. Community Learning is unchanged.

## Objective and finish line
Combine the existing HTTP, cookie/session and authorization concepts into the existing short report. Build a policy-based permission matrix, analyse the same six design claims and propose bounded future verification questions on paper. Finish by separating supplied design facts, justified concerns, unverified hypotheses and missing implementation evidence.

This is not a new practical, an instruction to revisit the earlier HTTP fixture or a completed application assessment. No browser/account access, identifier guessing, session replay, request modification, code import or exploit execution belongs to this task. A strong paper answer does not demonstrate practical access-control enforcement or complete the comprehensive programme.

## 1. Scenario — entirely fictional
A course portal has public descriptions, student draft submissions, submitted records and instructor review pages. Its policy is exactly the fictional policy in EH-WEB-03. You receive these same design claims, not executed evidence:

A. The interface hides the Grade button from students.
B. A hypothetical HTTPS response sets a session cookie with Secure, HttpOnly and SameSite=Lax.
C. A developer says every successful HTTP response proves the requester had permission.
D. Object identifiers are long random-looking strings.
E. Logout removes the cookie in the browser; no server-side behavior has been described.
F. Backend authorization checks are described as applying only when a page initially loads.

Do not add a real portal URL, user, course ID, cookie value, response body or server log. The claims supply neither actual request results nor access to a working implementation. The real academy platform and student data are not substitutes for the scenario.

## 2. Keep the supplied policy authoritative for this exercise
Use the unchanged fictional policy in EH-WEB-03, including the ownership, enrolled/assigned-course and draft/submitted-state distinctions. Its rules are the exercise's intended permission boundary, not a description of production academy policy. Do not invent an exception because a design claim would be easier to defend with one.

A generic role does not replace the subject/action/resource/context model. Identify the particular operation and resource, the relevant subject facts, the ownership/course relationship and the record state. Mark missing or untrusted context explicitly. Under the stated deny-by-default model, missing permission is not an implied allow.

Keep this paper policy separate from the later local code fixture's own narrower policy. Do not copy a later fixture rule back into this scenario, import its teaching implementation or treat a completed matrix as an implemented access-control system.

## 3. Existing assignment — five steps, one report
1. Build a subject/action/resource matrix using the provided policy, including ownership, course assignment and draft/submitted state.
2. For each design claim, separate the supplied fact from the inference being proposed.
3. Explain what, if anything, the described control protects and what it does not prove.
4. Identify missing implementation evidence and propose narrowly scoped future checks, on paper only.
5. Write a short report that distinguishes confirmed design concerns from unverified hypotheses. Do not invent a successful exploit, HTTP transcript, session token or severity score.

These remain the existing five assignment steps. The layouts below organise their deliverables; they are not additional assessments, worksheet files or a new case bank. Use concise equivalent text if a wide table is less accessible.

### Permission matrix — make the conditions visible
Use the provided policy and its existing cases as anchors. For each matrix row, identify:
- Subject and which relevant identity/role facts are supplied or trusted under the exercise assumptions.
- Particular action and resource.
- Ownership, enrolled/assigned-course and lifecycle conditions required by the policy.
- Applicable fictional rule(s) and the decision justified by the supplied facts.
- Missing or untrusted information and the limit of the conclusion.

Do not turn an unknown relationship into assumed ownership or assignment. Do not assume that read, edit, review and grade have the same permission. A policy decision on paper is not an observation that an endpoint actually allowed or denied the operation. No completed answer matrix is supplied here.

### Claim/evidence table — keep A–F traceable
| Claim | Supplied fact/design statement | Inference being proposed | Bounded protection or concern | What is not established | Missing evidence/future question |
|---|---|---|---|---|---|
| A | To complete | To complete | To complete | To complete | To complete |
| B | To complete | To complete | To complete | To complete | To complete |
| C | To complete | To complete | To complete | To complete | To complete |
| D | To complete | To complete | To complete | To complete | To complete |
| E | To complete | To complete | To complete | To complete | To complete |
| F | To complete | To complete | To complete | To complete | To complete |

Use each claim's actual wording and the prerequisite concepts, not an invented response. An analysis can identify a weak argument or an incomplete stated design without proving that a real exploit succeeded. The table is not practical evidence or an assessor answer key.

## 4. Separate the three evidence levels
| Level | Meaning in this assessment | Limit |
|---|---|---|
| Supplied design claim | What A–F explicitly state about the fictional portal | Not executed browser/server behaviour |
| Reasoned design concern or protection | What follows from the stated claim when compared with the policy and taught principles | Conditional on the supplied description; not automatic proof of an implementation flaw or successful access |
| Implementation evidence | Actual authorised observations that a future reviewed practical would need | None is supplied merely by writing the paper report |

Be precise about the word confirmed. A claim's text is confirmed as supplied in this scenario; whether an implementation actually behaves that way is not confirmed. A described design can conflict with a principle without this paper exercise demonstrating a disclosure, forbidden state change or production vulnerability.

Do not reduce the analysis to the presence of a button, cookie flag, random-looking identifier or HTTP status. Apply the existing lessons' distinctions between client presentation, browser policy, server-side session validity and per-operation authorization. A control can provide a limited benefit while failing to establish a broader conclusion. Explain both without treating all controls as either useless or universally sufficient.

If a necessary fact is missing, identify it. Do not manufacture a denial page, protected response body, replay result, logout-invalidated identifier, browser trace or code path to close the gap. Keep the six claims separate rather than use an unsupported inference from one as a fact in another.

## 5. Propose verification on paper without granting permission
For each proposed future check, describe the question and the minimum evidence that would help answer it. Do not supply a live request sequence, use real identities or execute the proposal. No extra HTTP budget, target or session operation is authorised by this capstone.

A bounded proposal should identify:
- Which claim and policy boundary it would investigate.
- The reviewed fictional/test environment and explicit authority that would have to exist first.
- The subject/action/resource/context facts needed to make the observation interpretable.
- The legitimate allowed condition and relevant prohibited or changed-context condition, where applicable, without providing real account details or guessing identifiers.
- The minimal non-sensitive observation needed to distinguish the stated interpretations.
- Stop, privacy and evidence/recovery requirements that must be approved before execution.

A plan that says test everything or try another person's token is not narrow or authorised. A proposed denial check alone also does not establish that legitimate allowed behaviour remains available. Explain what would need verification; do not label a hypothetical expected result as observed.

The static clean-peer exercise has no login/session application and cannot establish the fictional portal's permission boundaries. Repeating its GET/HEAD requests would not supply the missing lifecycle or authorization evidence, and no repeat is introduced here. Likewise, an offline reader processing invented records does not become an actual browser, authentication system or endpoint.

## 6. Existing deliverables — one concise paper report
Provide the existing scope statement, permission matrix, claim/evidence table, concise analysis, proposed verification plan and limitations. State explicitly that this is a paper exercise. Use fabricated names and values. Do not substitute the real course platform or student data for the scenario.

Organise the same report so an authorised reviewer can follow the reasoning:
1. Scope: identify the fictional portal, prerequisite policy and paper-only boundary. State that no application requests or real account actions were performed.
2. Permission model: show the subject/action/resource/context decisions and policy references, including missing facts.
3. Claim analysis: keep claims A–F traceable through supplied facts, inferences, bounded protections/concerns and gaps.
4. Proposed verification: describe the narrow questions and missing authority/setup/evidence, not an executed test or an extra assignment.
5. Conclusion and limitations: state the design concerns the supplied material supports and the implementation questions still unresolved. Do not add an invented exploit, severity score or whole-platform security verdict.

These headings are a suggested presentation of the existing deliverables, not five more submissions. A short clear explanation is more useful than a copied standard, decorative screenshot or unsupported finding. Do not use optional supporting cases to invent evidence for this scenario.

## 7. Existing reviewer criteria and feedback
Assess the same criteria: the distinction between authentication and authorization; HTTP-status reasoning; understanding of cookie limits; subject/resource/context modelling; privacy; and restraint in vulnerability claims. Review proposed tests for explicit authorization and minimal data access. This is not a request to execute them.

| Existing review focus | Observable reasoning to look for |
|---|---|
| Authentication versus authorization | A verified identity or session is not treated as universal permission for every operation/resource |
| HTTP-status reasoning | Response labels are not substituted for policy context, protected content or an actual forbidden effect |
| Cookie limits | Declared attributes, browser behaviour and server-side lifecycle enforcement remain distinct |
| Subject/resource/context model | Ownership, course assignment, action and state conditions are tied to the provided policy |
| Privacy and proposed checks | Fictional material stays separate from real users/credentials, and future checks require explicit authority and minimal evidence |
| Restraint in findings | Supplied claims, justified design concerns, unverified hypotheses and absent implementation evidence are accurately labelled |

Feedback should identify a specific missing policy condition, unsupported inference or overbroad proposed check and request a focused paper correction. Do not require a browser screenshot, real token or live endpoint result to strengthen this paper exercise. Record guidance separately from independent reasoning; a coached correction is not retroactively an independent first attempt.

Rubrics, pass thresholds, assessor examples, resubmission and appeal policy remain to be calibrated before formal assessment. No numeric score, automatic permission, progression or award is established by this draft. Use only the actual approved private submission route after its access, format, collection and retention rules exist. This repository and Markdown brief are not a learner evidence store or a private collection system.

## 8. Validation and integration state
The earlier capstone authoring used RFC 9110, MDN cookie guidance and the OWASP Authorization Cheat Sheet. Its statement that no new fixture, browser/session behaviour, permission enforcement or complete student workflow was executed remains historical. This expansion likewise performs no live login, request, session replay, account/data access, code execution or learner assessment.

EH-WEB-01 reuses an existing bounded HTTP exercise but still requires supported-student-guest validation; repository CI is not that hardware/practical evidence. No backend access-control implementation is created by these documents. The later EH-WEB-04 practical retains its own prerequisites, fixture policy, setup and scope; completing this paper report does not activate or authorise it automatically.

Before release: technical peer review, novice/accessibility review, supported-guest reproduction of the existing bounded HTTP practical, calibrated paper-assessment examples, approved private submissions and separate course-metadata integration. Existing manifest gates, Community Learning, runtime code and production remain unchanged. Students continue to build and run their own practical environments under the applicable approved briefs.

Sources remain:
https://www.rfc-editor.org/rfc/rfc9110.html
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

This changes only the existing EH-WEB-CAPSTONE. It preserves EH-WEB-01 through EH-WEB-03 as prerequisites, claims A–F, the referenced fictional policy, five assignment steps, existing deliverables and paper-only limits. It adds no case bank, practical request, account, target, canonical lesson ID, prerequisite edge, reading-profile entry, runtime integration, publication flag, Discord handler, database change or deployment. No full repository suite or independent assessor calibration was performed for this authoring expansion.
