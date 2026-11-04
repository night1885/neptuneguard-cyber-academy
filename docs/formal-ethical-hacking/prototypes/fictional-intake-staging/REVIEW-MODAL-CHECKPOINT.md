# Selector/modal router checkpoint — NOT activation

Base: 349ced2410bf9ae0321cebcada72e42e66ce7df3. Five additive files recover the default-off selector/modal boundary. No saved controller, input, preparation, response, backend, runtime, package or SQL source changes.

28 scripted boundary tests passed locally on Node 20.20.1. The two installed-SDK/composed tests were syntax-checked only, not run locally. New Node 20/22 CI installs existing lockfile dependencies with npm lifecycle scripts disabled, reruns saved suites and executes both new suites. No combined or SDK success is asserted before CI results. No SDK client/login or HTTP to Discord is part of these tests.

The router generates a local payload for 1–25 explicitly approved report IDs and two decisions; it never publishes the root. Exact application, reviewer, guild, channel, bot-authored root ID, interaction type/age and report allowlist are checked. An issued actor-bound token scopes the feedback modal. A managed private acknowledgement precedes reading feedback. Only fixed status text is sent through the required response service; no direct reply fallback exists. Late/unknown opening or response outcomes invalidate input and request managed retirement.

canBegin(ctx) is mandatory and must synchronously return true only when the parent scope registry admits a new input. It has no permissive default. The parent must connect it to one active/unresolved session per reviewer/record and serialize startup/admission. This callback is a trusted port, NOT an implemented durable/cross-process registry; a constant true callback is unsuitable for live wiring. isReady must reflect revocation, failed response ownership and startup inventory. This router never forwards unhandled prepare/confirm/recover routes to the legacy SDK handler.

Dispose cancels input and closes router admission; it does not prove outstanding response/transport cleanup is complete. Bounded waits and reference clearing are not cancellation, remote quiescence or secure erasure. SDK interaction objects are assumed to come from an authenticated parent client; mocked methods and builder validation do not establish Gateway authentication or real channel permissions.

CI builder tests validate raw payload schemas against the installed dependency. Their second scenario composes actual input/bound preparation with simulated authority, review store and response service. It does not exercise live SQL or the actual encrypted response stack in that same path; separate saved suites cover local stack composition. Registry implementation, managed confirmation rendering, multi-interaction message ownership, runtime/permission/deployed-storage/key/retention review and full SQL integration remain gates.

No listener, root message, real credentials, live key/storage setup, SQL installation, merge or deployment is authorized. Dependency installation is limited to disposable CI and does not change package manifests or lockfiles.
