# Disabled Discord source-reader candidate

This module is source-only and has no startup import, listener, environment lookup, publication, permission mutation or deletion executor. It must not be exposed as a standalone client route. Compose it only behind the core's real course, student-ID, exercise and readiness authorizations. An assigned reading course is not practical authorization.

## Strict proposed privacy profile

The reviewer must match the Discord guild owner. Every Administrator-bearing role is rejected, including unassigned roles and a bot Administrator role. This is intentionally conservative and can reject existing server configurations. Do not change real permissions or weaken the profile automatically to make it pass. Only a guild text channel with exactly four overwrites is admitted: an everyone View Channel deny and explicit learner, owner and bot member overwrites. Member allows are restricted to View Channel, Read Message History and optional Send Messages. No other role/member overwrites or threads are supported. Fresh bot, guild-owner, role and channel snapshots must match before and after fetching the selected source.

Discord Administrator bypasses channel overwrites; the guild owner also has full permissions. See https://docs.discord.com/developers/topics/permissions . Message shape and forwarding references follow https://docs.discord.com/developers/resources/message .

## Transport and source bounds

Native fetch is restricted to constructed GET routes on https://discord.com/api/v10. Redirects, non-200 responses and non-JSON bodies fail closed, without retries. Streamed decoded bodies are bounded before JSON parsing: 32 KiB for the selected message and 256 KiB per metadata response. No history listing, member roster, attachment URL or arbitrary URL is fetched. The reader preserves exact admitted text and rejects attachments, embeds, replies, forwards, webhooks, components and unsupported flags. The message timestamp must agree with its snowflake creation time; source admission keeps the existing 24-hour deadline.

There are at most four reader operations and sixteen unsettled fetch/body operations. The default deadline is 1,000 ms, explicitly configurable only from 20 to 2,000 ms. A monotonic check also bounds streams producing empty chunks. Timeout or disposal aborts requests, but ignored cancellation does not free unsettled request slots. Call dispose before drain. Drain waits for actual settlement and cannot promise a finite completion time for a transport that never settles. The module does not own a shared HTTP pool.

## Evidence and remaining release gates

Thirty-nine local Node tests passed using mocked HTTP responses, with no failures or skips. These are not live Discord, integrated database-to-Discord, full-checkout CI or independent-review evidence. No real token or server data was used. The fake token in tests is fictional.

Permission snapshots, message retrieval, later database commit and response delivery are not atomic. The reader admits the fetched point-in-time content; it cannot prove that a message or permissions remained unchanged after the final read. The core must still bind the preview digest and reauthorize before and after persistence.

Real preview/confirmation controls, reviewer UI, work/channel provisioning, durable recovery, readiness composition, private response handling, scoped erasure/retention and parent-record deletion integration remain release gates. Database access expiry is not deletion, and this module does not erase Discord source messages. Do not enable evidence collection until those gates are implemented, reviewed, tested and separately approved.
