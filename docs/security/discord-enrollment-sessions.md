# Standalone Discord enrollment handler — not connected

certification-submission-interactions.js exports createCertificationSubmissionHandler(pool, config, guildId). It handles the cert:submit: namespace, beginning with the cert:submit:start button. It is deliberately not imported by the router, runtime, learner entry, or deployment. No start message is posted by this commit.

## Implemented controls

- Explicit certification and separate enrollment-submission gates.
- Configured-guild checks and learner identity derived from interaction.user.id.
- Trusted agreement/check configuration captured at construction, with later configuration-change detection.
- Database agreement content-hash verification before display and backend re-verification at submission.
- Private replies with mention parsing disabled.
- Agreement and question pagination, followed by a typed-name, explicit READ confirmation, and answer form. Page traversal is not proof of reading.
- UUID sessions bound to user and guild, with a fixed 15-minute expiry, at most 100 live sessions, and replacement of the same user's existing session.
- One-use modal submission tokens consumed before backend processing. Replays and sessions lost on restart are rejected.
- Pending requests only; no automatic access or student ID issuance. Typed names and answers are not echoed in responses.

## Configuration additions

The trusted comprehensionCheck must contain questions as an array of objects with prompt strings, alongside version and correctAnswers. This handler supports one to three questions because the modal also contains name and reading-confirmation fields. Each prompt must be 1–300 characters, and the questions and answers must have equal lengths. Approved production prompts must describe the expected answer format without exposing the answer key. No production agreement, prompts, or answer key are supplied here.

## Still required

The new handler has not been executed or tested with Discord builders or actual interactions. Before importing it into the router, add tests for foreign-user and foreign-guild actions, expiration, restart, replay, direct modal submission, configuration changes, failed comprehension, pagination, concurrency, builder payload limits, and response failures.

A maximum session count is not a complete anti-abuse policy. Add per-user start/attempt limits and operational monitoring before activation. Sessions are process-local and require a single responsible process or a shared session design for multiple instances. Future logging must avoid learner names, answers, or raw submissions.

Verify migrations and transaction behavior against disposable PostgreSQL. Settle agreement approval, age eligibility, and personal-metadata retention before activation. The existing four-suite runner does not test this interaction module. This commit applies no migration, connects no route, posts no Discord message, and enables or deploys nothing.
