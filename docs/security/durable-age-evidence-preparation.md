# Minimal durable age eligibility — schema/helper preparation

Status: proposed migration and standalone helper; not integrated or activated. Operator approved the minimal record design: a self-reported minimum-age-met flag, server-generated confirmation timestamp, and age-policy version. No exact age, birth date, identity document, or parent/guardian record is retained by this design.

Migration 005 proposes three nullable columns on certification_enrollments. A check permits either all three fields unset for existing records or a complete true confirmation with a timestamp and bounded version identifier. It does not fabricate or backfill eligibility. It does not require evidence for pending/approved status by itself, and does not prove a timestamp was server-generated; the future writer must use NOW() and trusted policy constants. Production application is a separate approval.

hasCurrentAgeEligibility accepts only a true flag, age-16-v1, and a valid supported timestamp representation. A record with missing, partial, or different-policy evidence fails this helper check. This is not independent age verification, cryptographic attestation, or protection against a privileged database actor.

The new tests cover helper validation only and have not yet been verified in CI. Real PostgreSQL migration reapplication, NULL/partial constraint cases, transaction rollback, restricted-role privileges, and concurrency remain required. Existing PostgreSQL CI commands do not yet include a migration-005 suite.

## Next integration batch
- Persist the minimal fields inside the existing submission transaction after validating reported age, deriving the policy version from trusted code and timestamp from NOW(). Never accept the flag, authoritative timestamp, or policy version from learner fields.
- Require current evidence for fresh owner approval and applicable reinstatement checks; display it explicitly as self-reported in private owner review.
- Handle older pending requests through fresh authenticated eligibility confirmation and owner review, without silently treating them as eligible or rewriting acknowledgment content.
- Decide how existing approved/suspended/revoked records are handled before activation; no existing access or record is changed by this preparation.
- Extend readiness and disposable PostgreSQL tests for migration 005, evidence persistence, rollback, and legacy behavior; update fixtures without inventing production evidence.
- Reconcile the agreement/checklist and privacy wording. Metadata retention, deletion, backup handling, and legal review remain unresolved.

This commit adds source files only. It stores no learner evidence yet, runs no migration, changes no production settings, publishes no agreement, and authorizes no merge, deployment, or activation.
