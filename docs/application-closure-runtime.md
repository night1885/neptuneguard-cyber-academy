# Application closure runtime integration — default off

Status: repository code preparation only. No running bot configuration is changed, no Discord messages are published, and no live migrations, grants, closures, deletions, merge, deployment, or activation are performed by this change.

CERTIFICATION_APPLICATION_CLOSURE_ENABLED accepts only the strings true or false. Absence or false keeps the existing router path; true requires certification itself to be enabled. Invalid values fail before pool creation. This commit does not set the flag in any environment.

When explicitly enabled after separate release approval, attachCertificationRuntime constructs a synchronous closure wrapper around its selected base router. During startup it first runs existing base schema/agreement checks, then awaits the wrapper's initialize hook, which builds the readiness-gated closure interface. Only after that and the existing Discord owner/channel/permission checks succeed can runtime.ready become true. Pending or failed checks leave interactions unavailable. No migration or grant is run automatically.

The wrapper preserves the exact base router selected by the application. The restored application already supplies createRestorationRouter; closure composition wraps that router rather than replacing its section-login logic with a raw learner router. The wrapper passes this existing base instance into the async closure interface instead of recursively constructing another wrapper.

Shutdown removes listeners/stops admission, disposes the closure wrapper, and waits for tracked interactions and pending initialization before ending the owned pool. Initialization finishing after disposal cannot reactivate the wrapper. In-flight admitted operations retain the existing drain behavior; disposal is not a claim of undoing a transaction already committed. Clearing the live wrapper reference is not a guarantee of instantaneous memory erasure.

Unit tests cover strict/default-off flags, shared initialization, readiness delay/failure, direct restoration section-login denial, shutdown during initialization, listener/pool behavior, and invalid configuration. Existing real PostgreSQL suites cover the closure gate and transactions. New passing CI is not claimed until the commit executes. Full Discord/provider acceptance and end-to-end startup using target runtime credentials remain required.

The earlier interface notes describe the pre-integration stage: its async factory still must not be substituted directly into the synchronous createRouter callback. The new wrapper and awaited initialization hook are the supported integration path. Default-off behavior preserves the prior running configuration until separately enabled and deployed.

Before any enablement, separately review migration 006 and runtime privileges, approve final documents/configuration, and resolve the remaining retention and course-completion release requirements. This code does not implement deletion jobs, provider/backup erasure, or course-completion/shared-enrollment handling.
