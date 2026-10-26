import 'dotenv/config';
import { Client } from 'discord.js';
import { createInstructorClientOptions } from './instructor-application.js';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { readGeneralChatUiReviewFlag, createGeneralChatUiReviewOptions } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/general-chat-ui-review.mjs';

// Normal startup stays unchanged unless the separately approved UI-only flag is enabled.
if (typeof process.env.DISCORD_TOKEN !== 'string' || !process.env.DISCORD_TOKEN.trim()) throw new Error('Explicit Discord token required');
const uiReviewEnabled = readGeneralChatUiReviewFlag(process.env);
const client = new Client(createInstructorClientOptions());
const application = createRestoredCertificationApplication({ client, guildId: process.env.GUILD_ID,
  ...(uiReviewEnabled ? { attachRuntime(sharedClient, pool, guildId, env, options) {
    return attachCertificationRuntime(sharedClient, pool, guildId, env, { ...options,
      formalReview: createGeneralChatUiReviewOptions({ enabled: true }) });
  } } : {}) });
void application.start(process.env.DISCORD_TOKEN);
