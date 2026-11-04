# Bound input/preparation checkpoint — NOT activation

Base: 2e15e9f0d54ab0f9c3925504c1b348e21cf5ff14. Six additive files recover one-use input custody and a new bound-preparation session. The saved controller blob ac9ba3b4e25b0ddeeab849567e050d441d925424 was inspected; it is not modified. This reconstructs source, not an earlier ZIP byte-for-byte.

28 input contracts passed locally on Node 20.20.1. The bound-session module and eight composed scenarios were syntax-checked only, not executed locally. New Node 20/22 CI runs prior backend/lifecycle/managed/filesystem suites, saved control-unit tests and both new suites. Combined success requires actual CI results.

All factories default off. Input reauthorizes begin/accept/transfer, captures report digest/submission/review revision/expiry and a non-extending deadline, consumes feedback once, and invalidates late results on cancellation/timeout/disposal. Only selectBoundDraft transfers feedback privately; no unbound draft-transfer API is provided. Clearing references is not secure erasure of strings, SDK caches, logs or backups.

The bound session wraps the actual controller with authority restricted to the original snapshot/deadline. Changed review revision before preparation rejects rather than refreshing silently. Current shortened grants can shorten custody; renewals cannot extend it. One preparation is allowed, with exact original-request recovery afterward. The wrapper excludes the legacy SDK handle method and feedback-derived fingerprint. It publishes nothing and returns no feedback.

Bindings are trusted private-port metadata, not cryptographic credentials or proof of SDK authentication. The parent must own one bounded active/unresolved session per reviewer/record scope; creating another instance must not bypass an uncertain request. No cross-process session registry is implemented here. Expiry/restart with uncertain writes needs operator reconciliation. Timers/disposal do not cancel an already-dispatched SQL write or prove remote quiescence.

Modal routing, managed confirmation rendering, multi-interaction lifetime, registry/startup/revocation integration, actual SQL composition, installed SDK/permissions and deployed key/storage/retention remain gates. Do not call the saved legacy SDK handler through this wrapper: it is deliberately unavailable. No listener, live backend/key, SQL installation, Discord publication, merge or deployment is authorized. CI uses synthetic ports and no database/network services.
