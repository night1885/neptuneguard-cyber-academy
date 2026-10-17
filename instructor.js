import 'dotenv/config';
import { Client } from 'discord.js';
import { createInstructorApplication, createInstructorClientOptions } from './instructor-application.js';

if (typeof process.env.DISCORD_TOKEN !== 'string' || !process.env.DISCORD_TOKEN.trim()) throw new Error('Explicit Discord token required');
const client = new Client(createInstructorClientOptions());
const application = createInstructorApplication({ client, guildId: process.env.GUILD_ID, adminId: process.env.ACADEMY_OWNER_ID });
void application.start(process.env.DISCORD_TOKEN);
