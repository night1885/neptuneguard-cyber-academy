# Private Discord navigation — standalone synthetic slice

Draft maintainer prototype. runtimeIntegration:false; publishable:false.
Implements a bounded read-only navigation proposal under the
[platform decision](../DISCORD-WORKSPACE-DECISION.md), not an academy runtime handler.
No client listener is attached, command/button published, database connected or live
Discord request sent. Do not import into restoration.js or existing routers without review.

## Entry and in-place controls

The namespace is fws:. A genuine unacknowledged SDK button interaction with customId
fws:open in the explicitly configured guild/channel acknowledges using deferReply with
flags:64. The SDK ephemeral property must confirm private acknowledgement before rendering.
An injected current-course authorizer is checked before and after an injected renderer.
Only exact true authorizes; the renderer returns a nonempty string of at most 1800 characters.
It cannot provide payloads, components, files, identity claims or raw URLs to fetch.

The private message gets Previous/Home/Next buttons containing an opaque random 16-byte
hex token and a control revision. Session state binds the actor, configured guild/course,
channel, private message id, current page, revision and absolute expiry. Normal navigation
requires the same actor, private message and revision, then deferUpdate/editReply updates
that original message. No learner slash command, select menu or modal navigation exists.
Allowed mentions are disabled. This is not a new authentication protocol.

Default enabled is false. Enabling this detached factory explicitly requires reviewed IDs,
course id, authorizer and renderer. There is no production environment flag in this batch.
Sessions expire after ten minutes by default (maximum fourteen); expiry is checked on each
interaction and around protected rendering. Expired sessions are pruned on interactions,
not proactively erased by a background job. At most 128 sessions including entry reservations
are allowed by default (maximum 256). One operation per actor runs at a time. Opaque token
collisions, stale revisions, page underflow and dependency/render failure fail closed.

Each authorizer/renderer call has a two-second wait limit by default (100–5000 ms range).
Timeout prevents subsequent publication by this controller; it DOES NOT cancel underlying
adapter work or provide OS/resource containment. Adapters must be trusted and read-only.
Discord transport acknowledgement/edit calls need their own SDK/production timeout review.
The final check-to-network-delivery interval is not an atomic external-revocation guarantee.

## Expiry, denial and re-entry

Wrong-actor/message/public controls produce a neutral private error without editing the
owner's workspace. On a bound operation's authorization/render failure, controls are
retired and the current private response is cleared when the edit succeeds. No public
fallback is used. Re-entry uses the configured entry button, invalidates prior controls
and creates a new private message. Navigation state is in-memory and lost on restart.
Previously delivered content cannot be retroactively made unread; retiring controls does
not delete historical ephemeral messages or prove a storage/retention policy. Transport
failure can also prevent clearing old text. No saved progress or evidence submission exists.

## Trusted adapter boundary

handle() accepts genuine discord.js ButtonInteraction objects routed by trusted server code,
not client-supplied JSON. The tests use doubles for that interface. Guild/channel/user/message
properties and SDK response methods must come from that trusted transport. authorize receives
actorId, guildId and the configured courseId, and must check current membership, actual
course assignment and applicable access policy. A Verified role, typed ID or button token
alone is not that decision. No production identity replacement or reviewer adapter is built.
Render is a trusted minimal-content adapter; a length bound is not semantic/privacy review.
The fixed configured course means no learner-controlled course-selection payload is trusted.

## Actual tests and remaining acceptance

    node --test navigation.test.mjs

34 methods passed on Node v20.20.1: zero failures, cancelled tests or skips. The module was
also syntax-checked with node --check. Tests ran as real Node processes over temporary
source copies using synthetic interactions, authorization and renderers. No discord.js
package serializer, gateway/API, real tokens, private channel permissions or live message
lifecycle was exercised. No full-checkout suite or GitHub CI result is claimed.

Covered: default-off behavior; config validation; button-only handling; private ACK;
actor/guild/channel/message/control-version binding; in-place Next/Home; missing assignment;
revocation around rendering; expiry/re-entry; independent tokens; dependency failures and
bounded waits; capacity including in-flight entry; same-actor concurrency; overflow; disposal;
already-acknowledged interactions; transport failure; no late publication after timeout.
These are selected synthetic tests, not production security or accessibility assurance.

Before runtime wiring: review trusted identity/course adapters, real Discord private entry,
acknowledgement latency/token lifecycle, keyboard/text usability, restart/revocation behavior
and operational failure handling. Evidence/review persistence requires a separate approved
contract. No migration, learner data, course publication, award, command registration or
existing course/Community Learning code changed. This prototype is not production-ready.

## Protocol references

Discord interactions: https://docs.discord.com/developers/interactions/receiving-and-responding
Component responses: https://discordjs.guide/interactive-components/interactions
ButtonInteraction: https://discord.js.org/docs/packages/discord.js/main/ButtonInteraction:Class
Discord requires initial acknowledgement within three seconds and documents a fifteen-minute
interaction-token lifetime. Session timing here is a conservative local design, not proof of
live delivery or permission to reuse expired tokens. Private flags must be set initially.
