# Detached formal identity and trusted read providers

Draft review milestone. runtimeIntegration:false; publishable:false.
Baseline 08ae999ec48ad222a000c790b838b502a8a209f2. Three new modules, tests and this
record; no existing runtime, legacy course registry, assignment route or schema is edited.

formal-course.mjs gives the review route an isolated immutable identity:
formal-ethical-hacking / Ethical Hacking, draft-not-published, student-built, not Community
Learning. This is NOT production registration/publication or an owner course assignment.
The legacy Linux/SOC registry remains unchanged. A real formal-course rollout still needs
reviewed registration/assignment/schema compatibility, authorization and separate approval.

createFormalReviewAuthorization defaults off and also requires config.enabled:true,
reviewOnly:true, a trusted readPool capability and explicit current agreement/check versions.
It imports the REAL existing certification-course-lifecycle policy, allowing only the formal
review key for its read. Only one whitespace-normalized exact SELECT and its two validated
subject/course parameters may reach readPool.query. No connect/transaction/writer capability
is exposed. Zero rows deny, duplicate/foreign-subject results reject. The original policy
checks approved enrollment, active assignment, current acknowledgment/age declaration,
agreement/check versions and null closure fields. Errors return null. Grants are frozen
student_id/course_key projections; owner guides/answers are never projected to the renderer.
The SELECT still reads acknowledgment/manual-review fields in trusted backend memory:
this is not a completed column-minimization, database-privilege or privacy audit.

Settings are snapshotted. Dispose/recreate the facade on configuration disable/version
changes; it is not a live config watcher. dispose() blocks future grants and suppresses
in-flight results after stopping, but cannot cancel an issued driver request. A real
read-only database login, query deadlines, operational rate limits and audit/access review
remain required. The SQL allowlist is not a general SQL parser or protection from an
untrusted injected pool. No pool, credential or network connection is constructed here.

createTrustedReviewReaders defaults off. Explicit review use requires a trusted server SDK
client, configured guild and the authoritative course function. readMember checks requested
actor/guild, fetches only the configured guild, then fetches ONE member with
{user:actorId,force:true,cache:false}, verifying returned member/guild IDs. No bulk/member-
cache fallback occurs on failure. cache:false is a request option, not a proof that the SDK
retains no previous data. readCourseGrant binds the same formal key, validates exact grant
shape and projects two fields. Dispose retires these callbacks, not shared client/pool
resources. These readers are not public authentication endpoints: use them through the
existing bounded createAccessAdapter, which rechecks membership/role around the grant.
Verified role alone is insufficient. Direct reader calls do not supply their own deadlines;
the access/controller layers and real SDK/driver configuration must bound operational work.
The final external-revocation-to-delivery race is not solved by these detached helpers.

Actual command: node --test trusted-readers.test.mjs. 49 selected tests passed on Node
v20.20.1, zero failures/cancellations/skips. Three new modules passed syntax checks.
The real lifecycle, acknowledgment, age-declaration and manual-review modules plus existing
access adapter were copied and Git-blob verified before actual Node imports/execution.
No eligibility function was stubbed. SQL rows and SDK methods were SCRIPTED DOUBLES: no
PostgreSQL engine, database role/TLS, Discord SDK package/API/gateway or live member was
validated. A minimal type:module marker supported the selected-source temporary layout;
this was not a full checkout or CI. Earlier UI/reading suites were not rerun or aggregated.

Coverage includes automated/manual acknowledgment paths, stale/ineligible/revoked/closed
records, exact SELECT/parameter scope, duplicate/foreign subjects, projection without
instructor guide data, forced member options, unavailable/error responses, enrollment-only
rejection, access composition/no positive cache, membership change during policy read,
outer deadline and disposal/late-result handling. Synthetic approved records are input
fixtures, not real approval or comprehension/age verification. Tests preserve submitted
manual responses rather than invent an automated pass. Reused cases are not 49 independent
security guarantees. Existing source blob IDs:
- lifecycle: 0a4b08cf615aabe76fe7389f2516b74b217d097b
- acknowledgment: ca18d9115aa22b6fbc803206287b674d28623ed3
- age declaration: ffcf56ca3d0a99eef2ec6fdf18447315a002f1f1
- manual review: 7d3535c1e6fd76051952b06ad3c7bfc7ca352d37
- access adapter: 57c6eaeffa613940773bf252758ab2b8053a2cc2

No handler is attached, button published, modal/command route reused, course assigned,
learner evidence collected, progress/award granted or production flag changed. Live wiring,
private card rendering, accessibility, evidence/retention/reviewer policy, staged rehearsal
and release remain separate gates. This later facade does not retrospectively change the
historical registry observations or validation scopes in ADAPTERS.md.

SDK reference: https://discord.js.org/docs/packages/discord.js/14.27.0/GuildMemberManager:Class
