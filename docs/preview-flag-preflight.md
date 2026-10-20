# Owner-preview feature-flag preflight (proposed change)

Run with the intended environment already exported:

    node certification-preview-flag-preflight.mjs

This optional standalone command validates all five owner-preview flags together. It requires certification and read-only preview to be exactly the strings true and true, and general submission, application closure and course mutation flags to be exactly false. Missing values, case changes, booleans, quotes and whitespace fail; no value is silently normalized.

It emits variable names, error categories and expected literals, never supplied values or unrelated environment data. It imports no Discord, PostgreSQL, dotenv or application startup module, makes no connections, changes no settings and does not modify records. A zero exit code validates these five flags only. It does not validate identifiers, the manifest, credentials, TLS, schemas, permissions, database role restrictions, deployment binding or application readiness.

Tests:

    node --test test-certification-preview-flag-preflight.mjs

This is not yet wired into npm start, a Render build command, pre-deploy command or CI. The existing certification test glob should discover the proposed test after the files are committed, but no repository CI result is claimed. Run against the intended saved configuration; a previously running process may still have older variables after a dashboard save-only edit.

Preparation baseline: 44cff82cfa4276d78e90d53fcc5053d9d77ae01b. No registration, pilot, access, invitation or retention behavior changes are included. This patch does not solve the separate registration-only admission or invitation/audit-retention findings. Do not treat it as learner activation authorization.

## Local preparation verification

Prepared outside the repository with Node v20.20.1. The focused suite reported: # tests 100; # pass 100; # fail 0; # skipped 0. This is not repository-wide CI, production execution or deployment acceptance.
