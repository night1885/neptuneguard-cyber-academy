import 'dotenv/config';
import { Client } from 'discord.js';
import { createInstructorClientOptions } from './instructor-application.js';
import { createRestoredCertificationApplication } from './certification-restored-application.js';

// Default restored entry; instructor-only startup remains an explicit fallback script.
if (typeof process.env.DISCORD_TOKEN !== 'string' || !process.env.DISCORD_TOKEN.trim()) throw new Error('Explicit Discord token required');
const client = new Client(createInstructorClientOptions());
const application = createRestoredCertificationApplication({ client, guildId: process.env.GUILD_ID });
void application.start(process.env.DISCORD_TOKEN);
