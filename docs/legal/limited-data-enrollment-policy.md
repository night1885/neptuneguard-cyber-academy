# Limited-data enrollment policy

Status: owner-approved requirements; not a published agreement, compliance certification, or enrollment activation.

## Superseding decisions

The Academy minimum age is 18. Ask: Are you 18 years of age or older? Offer Yes and No. Only an explicit Yes permits the remaining enrollment steps. No or an unanswered declaration blocks enrollment. This is self-declared eligibility, not a comparison against Discord signup information and not independent verification.

Discord-linked profiles, course progress, quiz results, XP, badges, student IDs, and enrollment/access/approval status may be retained. These records can still be personal data. Do not describe this policy as collecting no personal data. The earlier blanket no-collection interpretation is superseded.

Do not collect or retain legal names, actual ages, birth dates, addresses, email addresses, identity-document copies, signed-document uploads, or video recordings through the Academy enrollment workflow. The owner may conduct a separate video identity check; the Academy application must not request, ingest, or store documents or recordings from it. Do not solicit sensitive details in free-text answers or administrative reasons.

Use an explicit account-bound agreement acknowledgment instead of a typed legal-name signature. Retain only the age eligibility declaration and version, agreement version/hash, necessary timestamps and comprehension outcome, and necessary Discord-linked access/audit records. General enrollment approval and lab-specific authorization remain separate. A declaration alone grants neither.

This supersedes conflicting typed-name requirements in acknowledgment-only-policy.md and learner-agreement-draft.md. Signed uploads remain prohibited. Neither prior document may be presented unchanged as the final approved agreement.

## Implementation and release gates

The accompanying age validator is a foundation only. It does not yet change the live form, submission transaction, database constraints, approval logic, or deployed service.

Before enrollment activation:
- Remove typed-name inputs and their storage from the active enrollment path; do not fabricate a name to satisfy legacy validation.
- Wire strict Yes/No validation into server-side submission and owner approval, not only the UI.
- Persist the declaration/version transactionally with account-bound acknowledgment; reject absent or negative eligibility.
- Review approval, reinstatement, agreement-change handling, audit payloads, and migration compatibility.
- Keep restricted access for denied, suspended, or revoked learners.
- Update the agreement and privacy notice for the limited-data policy and age 18 requirement.
- Decide retention/deletion and lawful-preservation rules for permitted metadata before opening enrollment. No schedule is invented here.
- Verify tests, security boundaries, and owner dashboard flows before a separately approved production deployment.

No deletion of existing records, database migration, environment change, production test student, deployment, or enrollment activation is authorized by this policy commit. Review existing records separately; do not claim historical PII has been removed. Future collection requires an explicit policy change and implementation review.
