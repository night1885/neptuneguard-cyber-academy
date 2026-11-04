# Recovered credential checkpoint — NOT activation

Base: f543f164515edc12a77a7edd90b965956840f188. These six additive files reconstruct source from conversation, not the missing ZIP byte-for-byte. The 43 included tests passed locally on Node 20.20.1. Older test counts and CI results do not cover this version.

Includes bounded private POSIX storage, scoped AES-256-GCM vault, original-response HTTP transport, synthetic tests and isolated Node 20/22 CI. All factories default off. Tests use temporary directories, mock HTTP and synthetic keys/tokens; no npm install, database, real SDK/login, live credentials or deployment occurs.

No existing runtime, SQL, package, launcher or old workflow changes. CI guards exactly these six additive files against the base. No live storage backend, key provider or deployment path is selected. File ownership, trusted ancestors, stale-lock/orphan reconciliation, key rotation, durable-volume behavior and hardware failure still require review. Storage attestation is not proof of persistence; buffer clearing is not secure erasure of strings/caches/backups.

Abort/error is unknown, not sender quiescence. Unknown message 10008 differs from invalid webhook 10015. New publication stops at the message deadline; cleanup cutoff is creation +14 minutes. Expired credentials never prove deletion. Parent release must follow proven quiescence/cleanup and the journal must prevent replay. No such parent workflow is activated here.

Managed responses, journal/owner, modal/input/bound preparation and startup gates require subsequent recovery, assembly and combined regression. No SQL installation, Discord publication, live wiring, merge or deployment is authorized by this checkpoint.
