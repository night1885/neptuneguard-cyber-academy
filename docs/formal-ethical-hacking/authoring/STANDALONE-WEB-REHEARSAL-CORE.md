# Standalone web rehearsal core — first detached code batch

Status: source-only synthetic review component, not a Discord route, production course registration, durable progress implementation or deployment approval. No existing runtime or startup file imports this component in this batch.

## Implemented boundary

The root standalone-web-rehearsal-core.mjs exports a default-off factory, a fixed two-page learner loader and a rehearsal-only identity standalone-web-review. That identity is not a registered runtime course key. Enabling requires reviewOnly:true, syntheticOnly:true and explicitly supplied trusted authorization, page and progress providers. Boolean configuration does not authenticate callers or enforce data provenance; eventual adapters must establish that trust.

Operations are open/read/save/resume. The closed page keys are entry and http, mapped to existing W00 entry and W01 learner teaching drafts. No staff guide, arbitrary filename, external URL or generic link router is admitted. The loader resolves targets inside a trusted local checkout, reads UTF-8 and rejects empty/over-65536-byte content after reading. This is not an early streaming/resource bound or protection against a concurrently modified/untrusted checkout. Responses are raw document text, not Discord-sized pages.

Each operation uses the separate rehearsal course key and trusted actor identity, and authorization is checked again before returning content or reporting a save. Bookmark identity includes actor and course. The progress provider must implement read(identity) returning null or a valid page/revision record, and atomic compareAndSet(identity, expectedRevision, pageKey) returning saved with the next revision or conflict. The core does not implement that atomicity or persistence itself. Revision 0 denotes no previous bookmark. Bookmarks are navigation only, not lesson completion, grades or awards.

## Actual local checks

On 2026-11-01 local time, Node v20.20.1 executed node --test standalone-web-rehearsal-core.test.mjs against the exact new files in a temporary directory. Thirteen tests passed; zero failures/cancellations/skips. Tests cover default-off/provider isolation, explicit review/provider gates, rejected course/page/action inputs, read-only opening, save/resume across core re-creation, stale-save conflicts in a synthetic store, actor separation, revoked access, revocation during loading, mismatched authorization course, provider/corrupt-record failures, invalid revisions and fixed-path loader bounds.

The progress double is an in-memory Map with a synchronous compare-and-set body. Re-creating a core against that retained Map is not an operating-system/process restart, database persistence, real concurrent transaction or crash-recovery test. Loader tests use invented temporary documents, not a full repository-source contract. No existing test suite, installed Discord SDK, PostgreSQL, network, CI or live service was tested.

## Mandatory work before integration

- Durable, reviewed storage adapter/schema and actual restart/crash/concurrency tests; no migration or database write is supplied here.
- Course/content revision pinning, stale-content handling, retention/deletion and minimal real-data policy before collecting any real bookmark.
- Trusted selected-course/student/guild identity binding; this detached core does not verify Discord membership, guild/channel/message ownership or learner admission.
- Button/ephemeral-message adapter, bounded pagination, stale-control handling, rate/admission bounds and actual Discord/private presentation tests.
- Provider deadlines and lifecycle draining. Providers can currently remain pending indefinitely; stop only blocks new work/rechecks, not cancellation or confirmed drain.
- Save outcome reconciliation. A provider may commit before rejection, revocation or stop; unavailable does not prove no write occurred. Post-write rechecks suppress the response, not retroactively roll back a write or atomically couple authorization with persistence.
- Exact source/SDK/integration checks and independently reviewed synthetic staging/rollback plan before any startup wiring or activation.

No production course registry, existing ethical-hacking viewer, startup, configuration, CI definition, package manifest, database, learner record, Discord message, Render service or award changes. Existing repository automation may run on a commit. This batch is a tested workflow contract/core, not completion of the proposed internal rehearsal or the standalone course.
