# Web foundations — access-control reasoning capstone

Draft specification; not published or calibrated. Requires EH-WEB-01 through EH-WEB-03. Paper-based: no new service, hosted lab, real identity, token or application request is required. Proposed IDs are not runtime registrations.

## Scenario — entirely fictional
A course portal has public descriptions, student draft submissions, submitted records and instructor review pages. Its policy is exactly the fictional policy in EH-WEB-03. You receive these design claims, not executed evidence:

A. The interface hides the Grade button from students.
B. A hypothetical HTTPS response sets a session cookie with Secure, HttpOnly and SameSite=Lax.
C. A developer says every successful HTTP response proves the requester had permission.
D. Object identifiers are long random-looking strings.
E. Logout removes the cookie in the browser; no server-side behavior has been described.
F. Backend authorization checks are described as applying only when a page initially loads.

## Assignment
1. Build a subject/action/resource matrix using the provided policy, including ownership, course assignment and draft/submitted state.
2. For each design claim, separate the supplied fact from the inference being proposed.
3. Explain what, if anything, the described control protects and what it does not prove.
4. Identify missing implementation evidence and propose narrowly scoped future checks, on paper only.
5. Write a short report that distinguishes confirmed design concerns from unverified hypotheses. Do not invent a successful exploit, HTTP transcript, session token or severity score.

## Deliverables
A scope statement, permission matrix, claim/evidence table, concise analysis, proposed verification plan and limitations. State explicitly that this is a paper exercise. Use fabricated names and values. Do not substitute the real course platform or student data for the scenario.

## Reviewer criteria
Assess the distinction between authentication and authorization; HTTP-status reasoning; understanding of cookie limits; subject/resource/context modelling; privacy; and restraint in vulnerability claims. Review proposed tests for explicit authorization and minimal data access. This is not a request to execute them.

Rubrics, pass thresholds, assessor examples and resubmission policy must be calibrated before formal assessment. No automatic permission or award follows.

## Validation and integration state
This batch was authored against RFC 9110, MDN cookie guidance and the OWASP Authorization Cheat Sheet. No new fixture, browser/session behavior, permission enforcement or complete student workflow was executed. EH-WEB-01 reuses an existing bounded HTTP exercise but remains unvalidated on supported student guests. No backend access-control implementation is created by these documents.

Before release: technical peer review, novice/accessibility review, real supported-guest reproduction of the bounded HTTP exercise, calibrated paper-assessment examples, approved private submissions and separate course-metadata integration. Existing manifest gates, Community Learning, runtime code and production remain unchanged. Students continue to build and run their own practical environments.

Sources:
https://www.rfc-editor.org/rfc/rfc9110.html
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

## Expanded teaching: combine controls without combining their guarantees

This supplement explains the existing paper capstone. Use the original fictional portal, policy and design claims A-F only. No proposed check is permission to execute a request, inspect an account or change a system. A completed analysis creates no grade, course access or award.

### Start from the decision, not the control label

The scenario concerns a subject performing an action on a resource in a particular context. Before discussing cookies, hidden buttons or identifiers, identify the protected operation and the fictional policy that governs it. Otherwise a report can sound technically sophisticated while never answering whether the operation should be allowed.

Reuse the policy in EH-WEB-03 exactly. Do not replace it with your preferred real-world portal behavior or assume that every instructor has every course assignment. Keep public descriptions, student drafts, submitted records and instructor review actions distinct. Ownership and lifecycle state are not interchangeable attributes.

A matrix row should identify the subject, action, resource, ownership/course context, state, applicable rule, decision and missing facts. The capstone asks for reasoning about the supplied policy, not a redesigned access-management system. If the scenario does not establish a needed fact, preserve that gap.

### Separate a claim from its supporting material

For each A-F statement, write what was actually supplied, the inference under discussion, what the described control could contribute and what remains unestablished. These statements are design claims, not authenticated runtime observations or captured HTTP exchanges.

A useful evidence label says “the fictional claim states” or “the policy requires.” An inappropriate label says “the server returned” when no request ran. Avoid turning a developer's assertion into a measurement merely by placing it in an evidence table.

