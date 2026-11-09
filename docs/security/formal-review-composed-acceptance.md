# Composed learner-flow acceptance candidate

This change expands tests only. No runtime module, listener registration, production migration, privilege grant, deployment or publication is changed.

## What the four new subtests exercise

The existing disposable PostgreSQL fixture now composes the actual learner interaction handler, intake coordinator, review core and PostgreSQL storage adapter. Captured button rows, embeds and modals are additionally passed through the repository-installed discord.js builders and serialized with toJSON.

One composed case follows notice, message selection, preview, confirmation, a synthetic receipt-delivery failure and an authorized same-key recheck. It asserts that preview persists no report/operation or revision change, confirmation creates exactly one report and receipt, stored text/digest match, and the recheck preserves the original report ID and expiry. Three further cases assert zero report/operation writes for a changed source, revoked assignment and a foreign actor's confirmation.

The normal intake/core requests, real SQL transactions, constraints and operation receipts are used. Work rows are deliberately seeded by the test administrator; this is not a work/channel provisioning implementation.

## What this does not establish

Discord interaction methods remain scripted objects, not native gateway interaction instances or actual SDK REST method execution. The SDK builders validate and serialize captured payloads; they do not prove that Discord accepted them. Source retrieval and current course/exercise authorization remain scripted ports. The real HTTP source-reader adapter is not composed into these cases. No Discord client logs in and no live Discord request is made.

This is not live channel-privacy evidence, real consent capture, integrated source-HTTP acceptance, timed message erasure, reviewer UI acceptance, restart recovery, independent security review or production readiness.

## Execution and isolation

Local JavaScript syntax checking passed. The four new composed subtests were not executed locally because the installed project SDK and disposable PostgreSQL are not available in the local test environment. Do not count syntax checking, a skipped parent suite or earlier revision's green CI as a pass for these additions.

The existing formal-review PostgreSQL 16/18 CI jobs run the updated test file and already require an unskipped suite. They must pass for the exact committed head before claiming this coverage. The loopback-only formal_review_test database guard, empty-schema/role preconditions, fixture-only restricted worker role and cleanup remain in place. Runtime certification and Discord token environment values remain disabled/empty in those jobs.

All existing release gates remain: approved discovery and private entry, work/channel provisioning, reviewer controls, durable consent/recovery, real readiness composition, scoped database/Discord erasure, parent-record deletion integration and native API acceptance. Passing these tests must not activate evidence collection.
