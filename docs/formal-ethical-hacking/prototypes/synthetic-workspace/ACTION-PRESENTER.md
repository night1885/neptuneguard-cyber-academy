# Synthetic action presenter and ledger correction

The existing controls.mjs ALREADY dispatches submission/review buttons. The generated morning acceptance ledger incorrectly described that dispatcher as missing because it relied on the narrower JOURNEY-INTEGRATION.md. Treat ledger W06 and Package A as corrected: reuse controls.mjs; the gap is current-state presentation/composition and later trusted transport integration. Do not build another dispatcher.

## This isolated addition

createSyntheticActionPresenter composes existing controls.press with a separate authorized store.read. Successful output keeps the historical mutation receipt revision/status distinct from the current record. It returns only an edit-existing-private-message intent, not an actual Discord edit. No existing module, test, workflow, package script, application entry, catalogue or publication flag is changed. Never import the prototype into academy runtime.

## Run

From this directory in a trusted maintainer checkout with reviewed Node.js 20+ available:

```sh
node --test action-presenter.test.mjs
```

Eight new top-level tests passed locally with zero failures/skips on Node v20.20.1. Existing source transcriptions were verified against review.mjs blob c685401e32f9a365c65aa072fcc92d22bee3cb93 and controls.mjs blob ca4f624403c223d98077ba4e8e90309361e1ad75. Existing suites were NOT rerun; this is not full-checkout, CI, live Discord or platform validation.

## Failure and privacy semantics

If the control returns a successful historical/new mutation receipt but refresh fails or is denied, output says refresh-unavailable with mutationOutcome committed-or-replayed and contains no record or receipt data. It does not claim rollback and does not automatically retry. The underlying control may be replayed only while its existing lifetime and current authorization allow it; recovery beyond that needs a separately designed route.

Conflict stays distinct from neutral unavailable. An unavailable control result does not establish that no mutation committed: controls.press can catch downstream failures, so uncertain mutation outcome remains unresolved. No durable transaction or crash recovery is added.

The store performs its existing authorization checks during the refreshed read. There is no real identity adapter, actual private surface, transport acknowledgement or guarantee against revocation after the last check. Identity/private markers remain synthetic harness inputs. A later adapter needs reviewed exercise-specific authority and real delivery consistency.

No replacement button panel, six-screen navigation, evidence upload, persistence, retention/deletion, grade, access grant or award is implemented. The same-message target and disabled mentions are presentation intent only. Existing prototype limitations remain.
