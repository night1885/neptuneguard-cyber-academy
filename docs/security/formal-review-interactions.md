# Disabled private learner review controls

This is an unregistered interaction-handler candidate, not a live entry point. It adds no startup import, listener, command, public panel, channel message, database change, permission mutation or deployment. A runtime owner must pass real authenticated discord.js interaction objects, the explicit guild/bot/application bindings, the actual intake coordinator and shared readiness. Never construct its identity fields from client JSON.

## Implemented protocol

All recognized routes require a bot-authored ephemeral origin in the configured application and guild, a normal guild text channel, a human actor and matching channel identity. Public origins, threads, already acknowledged interactions and invalid identities do not reach intake. Modal submissions must be message-component modal submissions retaining that ephemeral origin; command-origin modals without it are unsupported.

The start route returns a private notice explaining selected-message retrieval, a separate final confirmation, 24-hour report access and the distinction between expiry and deletion. Choose opens bounded message-ID and typed PREVIEW consent fields. Preview forwards only the trusted context, work ID, selected message ID and explicit consent to intake. Confirm and Cancel forward only the server-issued preview ID. Course, exercise, private-channel verification, revision and digest authority remain in intake/core/source providers, not the custom ID or cached Discord role data.

The handler defers with ephemeral flag 64 before calling intake. It uses only interaction reply/editReply/showModal methods and never a channel send or public fallback. Mention parsing is disabled. Preview text is Markdown-escaped in a separately labeled untrusted embed; the raw source bound to the digest is unchanged. Escaped maximum-size previews are rejected rather than truncated if a payload bound is exceeded.

Confirmation returns a receipt or an explicitly unconfirmed outcome. Receipt rechecks retain the same preview ID and therefore the same server-held operation key; message-delivery failure never automatically repeats intake.confirm. Cancel wording never represents a withdrawal or rollback. A failed preview delivery attempts to cancel only its unattempted local preview metadata.

## Lifecycle and unresolved limits

At most four unsettled handler operations are admitted. Duplicate in-flight interaction IDs are consumed without another intake call. Backpressured or already acknowledged interactions may be consumed without a new acknowledgement. Full UX/backpressure handling remains a runtime acceptance gate.

Readiness and origin identity are rechecked before evidence output. Disposal suppresses late output but does not roll back a database commit or cancel arbitrary SDK/core promises. The handler borrows intake. A runtime owner must close shared readiness and stop owned components before draining. Drain waits for actual settlement and cannot guarantee finite completion for a provider that never settles.

No server-held consent-notice nonce, durable consent ledger, restart recovery or timed deletion of prior preview replies is implemented. A typed field is not a substitute for approving the actual collection/retention notice. Permission checks, database commit and Discord delivery are not atomic. Session expiry does not erase a previously delivered preview. These gaps must be resolved and tested before collecting real evidence.

## Validation and release boundary

Twenty-nine local Node tests passed without failures or skips using the actual handler with mocked interaction methods and scripted intake responses. The tests cover raw payload shape and protocol behavior, not actual discord.js serialization, gateway/API behavior, integrated core-to-PostgreSQL-to-Discord operation, full-checkout CI or independent review.

SDK and native integration acceptance, approved private discovery/entry creation, work/channel provisioning, reviewer controls, durable recovery, retention erasure and parent-record deletion integration remain unfinished. No live Discord request or real learner data was used for this batch. Do not wire or activate it merely because its unit tests pass.
