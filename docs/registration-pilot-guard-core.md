# Registration-pilot core: fresh rebuild checkpoint

Base: 8367d7b22a9d29b6a82fc200c14469841df36fa8. Development branch: feature/registration-pilot.

This is a fresh reconstruction, not byte-equivalent recovery of the lost archives. The earlier 152-test and 70-test runs are not combined verification of this candidate.

Adds strict opt-in configuration, immutable one-to-five learner allowlisting, owner registration/read routing, listed-account initial-console/invited-acknowledgment routing, private response/control filtering, safe modal families, non-truncation of agreement text, and idempotent disposal that stops new admission. Callbacks are trusted; admission does not validate their SQL or grant database privileges.

Not imported by startup and not a runnable pilot. Do not change production flags to use this checkpoint. The parser's proposed pilot settings require preview=false; that is not permission to disable the live preview.

Required next work: rebuild the runtime companion against this checkpoint; keep broad read handlers on the read-only facade; enforce allowlisted targets inside actual services before checkout; suppress course authorization; correct learner entry instructions; update VM fixtures; test actual parser/guard/SDK/services together and use disposable PostgreSQL for transactional/privilege acceptance. Underlying handlers must retain invitation checks, account/session binding, personal declarations, confirmation expiry and replay protection. The core itself does not prove those invariants.

The invitation/audit-retention dependency remains unresolved. Actual pilot accounts, records, documents, learner entry publication, configuration and deployment require separate review/approval. No production records or services were accessed by these focused tests.

Fresh local result: Node v20.20.1; 160 tests passed, zero failed, zero skipped. These tests use fake interactions and callback spies, not a real SDK, database or live runtime. No repository CI result is claimed.
