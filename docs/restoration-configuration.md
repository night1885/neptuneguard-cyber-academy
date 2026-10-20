# Staged restoration configuration boundaries

This guide explains repository configuration, not authorization to activate or deploy. No hosting settings, secrets, start command, database grants, messages, learner records, or agreement versions change when these files are committed.

## Entry points are distinct

- package.json continues to select instructor.js by default. The certification example does not replace instructor-mode configuration or switch entry points.
- restoration.js is a staged certification-only entry point. It creates the restored certification application, requires an explicit Discord token and guild, and does not create the legacy academy database pool or initialize profile/progress/badge tables.
- index.js is the legacy academy entry point and requires DATABASE_URL in addition to its Discord/server/role settings. Its application factory now keeps legacy storage initialization paused; the legacy learner-interaction hold is not lifted. Do not choose it as a shortcut to restoration.

## Disabled reference defaults

.env.certification.example is not automatically loaded by dotenv. Its four implemented feature flags are explicitly false: CERTIFICATION_ENABLED, CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED, CERTIFICATION_APPLICATION_CLOSURE_ENABLED, and CERTIFICATION_COURSES_ENABLED. Omitting the optional closure/course flags also leaves them off in code. Values other than the accepted true/false strings are rejected by their optional-flag readers.

With certification disabled, the runtime does not create its certification pool or register its listeners. The staged restored application itself intentionally refuses disabled certification: this reference file is not a runnable restoration activation bundle. Blank identifiers/URLs are placeholders, not approved production values.

## Requirements before any separately approved activation

- The restored application requires explicit valid GUILD_ID, ACADEMY_OWNER_ID, ACADEMY_ADMIN_CHANNEL_ID, CERTIFICATION_ENABLED=true, and a valid current enrollment manifest. Base configuration-loader owner/channel fallbacks are not a substitute for these restored-application requirements.
- Enabled certification requires CERTIFICATION_DATABASE_URL and reviewed TLS configuration. There is no fallback to DATABASE_URL. The example uses verify-full; provider trust material, restricted credentials, schema readiness, and actual target binding require verification.
- A restored application needs a valid current manifest even when new enrollment submission is disabled. Approve/publish the exact immutable agreement and approve the comprehension configuration before supplying matching versions/hash and server-side answers. Keep production answers and credentials out of repository examples and chat.
- Enabling courses additionally requires an explicit valid VERIFIED_ROLE_ID and the current agreement manifest. The runtime performs course schema/navigation readiness checks before admission. Enrollment alone does not grant every course; assignment, account-bound ID entry, current authorization, and role checks remain separate.
- Enabling application closure requires enabled certification and its schema/readiness checks. Recording closure does not schedule or perform deletion.
- Retention previews remain explicitly enabled library calls with owner checks; no preview or deletion activation environment variable is supplied by this example. No deletion scheduler/executor is activated by the four flags.
- Startup validates the configured admin channel, bot permissions, and everyone-role visibility, but those checks do not prove exhaustive Discord privacy or authorized staff access. Review actual visibility and the separately approved entry-message location before publication. Startup does not publish entry messages.

Do not copy CERTIFICATION_TEST_* variables or disposable fixture credentials into production. Test-only schemas, grants, loopback URLs, and disabled TLS examples are not production instructions.

## Verification and outstanding gates

The example-config unit test parses assignments, rejects duplicates, verifies disabled defaults/placeholders, and confirms that the disabled runtime creates no pool/listeners. It uses no real Discord or database connection and is included by the existing certification test glob. New passing results are not claimed before CI runs.

This guide does not settle preservation obligations, dependency/deletion ordering, provider backups/logs, final document approval, real-environment acceptance, entry publication, or release authorization. Resolve those separately; keep restoration staged and the PR in draft until release review is complete.
