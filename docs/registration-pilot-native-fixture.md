# Pilot entry instructions and native SDK fixture

Base: 4fb91843a944f32e02e4608173ae95394c17df80 on feature/registration-pilot.

Pilot registration success now tells the owner to wait for a separately approved and published component entry, not the unimplemented /start entry. The phrase is selected at construction; normal-mode wording and registration logic are unchanged.

Local evidence: eight VM checks passed with builder/service stubs, covering pilot/normal/duplicate wording, actor/guild denial, confirmation target binding/replay, cancellation, expiry and instruction snapshotting. Both proposed JavaScript files passed node --check. This is presentation/flow regression evidence, not real SDK or backend transaction acceptance.

The real discord.js import/build probe failed locally with ERR_MODULE_NOT_FOUND. Consequently the seven-test native suite was NOT executed locally and no native pass result is claimed. It imports the actual runtime module and uses actual config/parser/core/handler/native UI/service code and SDK builders with fake interactions/database state. It is intended to run without a skip under the existing certification test glob after repository npm ci. CI is pending.

The native fixture covers owner registration to invited personal acknowledgment to pending, SDK payload/modal serialization, normal instructions, negative age/comprehension, cross-account session denial, unrelated-route denial and simulated audit rollback. Even a passing result will not prove real Discord delivery, runtime startup/readiness, PostgreSQL isolation/locking/privileges or provider erasure. The runtime import check resolves its module graph; the fixture does not attach/start a real client.

No production flags, accounts, records, schema/grants, messages, merge or deployment are included. Pilot activation remains blocked pending actual CI, all-mode/full-runtime and disposable PostgreSQL acceptance, mode-aware preflight, invitation/audit-retention review and explicit learner-entry/document/record approvals. Earlier test totals are separate. Do not disable the accepted live read-only preview.
