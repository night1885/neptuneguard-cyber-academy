# Certification deployment database configuration

This patch adds configuration support, not deployment or credential provisioning. Its CI results remain pending at preparation time. It supersedes the inherited-credentials/TLS behavior described in database-runtime-integration.md for enabled certification. The PR's verified snapshot at a6de92a6 describes the earlier configuration and must be updated only after this patch is verified.

When CERTIFICATION_ENABLED is not exactly true, certification still creates no pool and ignores unused database configuration. When enabled, it now requires CERTIFICATION_DATABASE_URL. There is no fallback to DATABASE_URL or the academy pool's options. The old shared-pool function parameter remains only for call-site compatibility; certification database configuration comes from its own environment variables. Existing academy credentials and TLS settings in index.js are unchanged and still require separate review.

Variables:
- CERTIFICATION_DATABASE_URL: explicit PostgreSQL URL naming the database, at most 12,000 characters, with no query parameters or fragment. Supply the reviewed restricted runtime account through secret settings, not committed files or chat.
- CERTIFICATION_DATABASE_TLS: verify-full by default. This maps to ssl.rejectUnauthorized=true; it does not accept prefer/require/insecure or a verification-off flag. disable is allowed only when explicitly selected for localhost, 127.0.0.1, or ::1 test connections.
- CERTIFICATION_DATABASE_CA_PEM: optional provider-approved CA PEM, bounded to 65,536 characters and checked for certificate delimiters. It is passed with verification still enabled. The shape check is not certificate parsing, chain validation, expiry validation, or evidence that the provider hostname will verify; a real controlled handshake remains necessary. It cannot be supplied with disabled TLS.

All URL query parameters are rejected so node-postgres connection-string SSL options cannot replace the explicit ssl object. The node-postgres warning is documented at https://node-postgres.com/features/ssl. Pool timeout defaults are unchanged. Neither a URL nor TLS success proves least-privilege database grants. A separate URL enables credential separation but does not verify that operators chose different accounts.

Configuration tests cover secure defaults, missing certification URL despite an academy URL, bad URLs, TLS overrides/modes, explicit loopback-only TLS disable, and CA shape handling. Runtime tests assert the owned pool receives certification credentials rather than shared academy settings, disabled mode remains inert, and invalid remote TLS configuration fails before pool/listener creation. Startup mock fixtures are updated; no real Discord or remote database connects during these tests. Existing CI includes the new files via its certification test glob.

Before enabling in a test or production environment, approve host/database/role/grants, provider TLS endpoint and CA, migration ownership and schema, the agreement/policy manifest, and the actual Discord context. For the existing FOR SHARE query, the reviewed role needs the documented lock-required column UPDATE privilege while immutable-agreement triggers remain enforced. Never grant superuser/ownership merely to make readiness pass.

This patch does not change hosting settings, create production credentials, execute migrations, publish, merge, deploy, or enable certification. Controlled live testing, existing academy TLS review, final branch review, and exact rollout approvals remain required.
