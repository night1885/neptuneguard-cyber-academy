# Opt-in registration-pilot runtime hook

Base: 0de6e88510546101adf4637935408307bd1cd318 on feature/registration-pilot.

The actual certification-runtime.js now selects the committed parser/policy/router/handler factory and existing native registration/invitation factories. Absent pilot flag defaults off without invoking its parser; present values use strict parsing. Identity, manifest metadata and disabled-feature requirements are checked before pool creation. Startup validators and broad views use the read-only facade in pilot. Only scoped handlers receive its backing write-capable pool. Pilot course authorization returns null. Existing readiness/shutdown logic stops new admission and drains existing work rather than cancelling database transactions.

Fresh local result: Node v20.20.1; 33 tests passed, zero failed, zero skipped. Actual patched runtime body is VM-evaluated with actual config loader, pilot parser/policy/router and read-only facade. Handler/native factories, service authorization and readiness validators are spies/stubs; status is a shim, not the actual dedicated status implementation. This is runtime-hook boundary/regression evidence, not full SDK/session/service/SQL acceptance or production readiness. Prior test totals are separate. Baseline runtime/config/core/facade fingerprints were reproduced. No repository CI is claimed.

Earlier no-runtime-import checkpoint descriptions are historical after this change. No hosting flags, actual pilot identities, production records, schema/grants, messages, merge or deployment are included. Do not disable the accepted live read-only preview.

Before activation: correct owner pilot entry instructions; run actual parser/core/dedicated/native handlers/services together with real SDK serialization; complete all-mode and existing-fixture regression; test disposable PostgreSQL with a writable backing pool for facade isolation, invitation/status locking, races and privileges; extend mode-aware preflight; resolve invitation/audit-retention dependency and review actual learner entry/documents/records. Merge, configuration and exact-revision deployment require separate approval.
