# Pilot invited-submission service checkpoint

Base: d718d4f02e148bb7af68a51d46a3c289cc6c9fed on feature/registration-pilot.

The submission service uses the committed internal pilot-context validator. In pilot context it rejects general self-submission and unlisted invited actors before database checkout. It captures the actual pilot policy and pins invitation-reader owner identity at construction, so later caller mutation cannot substitute another inviter. Normal non-pilot behavior is retained.

Existing agreement-content/hash checks, personal age/read/acknowledgment/comprehension checks, parameterized SQL, transactional invitation/status checks, refusal to overwrite historical identity/access fields, audit insertion and rollback/discard paths remain in place. The invitation eligibility SQL and its audit-event dependency are unchanged. A pending invited retry remains subject to the existing awaiting-acknowledgment invitation predicate; no new invited retry-idempotence promise is made.

Fresh focused result: Node v20.20.1; 52 tests passed, zero failed, zero skipped. Source and dependency transcriptions reproduce their pinned Git blob hashes. The tests use the actual committed pilot core, service-context helper, age/acknowledgment/invitation helpers and actual patched submission service with an in-memory fake connection. Router-to-service cases use a trusted callback shim, not the actual invitation UI, session manager or Discord SDK. Fake state restoration is not PostgreSQL transaction, locking, privilege or schema acceptance. Fixture null IDs and SQL absence checks do not prove production defaults or absence of provider side effects.

No runtime wiring, configuration-loader changes, production flags, migrations, grants, learner entry publication, course/lab activation, retention execution or production records are included. The pilot is not activatable through this checkpoint. Do not disable the live read-only preview.

Remaining work includes runtime/read-only-view composition, initial-console authorization suppression, pilot UI/entry instructions, fixture updates, assembled real SDK/session/service tests, disposable PostgreSQL acceptance, mode-aware preflight and the invitation/audit-retention dependency. The earlier 160- and 32-test results are separate runs and are not summed into this result. No repository CI or production acceptance is claimed. Commit, merge and deployment require separate approval.
