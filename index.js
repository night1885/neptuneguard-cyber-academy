import 'dotenv/config';
import { Pool } from 'pg';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const MODULE = {
  courseKey: 'linux-fundamentals',
  number: 1,
  title: 'Terminal and Shell Basics'
};

function linuxDashboardComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('linux-m1-lesson')
        .setLabel('Start Lesson')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('linux-m1-lab')
        .setLabel('Practice Lab')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('linux-m1-quiz')
        .setLabel('Take Quiz')
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('linux-m1-hint')
        .setLabel('View Hint')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('linux-m1-progress')
        .setLabel('My Progress')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function quizComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('linux-m1-answer-a')
        .setLabel('A. ls')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('linux-m1-answer-b')
        .setLabel('B. pwd')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('linux-m1-answer-c')
        .setLabel('C. cd')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('linux-m1-answer-d')
        .setLabel('D. mkdir')
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learner_module_progress (
      discord_user_id TEXT NOT NULL,
      course_key TEXT NOT NULL,
      module_number INTEGER NOT NULL,
      lesson_completed BOOLEAN NOT NULL DEFAULT FALSE,
      lab_completed BOOLEAN NOT NULL DEFAULT FALSE,
      quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,
      quiz_score INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      completed_at TIMESTAMPTZ,
      PRIMARY KEY (
        discord_user_id,
        course_key,
        module_number
      )
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS learner_badges (
      discord_user_id TEXT NOT NULL,
      badge_key TEXT NOT NULL,
      badge_name TEXT NOT NULL,
      earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (discord_user_id, badge_key)
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

async function updateLastActivity(discordUserId) {
  await pool.query(
    `
      UPDATE learner_profiles
      SET last_activity_at = NOW()
      WHERE discord_user_id = $1;
    `,
    [discordUserId]
  );
}

async function getModuleProgress(discordUserId) {
  const result = await pool.query(
    `
      SELECT
        lesson_completed,
        lab_completed,
        quiz_completed,
        quiz_score,
        xp_earned,
        completed_at
      FROM learner_module_progress
      WHERE
        discord_user_id = $1
        AND course_key = $2
        AND module_number = $3;
    `,
    [discordUserId, MODULE.courseKey, MODULE.number]
  );

  if (result.rowCount === 0) {
    return {
      lesson_completed: false,
      lab_completed: false,
      quiz_completed: false,
      quiz_score: 0,
      xp_earned: 0,
      completed_at: null
    };
  }

  return result.rows[0];
}

function moduleCompletionCount(progress) {
  return [
    progress.lesson_completed,
    progress.lab_completed,
    progress.quiz_completed
  ].filter(Boolean).length;
}

async function showLinuxDashboard(interaction) {
  const progress = await getModuleProgress(interaction.user.id);

  await interaction.reply({
    content: [
      '## Linux Fundamentals — Module 01',
      '',
      `### ${MODULE.title}`,
      '',
      'Learn how to work safely in a Linux terminal and shell.',
      '',
      `Progress: **${moduleCompletionCount(progress)}/3** activities complete · **${progress.xp_earned}/100 XP**`,
      '',
      'Choose an activity below.'
    ].join('\n'),
    components: linuxDashboardComponents(),
    flags: MessageFlags.Ephemeral
  });
}

async function handleLinuxButton(interaction) {
  if (!interaction.customId.startsWith('linux-m1-')) {
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

  const profileResult = await pool.query(
    `
      SELECT current_path_slug
      FROM learner_profiles
      WHERE discord_user_id = $1;
    `,
    [interaction.user.id]
  );

  const currentPath =
    profileResult.rows[0]?.current_path_slug;

  if (currentPath !== MODULE.courseKey) {
    await interaction.reply({
      content:
        'This module belongs to Linux Fundamentals. Run `/begin path:Linux Fundamentals` first, then use `/continue`.',
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  await updateLastActivity(interaction.user.id);

  if (interaction.customId === 'linux-m1-lesson') {
    await interaction.reply({
      content: [
        '## Module 01 Lesson — Terminal and Shell Basics',
        '',
        '### Learning objectives',
        '- Understand the difference between a terminal and a shell.',
        '- Find your current directory with `pwd`.',
        '- List files with `ls`.',
        '- Move between directories with `cd`.',
        '- Create a directory with `mkdir`.',
        '',
        '### Key idea',
        'The **terminal** is the text-based window you interact with. The **shell** is the program inside it that reads and runs commands. Bash is a common Linux shell.',
        '',
        '### Safe starter commands',
        '```bash',
        'pwd',
        'ls -la',
        'cd ~',
        'mkdir -p ~/neptuneguard-lab',
        '```',
        '',
        'Use commands only in a Linux VM, WSL installation, or system you own and are authorized to use.',
        '',
        'Completion rewards will be enabled in the next build.'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  if (interaction.customId === 'linux-m1-lab') {
    await interaction.reply({
      content: [
        '## Module 01 Practice Lab',
        '',
        'Use a Linux VM, WSL, or another Linux system you own or control. This lab creates only an empty directory and an empty file in your home folder.',
        '',
        '```bash',
        'pwd',
        'mkdir -p ~/neptuneguard-lab',
        'cd ~/neptuneguard-lab',
        'touch notes.txt',
        'ls -la',
        '```',
        '',
        '### What each command does',
        '- `pwd` prints the directory you are currently in.',
        '- `mkdir -p` creates the practice directory if it does not exist.',
        '- `cd` changes into that directory.',
        '- `touch notes.txt` creates an empty file.',
        '- `ls -la` lists files, including hidden entries and details.',
        '',
        'Completion rewards will be enabled in the next build.'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  if (interaction.customId === 'linux-m1-quiz') {
    await interaction.reply({
      content: [
        '## Module 01 Quiz',
        '',
        '**Which command prints your current working directory?**',
        '',
        'Choose one answer below.'
      ].join('\n'),
      components: quizComponents(),
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  if (interaction.customId === 'linux-m1-hint') {
    await interaction.reply({
      content: [
        '## Module 01 Hint',
        '',
        'Think of the command name as an abbreviation:',
        '',
        '`pwd` means **print working directory**.'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  if (interaction.customId === 'linux-m1-progress') {
    const progress = await getModuleProgress(interaction.user.id);

    await interaction.reply({
      content: [
        '## Linux Fundamentals — Module 01 Progress',
        '',
        `Module: **${MODULE.title}**`,
        `Activities complete: **${moduleCompletionCount(progress)}/3**`,
        `Lesson: ${progress.lesson_completed ? '✅ Complete' : '⬜ Not started'}`,
        `Practice lab: ${progress.lab_completed ? '✅ Complete' : '⬜ Not started'}`,
        `Quiz: ${progress.quiz_completed ? '✅ Passed' : '⬜ Not passed'}`,
        `Module XP: **${progress.xp_earned}/100**`,
        '',
        'Completion rewards will be enabled in the next build.'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });

    return;
  }

  if (interaction.customId.startsWith('linux-m1-answer-')) {
    const answer = interaction.customId.replace(
      'linux-m1-answer-',
      ''
    );

    if (answer === 'b') {
      await interaction.reply({
        content: [
          '✅ Correct — `pwd` means **print working directory**.',
          '',
          'Quiz scoring and XP rewards will be enabled in the next build.'
        ].join('\n'),
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    await interaction.reply({
      content: [
        '❌ Not quite.',
        '',
        '`ls` lists files, `cd` changes directories, and `mkdir` creates directories.',
        '',
        'Hint: the answer is an abbreviation for “print working directory.”'
      ].join('\n'),
      flags: MessageFlags.Ephemeral
    });
  }
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
    if (interaction.isButton()) {
      await handleLinuxButton(interaction);
      return;
    }

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

      const nextStep = path === MODULE.courseKey
        ? 'Use `/continue` to open Module 01.'
        : 'Modules for this path will be added in a future build.';

      await interaction.reply({
        content: [
          '## Learning path started',
          '',
          `You started: \`${path}\``,
          '',
          nextStep,
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

      if (!currentPath) {
        await interaction.reply({
          content:
            'Run `/begin` and choose a learning path first.',
          flags: MessageFlags.Ephemeral
        });

        return;
      }

      if (currentPath === MODULE.courseKey) {
        await updateLastActivity(interaction.user.id);
        await showLinuxDashboard(interaction);
        return;
      }

      await interaction.reply({
        content:
          `You are currently enrolled in \`${currentPath}\`. Modules for this path will be added in a future build.`,
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
            'You need Manage Server permission to view another learner\'s progress.',
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

      return;
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