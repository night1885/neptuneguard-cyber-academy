# Learner comprehension check — proposal for DRAFT-3 review

Status: PROPOSED QUESTIONS ONLY — not an approved production check, answer key, agreement publication, or environment manifest.

These three short-answer questions address the training rules in learner-agreement-draft.md, DRAFT-3. Confirm the wording against the exact final approved agreement and approve the check separately before configuration. A comprehension result is not independent proof of reading, legal consent, identity, or age.

## Proposed questions

1. Does enrollment approval alone authorize you to test third-party systems? Answer YES or NO.
2. What must you do if authorization expires or the testing scope is unclear? Answer STOP or CONTINUE.
3. Does receiving a permanent academy student ID mean you have earned a certificate? Answer YES or NO.

## Configuration and release requirements

- Assign an approved check version only after reviewing the final agreement/questions. Do not reuse test-fixture versions or values as production configuration.
- Maintain the approved canonical key in server-side configuration, not in this repository document. Review the application's normalization and exact-match behavior before setting it.
- The manifest must include the exact published agreement version, verified SHA-256, check version, prompts, and matching server-side answers. This proposal generates no manifest.
- General self-enrollment remains disabled until separately approved. Invited enrollment also requires the reviewed agreement/check, the learner's own acknowledgment and approved 18+ declaration, and separate admin approval.
- This document does not approve final terms or the question set, implement retention, collect legal names/documents, issue IDs, authorize labs, or activate production.
