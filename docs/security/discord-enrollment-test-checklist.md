# Discord enrollment interaction tests — prepared, not executed

Run from a checkout with the project's locked dependencies installed and its required Node.js version:

```sh
node --test test-certification-submission-interactions.mjs
```

The 11 tests import the actual handler and real discord.js builders. Mock interactions serialize action rows and modals using toJSON and assert response content length. Database calls and Discord API transport remain mocked. No bot is started, no message is sent to Discord, and no migration is invoked.

Coverage includes successful authenticated submission, private response options, omission of the typed name from responses, foreign user/guild rejection, one-use replay protection, expiration, restart invalidation, changed agreement configuration, failed comprehension, pagination before form access, disabled and direct-modal attempts, cancellation, and generic database-error responses.

These tests are added but have not been executed. The prior 37 passing unit-test result does not include them. The four-suite backend runner is unchanged; run this interaction suite separately for now.

Before router integration, also test concurrent starts/actions, session capacity, per-user abuse controls, prompt and answer-key configuration changes, Unicode/markdown agreement display, all supported question counts, response and showModal failures, real Discord payload compatibility, and dependency-version compatibility. Test actual PostgreSQL transaction failures and concurrency separately.

The handler remains standalone and gated. This test commit connects no route, posts no message, enables no enrollment, applies no migration, and deploys nothing.
