# Current learner-information policy — limited registration and access records

Status: user-approved requirements and policy decisions recorded October 17, 2026. This supersedes this file's earlier interpretation of no retention as a prohibition on all learner-linked records. It is not a published agreement, legal-compliance certification, deletion record, or production activation authorization.

## Clarified meaning and approved eligibility

The user meant that the academy must not request or retain government identification documents. Necessary Discord-linked registration and access records are permitted. Do not describe the academy as retaining no learner information.

The minimum record includes the learner's Discord user ID, application/approval status, eligibility and agreement acknowledgment status, a unique academy access ID issued after approval, and timestamps needed for the approved workflow.

The user expressly approved the existing age-18-or-older Yes/No self-declaration. Learners must be 18 or older and personally answer Yes. Do not collect actual age in years, birth dates, government ID, legal names, signed documents, or video through enrollment. This is self-reported eligibility, not independently verified age or identity. This decision resolves the former actual-age-versus-eligibility question; it does not approve minor enrollment or a guardian-consent workflow.

Do not request or retain government-ID images, identity-document copies, signed-document uploads, or video recordings through enrollment. Do not add legal names, addresses, email addresses, birth dates, or other unnecessary personal details. Do not infer permission for unrelated progress, quiz, XP, badge, activity, or provider tracking from permission for minimal registration/access records. Review any additional retained fields explicitly.

## Approved retention decisions

- Approved enrollment/access records: retain until the student finishes the course. The user confirmed that course completion ends access and triggers deletion of the associated enrollment/access record.
- Denied, withdrawn, or abandoned applications: delete three business days after application closure.
- Administrative audit events: delete three calendar months after each event occurs.

These are approved policy intentions, not proof of automatic enforcement or erasure. Audit history follows its own approved schedule and may therefore remain after enrollment/access deletion. No schedule for unrelated lab, incident, legacy progress, or provider records is created here. See eligibility-retention-decisions.md for implementation boundaries and outstanding definitions.

The completion signal, shared-record/multiple-course behavior, business-day timezone and holiday calendar, deletion execution/retry rules, related-record dependencies, applicable preservation handling, and provider/backup behavior require review before automation. Do not silently invent those details or claim that existing records have been deleted.

## Dashboard and registration requirements

Preserve the original Admin Dashboard as the main administrative interface. Integrate curriculum browsing and future admin tools through its tabs, dropdowns, buttons, or subsections, with in-place private navigation where appropriate. Admin entry and navigation must not require /start, /catalog, or another slash command. Student-facing entry remains separate and connected to the same application records. Publishing persistent entry buttons requires separately resolved locations and approval.

Support both admin-initiated registration and student-initiated applications. A student must be able to complete an admin-created registration. Both paths use the same record and review process, with duplicate prevention. Admin registration must not fabricate learner acknowledgment, reading confirmation, comprehension answers, or eligibility declarations.

Registration or declaration alone grants no access. Admin approval precedes issuance of the unique academy ID. Learners must provide their assigned ID each time they log in to a section. Bind access to the correct Discord account, check current authorization, and reject pending, denied, suspended, or revoked access. Staged section-login code and tests do not establish live activation or full curriculum coverage. General class authorization, lab authorization, and certificate decisions remain separate.

## Agreement reconciliation and release boundaries

The approved eligibility and retention decisions here supersede unresolved-policy statements in earlier agreement drafts and historical policy notes. They do not approve those drafts as final learner terms. Incorporate the decisions into the next agreement/privacy revision and obtain approval of the exact publication text before storing an agreement or configuring its manifest.

The original handlers, startup, retention holds, data fields, agreement/privacy text, and deployment guidance require reconciliation with these requirements. The smaller instructor-only application is not the intended replacement for the original Admin Dashboard or end-user workflow. Restoring startup alone is not proof of functional or compliant integration.

Existing records have not been deleted by this policy update. Do not delete records, migrate schemas, query learner records, notify students, publish Discord messages or commands, change environment variables or permissions, merge, deploy, or activate enrollment merely because this document changes. Each operational action requires its own approved scope.

Test both registration paths, learner completion, admin review, ID issuance, duplicate/repeated actions, section login, authorization changes, private navigation, retention deadlines, and failure handling before claiming end-to-end completion. Acknowledge unresolved platform/provider logging, backups, recoverable copies, and deletion behavior rather than promising zero retention.
