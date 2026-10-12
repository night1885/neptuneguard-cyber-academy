# Enrollment runtime configuration and readiness — not activated

The loader now recognizes CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED, defaulting to false. The only accepted explicit values are true and false as strings. Enabling submission requires CERTIFICATION_ENABLED=true and a complete CERTIFICATION_ENROLLMENT_MANIFEST_JSON supplied by trusted deployment configuration. No manifest or enabled environment values are committed or set by this change.

The JSON manifest requires agreementVersion, agreementSha256, and comprehensionCheck with version, one to three question objects containing prompt strings, and an equally sized correctAnswers array. Version identifiers use 1–100 ASCII letters, digits, periods, underscores, or hyphens, beginning with a letter or digit. Hashes use lowercase SHA-256 hex. Question prompts are 1–300 characters; answers are 1–100 characters. The loader rejects invalid configuration and deeply freezes accepted settings. Do not expose the answer key in public messages or logs.

Certification startup now verifies table existence, required enrollment columns from migrations 001–003, and enabled named student-ID and agreement-mutation/truncation safeguard triggers from migrations 001 and 004. If submission is explicitly enabled, startup also loads the configured agreement and recomputes its content hash before marking the runtime ready. No migration or publication is performed automatically.

These checks inspect required names and trigger enabled states, not a complete schema fingerprint, trigger function correctness, database-role audit, or ongoing protection against privileged changes after startup. Existing admin-channel checks also do not replace reviewing every role and member overwrite.

Eight readiness/configuration tests are added but not yet executed; existing runtime tests remain in place. Verify the new commit's CI and controlled startup behavior separately. PostgreSQL and live Discord startup integration still require review; mock catalog rows do not establish real schema readiness.

Before deployment, approve agreement content, age eligibility, retention, and real comprehension questions, verify the reviewed migrations and least-privilege roles, and test controlled startup and Discord flows. Supersedes earlier notes that no submission settings could be loaded: loading is now implemented, but no production values or activation approval are supplied.

No gates are enabled, buttons posted, agreement published, production migration applied, merge performed, or deployment started by this commit.
