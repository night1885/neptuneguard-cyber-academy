# Current learner-information policy — limited registration and access records

Status: requirements clarified by the user on October 17, 2026. This supersedes this file's earlier interpretation of no retention as a prohibition on all learner-linked records. It is not a published agreement, legal-compliance certification, deletion record, or production activation authorization.

## Clarified meaning

The user meant that the academy must not request or retain government identification documents. Necessary Discord-linked registration and access records are permitted. Do not describe the academy as retaining no learner information.

The intended minimum record includes the learner's Discord user ID, age or age-eligibility information, application/approval status, declaration and agreement acknowledgment status, a unique academy access ID issued after approval, and timestamps needed for the approved workflow. The exact age field remains unresolved: actual age in years versus the existing age-18-or-older Yes/No self-declaration. Do not silently add birth dates or claim independent age verification. The existing self-declaration must not be relabeled as verified age.

Do not request or retain government-ID images, identity-document copies, signed-document uploads, or video recordings through enrollment. Do not add legal names, addresses, email addresses, birth dates, or other unnecessary personal details. Do not infer permission for unrelated progress, quiz, XP, badge, activity, or provider tracking from permission for minimal registration/access records. Review any additional retained fields explicitly. No retention period or provider-erasure capability has been approved or verified.

## Dashboard and registration requirements

Preserve the original Admin Dashboard as the main administrative interface. Integrate curriculum browsing and future admin tools through its tabs, dropdowns, buttons, or subsections, with in-place private navigation where appropriate. Admin entry and navigation must not require /start, /catalog, or another slash command. Student-facing entry remains separate and connected to the same application records. Publishing persistent entry buttons requires separately resolved locations and approval.

Support both admin-initiated registration and student-initiated applications. A student must be able to complete an admin-created registration. Both paths use the same record and review process, with duplicate prevention. Admin registration must not fabricate learner acknowledgment, reading confirmation, comprehension answers, or age declarations.

Registration or declaration alone grants no access. Admin approval precedes issuance of the unique academy ID. Learners must provide their assigned ID each time they log in to a section; do not claim that this section-login gate already exists or is live. The design must bind access to the correct Discord account, check current authorization, and reject pending, denied, suspended, or revoked access. General class authorization, lab authorization, and certificate decisions remain separate.

## Implementation and release boundaries

The original handlers, startup, retention holds, data fields, agreement text, and deployment guidance require reconciliation with these clarified requirements. The smaller instructor-only application is not the intended replacement for the original Admin Dashboard or end-user workflow. Restoring startup alone is not proof of functional or compliant integration.

Existing records have not been deleted by this policy correction. Do not delete records, migrate schemas, query learner records, notify students, publish Discord messages or commands, change environment variables or permissions, merge, deploy, or activate enrollment merely because this document changes. Each operational action requires its own approved scope.

Test both registration paths, learner completion, admin review, ID issuance, duplicate/repeated actions, section login, authorization changes, private navigation, and failure handling before claiming end-to-end completion. Acknowledge unresolved platform/provider logging, backups, recoverable copies, and retention behavior rather than promising zero retention. Replace superseded learner-facing agreement wording only with explicitly reviewed text supported by the implementation.
