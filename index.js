import 'dotenv/config';
import { Pool } from 'pg';
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags
} from 'discord.js';

const requiredVariables = [
  'DISCORD_TOKEN',
  'GUILD_ID',
  'VERIFIED_ROLE_ID',
  'DATABASE_URL'
];

for (const variableName of requiredVariables) {
  if (!process.env[variableName]) {
    throw new Error(
      `Missing required environment variable: ${variableName}`
    );
  }
}

const config = {
  guildId: process.env.GUILD_ID,
  verifiedRoleId: process.env.VERIFIED_ROLE_ID
};

const isRenderDeployment =
  process.env.RENDER === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderDeployment
    ? false
    : {
        rejectUnauthorized: false
      }
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learner_profiles (
      discord_user_id TEXT PRIMARY KEY,
      current_path_slug TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      total_xp INTEGER NOT NULL DEFAULT 0
    );
  `);

  console.log('NeptuneGuard database is ready.');
}

async function userHasVerifiedRole(interaction) {
  if (!interaction.guild) {
    return false;
  }

  const member = await interaction.guild.members.fetch(
    interaction.user.id
  );

  return member.roles.cache.has(config.verifiedRoleId);
}

client.once(Events.ClientReady, async readyClient => {
  try {
    await initializeDatabase();

    console.log(
      `NeptuneGuard Cyber Academy is online as ${readyClient.user.tag}`
    );
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.guildId !== config.guildId) {
      await interaction.reply({
        content:
          'NeptuneGuard Cyber Academy is not configured for this server.',
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    const verified = await userHasVerifiedRole(interaction);

    if (!verified) {
      await interaction.reply({
        content:
          'You need the Verified role before using NeptuneGuard Cyber Academy. Please complete server verification first.',
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'start') {
      await pool.query(
        `
          INSERT INTO learner_profiles (
            discord_user_id,
            last_activity_at
          )
          VALUES ($1, NOW())
          ON CONFLICT (discord_user_id)
          DO UPDATE SET
            last_activity_at = NOW();
        `,
        [interaction.user.id]
      );

      await interaction.reply({
        content: [
          '## Welcome to NeptuneGuard Cyber Academy',
          '',
          'Your learner profile is ready.',
          '',
          'Start with:',
          '`/begin path:linux-fundamentals`',
          '',
          'Use `/catalog` to view the full academy roadmap.',
          'Use `/progress` to view your learning progress.'
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'catalog') {
      await interaction.reply({
        content: [
          '## NeptuneGuard Cyber Academy Paths',
          '',
          '1. Linux Fundamentals',
          '2. Linux Administration',
          '3. Linux Security Engineering',
          '4. SOC Analyst and Incident Response',
          '5. Security Frameworks and Policy Engineering',
          '6. Authorized Pentesting Labs',
          '',
          'Begin with:',
          '`/begin path:linux-fundamentals`'
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'begin') {
      const path = interaction.options.getString(
        'path',
        true
      );

      await pool.query(
        `
          INSERT INTO learner_profiles (
            discord_user_id,
            current_path_slug,
            last_activity_at
          )
          VALUES ($1, $2, NOW())
          ON CONFLICT (discord_user_id)
          DO UPDATE SET
            current_path_slug = EXCLUDED.current_path_slug,
            last_activity_at = NOW();
        `,
        [interaction.user.id, path]
      );

      await interaction.reply({
        content: [
          '## Learning path started',
          '',
          `You started: \`${path}\``,
          '',
          'Your next learning module will be added in the next build.',
          'Use `/progress` to view your saved path.'
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'progress') {
      const result = await pool.query(
        `
          SELECT
            current_path_slug,
            total_xp,
            created_at,
            last_activity_at
          FROM learner_profiles
          WHERE discord_user_id = $1;
        `,
        [interaction.user.id]
      );

      if (result.rowCount === 0) {
        await interaction.reply({
          content:
            'You do not have a learner profile yet. Run `/start` first.',
          flags: MessageFlags.Ephemeral
        });

        return;
      }

      const profile = result.rows[0];

      await interaction.reply({
        content: [
          '## Your NeptuneGuard Progress',
          '',
          `Current path: \`${profile.current_path_slug || 'Not selected'}\``,
          `XP: \`${profile.total_xp}\``,
          `Started: <t:${Math.floor(
            new Date(profile.created_at).getTime() / 1000
          )}:D>`,
          `Last activity: <t:${Math.floor(
            new Date(profile.last_activity_at).getTime() / 1000
          )}:R>`
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'continue') {
      const result = await pool.query(
        `
          SELECT current_path_slug
          FROM learner_profiles
          WHERE discord_user_id = $1;
        `,
        [interaction.user.id]
      );

      const currentPath =
        result.rows[0]?.current_path_slug;

      await interaction.reply({
        content: currentPath
          ? `You are currently enrolled in \`${currentPath}\`. Lesson navigation will be added in the next build.`
          : 'Run `/begin` and choose a learning path first.',
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'badges') {
      await interaction.reply({
        content:
          'You have not earned any badges yet. Complete modules and labs to earn NeptuneGuard badges.',
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'student-progress') {
      if (!interaction.memberPermissions?.has('ManageGuild')) {
        await interaction.reply({
          content:
            'You need Manage Server permission to view another learner’s progress.',
          flags: MessageFlags.Ephemeral
        });

        return;
      }

      const targetUser = interaction.options.getUser(
        'member',
        true
      );

      const result = await pool.query(
        `
          SELECT
            current_path_slug,
            total_xp,
            created_at,
            last_activity_at
          FROM learner_profiles
          WHERE discord_user_id = $1;
        `,
        [targetUser.id]
      );

      if (result.rowCount === 0) {
        await interaction.reply({
          content:
            `${targetUser.tag} has not started NeptuneGuard Cyber Academy yet.`,
          flags: MessageFlags.Ephemeral
        });

        return;
      }

      const profile = result.rows[0];

      await interaction.reply({
        content: [
          `## Learner Progress: ${targetUser.tag}`,
          '',
          `Current path: \`${profile.current_path_slug || 'Not selected'}\``,
          `XP: \`${profile.total_xp}\``,
          `Last activity: <t:${Math.floor(
            new Date(profile.last_activity_at).getTime() / 1000
          )}:R>`
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (error) {
    console.error('Interaction error:', error);

    if (interaction.isRepliable()) {
      const reply = {
        content:
          'NeptuneGuard encountered an error. Please contact an academy administrator.',
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);