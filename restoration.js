import 'dotenv/config';
import { Client } from 'discord.js';
import { createInstructorClientOptions } from './instructor-application.js';
import { createRestoredCertificationApplication } from './certification-restored-application.js';
import { attachAdministratorCertificationRuntime } from './certification-admin-completion-runtime.js';
import { readGeneralChatUiReviewFlag, createGeneralChatUiReviewOptions } from './docs/formal-ethical-hacking/authoring/discord-workspace-prototype/general-chat-ui-review.mjs';

if (typeof process.env.DISCORD_TOKEN !== 'string' || !process.env.DISCORD_TOKEN.trim()) throw new Error('Explicit Discord token required');
const uiReviewEnabled = readGeneralChatUiReviewFlag(process.env);
const client = new Client(createInstructorClientOptions());
const application = createRestoredCertificationApplication({ client, guildId: process.env.GUILD_ID,
  attachRuntime(sharedClient, pool, guildId, env, options) {
    return attachAdministratorCertificationRuntime(sharedClient, pool, guildId, env, { ...options,
      ...(uiReviewEnabled ? { formalReview: createGeneralChatUiReviewOptions({ enabled: true }) } : {}) });
  } });
void application.start(process.env.DISCORD_TOKEN);
