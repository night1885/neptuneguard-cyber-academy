# Age-checked submission — connected in branch source, not activated

Backend prerequisite 5909551e926b7c302537a43e3dd3a3fb26cfe347 passed the unit and PostgreSQL 16/18 PR jobs before preparing this patch. Those results do not establish success for the new routed integration.

The Discord submission handler now uses createAgeCheckedCertificationSubmission. Its existing reading field requires READ followed by age in whole years, for example READ 16. This jointly records reading confirmation and reported age for validation, retaining the existing name field and all one-to-three comprehension questions. No parental-consent step or date-of-birth field is added.

The learner/guild/session checks occur before field processing. One-use submission tokens are consumed before validation. Missing or invalid age-reading input and reported ages below 16 cannot reach backend checkout or enrollment writes through this route. Agreement display still performs a read-only SELECT before the form; this change does not claim no database reads or no page viewing for an ineligible learner. The backend wrapper independently checks age before invoking the existing transactional service.

Tests retain the previous private-flow, identity/guild, replay, expiry/restart, configuration, comprehension, pagination, cancellation, and error cases. New tests use the actual certification router with fake Discord transport and database objects to check no-checkout rejection, consumed-token replay, missing input, ages 16/17, and all supported question counts. Exact-head CI and controlled live verification remain required; no passing result for this patch is claimed at preparation time.

Age remains self-reported, not independently verified. No age, birth date, guardian record, or eligibility-evidence column is added to the database. The raw age is omitted before delegation and is not added to audit details. Durable eligibility evidence, handling of pre-existing requests, owner-review displays, and retention remain unresolved before activation. The old low-level createCertificationSubmission service itself remains age-unaware and must not be used as a new production entry point bypassing the wrapper.

This supersedes the earlier unrouted status of the age backend and standalone-helper documents for the actual Discord route. The selected age policy remains 16 minimum with no separate parental approval. The broader agreement/checklist need reconciliation and legal review before publication; this patch does not approve the agreement or establish legal sufficiency.

No configuration is enabled, production migration executed, agreement or button published, merge performed, or deployment triggered by this source patch.
