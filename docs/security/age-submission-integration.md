# Age-checked backend entry point — routed integration still pending

The standalone age-validator prerequisite at 9312b08e235df1ef8e86ef89edf1ef5b063aa95c passed the PR unit, PostgreSQL 16, and PostgreSQL 18 jobs. Those results do not establish success for this new patch.

createAgeCheckedCertificationSubmission validates submission.reportedAge before delegating to the actual existing submission service. Missing, malformed, fractional, or reported ages below 16 are rejected before database checkout through this entry point. Ages 16 and older still require the existing feature gates, authenticated caller identity, agreement/hash/check binding, explicit reading confirmation, comprehension, and transactional pending-submission rules. No parental-consent input is added.

The wrapper omits reportedAge when delegating. It collects no birth date or identity document and adds no age column or raw-age audit field. This is validation of self-report, not independent age verification or durable eligibility evidence. The required minimal evidence, owner-review handling, legacy requests, and retention policy remain unresolved before activation.

Tests call the actual wrapper and submission service with a fake database. They cover no-checkout age rejection, acceptance at 16/17, pending-only writes, and continued underlying validation. This patch's exact-head CI results are not yet verified.

IMPORTANT: The Discord handler still imports the old createCertificationSubmission factory. The old factory itself has no age check. This new entry point is not yet routed and does not yet enforce the restriction on registrations. Before activation, switch the actual handler to the age-checked entry point, bind age collection to its authenticated session, update fixtures and agreement/checklist wording, and test the complete route and bypass attempts. Do not claim a completed registration gate from this intermediate patch.

No production configuration, migration, publication, merge, deployment, or activation is performed or authorized by this source commit.
