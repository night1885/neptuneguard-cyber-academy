# Isolated certification database runtime

This patch supersedes the preparation-only integration status in database-timeout-preparation.md. The earlier factory defaults and timeout limitations still apply. Factory CI passed before preparing this integration; this new integration commit requires its own CI verification.

attachCertificationRuntime now validates the certification configuration first. Disabled certification creates no additional pool and registers no listeners. Enabled certification creates an owned pool from the explicitly supplied academy pool's options.connectionString and options.ssl. It does not use the academy pool for certification queries or close that shared pool. The existing index.js attachment already supplies a node-postgres Pool with those options, so no entry-point rewrite is included. Startup schema/agreement checks and every certification router operation receive the isolated pool.

Enabled deployments must provide a plain explicit PostgreSQL URL naming a database, without query parameters or fragments. Move URL-based TLS settings into an explicitly reviewed ssl object before rollout. The current entry point's TLS policy is inherited unchanged, not endorsed or hardened by this patch. The separate pool uses the same database credentials; it is connection isolation, not least-privilege role isolation.

Await runtime.detach() to stop new certification admission, remove listeners, mark unavailable, wait for tracked interaction handlers and current startup, and end the owned pool exactly once. Pool end also waits for checked-out clients, including database work that outlives a response deadline. Tests cover pending startup, pending replies, idempotent close, configuration ordering, pool ownership, and startup readiness.

The existing entry point does not retain the runtime handle or await detach on OS shutdown. Application-wide signal handling and shared academy-pool shutdown remain separate work. This patch does not add process-exit handlers or claim a bounded whole-process shutdown. Discord/network stalls and multi-statement transaction duration are not fully bounded by these database limits.

The injected createPool argument exists for controlled tests; production uses the real isolated factory by default. No production migration, credentials change, activation flag, agreement publication, dashboard button publication, merge, or deployment is included. Controlled live validation and security review remain required.
