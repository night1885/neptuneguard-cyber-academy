# Instructor-only curriculum mode — candidate, not deployed

## Approved functional scope
Only the explicitly configured admin in the configured server may browse static registered teaching material. /start and /catalog open the instructor entry. Existing Course Overview buttons paginate courses, modules, and full registered module content, including supplied quiz answers and explanations. The back-to-dashboard control returns to instructor home.

Non-admins, wrong-server contexts, and DMs receive no curriculum. Discord Administrator permission alone is not accepted. All other commands, learner buttons, forms, and menus receive an unavailable response rather than invoking learner-account handlers.

No automatic student registration, permanent IDs, saved progress/XP/badges, prerequisite tracking, remembered learner approvals/revocations, lab authorization, provider sessions, or certificate issuance are supplied by this mode. An instructor must arrange teaching and admission outside this application. This is not the original automated student academy and not an automated implementation of per-learner enrollment approval.

## Startup isolation
npm start now selects instructor.js rather than index.js. The instructor startup imports only Discord/dotenv, the instructor application, static curriculum/browser dependencies, and a shutdown helper. It does not import pg, create database pools, initialize a schema, attach the certification runtime, query learner records, or write learner information. Only DISCORD_TOKEN, GUILD_ID, and ACADEMY_OWNER_ID are required; admin/guild IDs must be explicitly valid, with no fallback admin identity.

Historical database-backed code and the pg dependency remain for existing component/integration tests and separately reviewed cleanup. They are not on the instructor startup import graph. Do not start index.js or deploy the old entry path as an instructor-mode release. Existing Render secrets/configuration are not changed by this commit.

## Processing and retention limits
The application defines no learner store or per-learner session map. It temporarily processes incoming Discord interactions to authorize the configured admin and send private replies. In-flight promises are tracked only until completion for shutdown draining. It does not fetch guild-member lists or learner profiles, publish messages, send DMs, or include actor IDs, payloads, tokens, or exception details in its application logs.

Supported Discord SDK user/member/message/presence/reaction/voice-state caches are configured to zero. This does not establish that Discord, hosting providers, SDK internals, guild/channel/role metadata, network infrastructure, logs, or backups hold no information. Existing data has not been deleted. Do not publish a blanket claim that no information is processed or retained anywhere. Platform/provider review and separately approved existing-data cleanup remain outstanding.

## Verification and release gates
Tests must check configured-admin/server rejection, actual static course rendering and navigation, old learner-action rejection, import-graph isolation, zero user/message cache settings, sanitized failures, lifecycle/shutdown behavior, and the new startup target. Tests use mocked interactions and must not log into Discord or touch a database.

Verify exact-head CI and independent review. Separately verify the resolved Render service/start configuration, actual operational admin/guild settings without exposing secrets, smoke-test scope, and recovery plan. No slash command publication is needed by the proposed implementation; /start and /catalog already exist in the source registration definitions, but actual platform availability remains to be checked.

Keep PR #11 in draft. This commit authorizes no merge, deployment, environment/permission update, command registration, learner-record inspection, deletion, migration, notification, or Discord publication. A source change is not a deployed release or zero-retention certification.
