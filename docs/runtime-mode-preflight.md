# Explicit-mode local preflight

Base: a770505cf297ca15da0cbd675a7402990108bb9e on feature/registration-pilot; PR #15 stays draft and activation-blocked.

With the intended environment already provided, run exactly one of:

    node certification-runtime-mode-preflight.mjs --mode=owner-preview
    node certification-runtime-mode-preflight.mjs --mode=registration-pilot

There is no automatic mode selection or ordinary writable-mode approval. Preview reuses the existing five-flag validator and additionally requires the pilot flag false or unset; its scope is preview-flags-only, not identity/manifest readiness. Pilot reports all six flag errors together, then uses the actual pilot identity/allowlist parser, then the actual local agreement/comprehension manifest loader. If an earlier stage fails, later stages are not established. Identity/allowlist errors are reported as one group, not as an exhaustive per-field diagnosis.

Supplied values, cohort IDs, credentials, manifest text/answers and raw exceptions are not emitted. Reports expose only known mode/scope, success, field/group names, categories and expected literals/descriptions. Invalid arguments print static usage, not provided arguments. Values are never normalized, silently corrected or written back. The old preview helper/CLI and runtime startup are unchanged.

Exit codes: 0 means only the stated local scope passed; 1 means validation failed; 2 means unsupported CLI usage. The command opens no Discord/PostgreSQL connections, reads no dotenv file, alters no settings and performs no deployment. It sees the current process environment, not saved-only Dashboard values or proof of a future deployment environment. Do not share complete environment exports or server-side answers in chat.

Fresh focused local result: Node v20.20.1; 110 tests passed, zero failed, zero skipped. Real committed parser/config/preview dependencies reproduce their pinned hashes; tests include CLI subprocesses, aggregated flag errors, strict literals, identity/allowlist/manifest failures, mode conflict, immutable reports and non-disclosure. This is not SDK, database, provider or live runtime acceptance. Prior test totals are separate and new CI is pending.

Zero exit does not establish database URL/TLS/role/privilege/schema/function safeguards, immutable stored agreement content, actual Discord identities/permissions, deployment binding, legal sufficiency, record approval or learner-entry publication. The invitation/audit-retention dependency and remaining release gates are not resolved here. No production flag or record changes, merge or deployment are authorized; do not disable the accepted live read-only preview.
