# API authorization case pack — fictional paper exercise

Draft supporting material, not a canonical catalogue entry, live target, testing permission or finding about a real system. All identities, records and routes below are fictional. Do not send requests to a real API. Read [EH-WEB-04](EH-WEB-04.md) and [EH-WEB-08](EH-WEB-08.md) for the separate offline practicals; this extension does not change their policies, tests or prerequisites.

## Three separate questions
1. Object-level: may this subject perform this action on this particular record?
2. Property-level: which fields may this subject receive or change?
3. Function-level: may this subject invoke this operation at all?

The OWASP API Security Top 10 (2023) distinguishes API1:2023 Broken Object Level Authorization, API3:2023 Broken Object Property Level Authorization and API5:2023 Broken Function Level Authorization. Use those labels as a teaching map, not as proof that a real application is secure. Source: https://api-security.owasp.org/editions/2023/en/0x11-t10/ .

A role check does not by itself establish access to a particular record. An opaque record identifier is not authorization. Permission to edit an object does not make every property editable. Removing a UI button does not define the server's permission rule.

## Fictional CourseDesk policy
Assume an authenticated subject comes from a trusted identity layer. Enrollment, course assignment, record owner and record state must come from authoritative backend state, not unverified request fields. This is a paper assumption, not an implemented authentication service.

- A student may read or edit only their own draft in a course in which they are enrolled.
- A student may not read or edit another student's record and may take no action on a submitted record.
- An assigned instructor may read drafts and submitted records in their assigned course, but may not edit or delete them under this narrow policy.
- Unknown roles, unknown states, anonymous subjects and unlisted actions are denied.
- Bulk export and deletion are outside these student/instructor permissions. No administrative permission is specified by this exercise.
- For student draft edits, only title and body are editable. Protected and unknown fields are not editable. Student responses must not expose internal review notes or another person's records.

For this case pack's update contract, reject a request containing any protected or unknown key as a whole, without applying its allowed keys. This matches EH-WEB-08's explicit mixed-input rejection rule. It does not define real API status codes, a complete value schema or database transaction behavior.

## Case cards A–G
For each case, state the object, property and function decisions; cite the fictional rule; identify missing facts; and propose one positive or negative synthetic test. Do not invent execution evidence.

### A — own draft, ordinary edit
Amina's trusted subject ID is STU-17. She is enrolled in COURSE-A. SUB-410 belongs to STU-17, is a draft in COURSE-A, and the proposed edit changes only its title.

Which authoritative facts support the action? Which fields must remain unchanged? What value-validation rules are still unspecified?

### B — another student's draft
Amina requests to read SUB-411, a draft in COURSE-A whose authoritative owner is STU-18. She is enrolled in that course.

Does shared course enrollment grant access? Does knowing the identifier change the policy?

### C — submitted own record
Amina owns SUB-412 in COURSE-A, but it is submitted. She proposes a body edit.

Does ownership override state restrictions? Which subject/action/object facts determine the result?

### D — protected and unknown properties
Amina owns draft SUB-410. The proposed update contains a legitimate title together with grade set to A and an unknown review_override field.

Does object ownership authorize those properties? Under this pack's explicit contract, may the legitimate title be applied if other keys are forbidden? Distinguish that contract from a real endpoint whose update behavior has not been specified.

### E — unassigned instructor
INS-4 is assigned to COURSE-B, not COURSE-A, and requests to read submitted SUB-412 in COURSE-A.

Does instructor role alone suffice? Which assignment must be checked against which record attribute?

### F — permitted reading, different function
INS-5 is assigned to COURSE-A and may read its records. They propose invoking the fictional POST /admin/export-all operation.

Does individual-record reading permission imply this bulk function? Which additional function policy and data boundaries would need specification? The route is fictional and is not an authorized testing target.

### G — unavailable trusted context
The request names SUB-410, but the application cannot establish the authenticated subject or retrieve authoritative owner/course/state attributes. The client supplies its own owner_id and instructor role claim instead.

Can those unverified claims repair the missing trust? What is the fail-closed decision? What minimal non-sensitive diagnostic information would help investigate the failed lookup?

## Review matrix
| Boundary | Evidence to design in an approved synthetic test environment | Limit |
|---|---|---|
| Object | Allowed owner case; different owner; wrong course; wrong state | A role or identifier alone is insufficient |
| Property | Allowed fields; protected and unknown fields; mixed-input rejection; response fields | Field-name checks do not validate every value |
| Function | Explicit role/function matrix, including direct server-side denials | A hidden UI control is not server enforcement |
| Trust | Missing subject, unavailable resource attributes and unverified client claims | This paper exercise implements no identity layer |

These are test-design ideas, not instructions to contact a service. No requests, fixtures or APIs were executed for this case pack.

## Reporting and review
Complete the [blank worksheet](API-AUTHORIZATION-WORKSHEET.md). Separate the fictional policy decision, a missing specification, a proposed test and a demonstrated result. Nothing in these scenarios establishes a finding about the academy or any other real system.

Use fabricated data only. Do not put real learner answers, personal evidence or protected instructor guidance into a public repository. Any actual submission requires the approved private workflow. Assessment calibration and learner validation remain pending. This supporting pack changes no catalogue count, progression, award, runtime integration or publication status.
