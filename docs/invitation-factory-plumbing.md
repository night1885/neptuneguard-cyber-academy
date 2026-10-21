# Trusted invitation/session factory plumbing

Base: 163571cec5c175426604473ed32c059e91fade81; all thirteen checks passed, including both actual personal-submission PostgreSQL acceptance jobs. PR #15 remains draft and activation-blocked.

Adds explicit trusted-code createSubmissionService/createInvitationReader options through invitation routing, the attempt/deadline guard and the native agreement/session handler. Omitted options preserve legacy defaults and avoid adding undefined dependency keys. Supplied non-functions fail at construction. The invitation wrapper always forces invitedOnly true; caller options cannot enable its general-enrollment path. The factories are internal code dependencies, not request/modal/environment inputs.

The actual session, page navigation, actor/guild binding, expiry, AGREE/age/comprehension processing, response deadlines, busy/rate controls and error response bodies are retained. Only constructor signatures, factory validation/selection and forwarding change. This does NOT yet select the protected factories for the existing pilot: registration/status/runtime composition and startup readiness integration remain pending. Ordinary and read-only-preview callers retain defaults.

Fresh local result: fifteen VM contract tests passed, zero failed/skipped. They execute the three actual constructor bodies after removing imports, with stubbed SDK-facing/backend dependencies; they test default selection, explicit factory identity/config, bad types, forwarding, forced invited mode, three-layer composition, foreign-guild denial and unrelated routes. These are not actual SDK/session acceptance or PostgreSQL tests. Existing repository SDK/default-mode tests must re-establish compatibility in CI; a protected-factory native flow still needs explicit integration and verification.

No production query, SQL/grant/backfill, configuration change, learner entry, runtime factory selection, merge, deployment or pilot activation is authorized. Next: verify CI, then bind the protected registration/status/session/submission factories and combined readiness consistently under the still-disabled pilot.