Some design concerns can be identified from the stated limitation of a control. That does not establish an executed exploit, the number of affected records or an incident. Describe the concern at its actual evidence level and leave severity unassigned when the exercise supplies no justified basis for it.

### Work a control interaction — FICTIONAL

Consider A and F together. Hiding the Grade button can guide the interface, but it does not establish a check at the protected operation. F describes checks only at initial page load. The important question is whether later protected operations validate their own current subject, action, resource and context.

A paper reviewer can identify that page-load-only checking is insufficient to establish per-operation enforcement. They cannot truthfully report that a student assigned a grade, because no grading request or result is supplied. The report must preserve both the design concern and the absence of execution evidence.

The proposed future evidence category is a scoped demonstration of enforcement at the relevant operation under explicit test identities and policy. This is a description for review, not an instruction to create accounts, discover routes or try the academy's Grade control.

### Do not turn complementary controls into substitutes

B's cookie flags address different aspects of cookie handling. They do not establish token unpredictability, server-side session expiry, logout invalidation or the right to read a particular submission. The original claim is hypothetical; it does not prove that a browser accepted or transmitted a cookie.

D's random-looking identifiers do not establish actual randomness or authorization. Even a genuinely difficult-to-guess identifier would not replace checking the requester against the resource. Avoid claiming that a protected object was accessed merely because the naming design is incomplete.

E describes client-side cookie removal but leaves server acceptance unspecified. The justified conclusion is that server-side invalidation has not been established by the supplied description. It is not a supplied fact that the old identifier remains valid. Keep that distinction from the separate case pack that explicitly provides such a fictional server fact.

### Read HTTP conclusions at the right level

C says that every successful HTTP response proves permission. That inference conflates a protocol result with a policy decision. Earlier fictional evidence already shows why status, body and authoritative context require separate interpretation.

A successful transfer could contain a denial message, allowed content or prohibited content, depending on the supplied record. In this capstone C supplies no actual response body or permission-decision record. Do not borrow an unrelated example's body and present it as observed here.

The same care applies to denial statuses. A status label alone is not a complete proof of protection if protected content is present elsewhere in the supplied response. Conversely, a status alone does not prove a disclosure. Explain what the actual scenario provides rather than filling gaps with a convenient transcript.

### Make a paper verification plan reviewable

For each unresolved concern, name the property to verify, necessary authorization, explicit test subject/resource context, minimal evidence category and stop condition. Keep it conditional: a future test would need a reviewed fixture and approved scope before any execution.

Do not specify additional hosts, guessed object identifiers, real credentials or a series of retries. If the property requires facts absent from the scenario, state the clarification needed first. A plan that cannot distinguish permitted data from protected data is not ready for execution.

Avoid a generic instruction to “test everything.” For example, server logout invalidation needs lifecycle evidence; a hidden-control concern needs enforcement evidence; a cookie declaration needs browser-context evidence if acceptance is being assessed. Each question needs its own observations rather than one universal screenshot.

### Write a conclusion that retains uncertainty

Organize the short report around the applicable policy, the most important supplied design limitations, the evidence not supplied and the conditional verification needs. Use clear distinctions: policy-derived decision, stated design concern, unresolved implementation question and unperformed test.

Do not treat an unresolved question as an excuse to weaken the policy or authorize more access. Equally, do not describe every missing fact as a confirmed failure. The exercise rewards a coherent explanation of what follows from the supplied facts, not a dramatic story.

### Formative questions with explained answers

1. Does A prove either successful unauthorized grading or secure grading? No. It describes interface presentation without a supplied operation result.
2. Does E prove the old session is still accepted? No. Server-side behavior is expressly unspecified in this capstone.
3. Can B's flags establish object ownership checks? No. Cookie handling and resource permission are different controls.
4. Can a paper verification proposal be executed immediately? No. It remains conditional on separate reviewed authorization and setup.
5. Should the report invent a transcript to demonstrate C's mistake? No. Explain the inference error using the actual supplied claim and clearly labelled teaching examples.

Technical basis: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html , and the existing HTTP and cookie lessons. No new fixture, browser/session behavior, access-control operation or complete learner workflow was executed for this supplement.
