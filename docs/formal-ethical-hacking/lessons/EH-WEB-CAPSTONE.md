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
