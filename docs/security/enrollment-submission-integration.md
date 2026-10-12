# Enrollment submission backend — not activated

The certification-submission.js module is not connected to the Discord router or runtime. It records only pending requests; it never grants course or lab access or issues student IDs. Tests use a fixture agreement and fixture answer key, not approved production content.

## Trusted configuration required

The service requires both enabled=true and enrollmentSubmissionEnabled=true plus activeAgreementVersion, activeAgreementSha256, and comprehensionCheck containing a version and correctAnswers array. There are no default agreement or answer-key values. These settings must be supplied by trusted server code, never by the learner. They are intentionally not added to the existing environment loader.

A future authenticated Discord handler must derive studentDiscordId from interaction.user.id, enforce the configured guild, and bind displayed agreement/check versions to a server-side session. Never let learners submit another person's Discord ID or provide their own passing result, timestamps, answer key, or active agreement settings. The backend validates exact answers and assigns database timestamps. It records the approved content hash and check version and omits the typed name and answers from audit details.

## Verification

The 10 submission tests passed locally using copied JavaScript files whose Git blob hashes matched commit 0738118e75819ec30ab389c9b46870cde4dbbb6f. Database calls were mocked and a minimal type=module package.json was used, not the full project checkout. See backend-verification.md for exact scope and file hashes.

The backend runner now includes this suite. Run node test-certification-backend.mjs against a checkout to verify all four suites together; the updated runner has not yet been executed there.

## Before integration

- Review and test proposed migrations 002 and 003 against disposable PostgreSQL before applying them elsewhere.
- Approve the revised agreement, age eligibility, metadata retention policy, and actual comprehension questions and answer key.
- Make published agreement versions immutable; a content hash check at submission is not a complete agreement publication/versioning lifecycle.
- Build authenticated agreement display and submission interactions with session expiry and abuse controls.
- Verify actual transaction rollback and concurrent first submissions with PostgreSQL. Mock query tests do not prove database behavior.

This update publishes no agreement, applies no migration, deletes no records, and enables no enrollment or deployed service.
