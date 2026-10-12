# Owner router authorization boundary coverage

The transaction-cleanup commit 607dcc7ee6f4c883d878ead9be54141f688090ae passed both unit and PostgreSQL CI runs before preparing this batch. This batch's CI results remain pending.

Ten protected action variants are exercised through the actual certification router: owner overview, enrollment queue, lab queue, student directory, student detail, acknowledgment review, approval, access button, access form, and access confirmation. Each is tested against a non-owner with forged administrator permissions, the owner in another guild, a DM context, and disabled certification: 40 rejection cases. Tests assert no SELECT, no connection checkout, no modal display or field reads, and a private rejection. They use fake database and interaction objects; no external action executes.

Three positive controls cover an authorized read-only directory request, an authorized access button opening its form without a write, and the owner overview. The overview's stale claim that approval actions are unconnected is replaced with accurate enrollment-review wording and the explicit separation of lab access and certificate awards. This text change does not publish a Discord message or grant any permission. Existing route and service authorization behavior is unchanged. The existing certification test glob includes the new tests.

This targeted review is not a complete security audit. Access changes already use an in-memory owner-bound confirmation record; forged non-owner confirmation clicks are rejected before it is read. These tests do not establish valid-confirmation replay handling, real Discord role/member overwrite behavior, notification transport, least-privilege database roles, production TLS safety, lab-provider session termination, or learner eligibility and retention policy compliance. Those remain separate review and controlled-testing requirements.

No production migration, dashboard publication, merge, deployment, enrollment activation, or change to the approval/access transition rules is included.
