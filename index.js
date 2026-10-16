import { createAcademyApplication } from './certification-academy-application.js';
import { replyStudentStart } from './certification-student-entry.js';
import { showBadgePage } from './badge-pages.js';
import { getCourse } from './course-registry.js';
import { buildLearnerReport } from './learner-report.js';
import { showAcademyCourse, handleAcademyButton } from './academy-handler.js';
import { buildLinuxCourseOverview, isModuleTwoUnlocked } from './course-navigation.js';
import { getModuleTwoProgress, showModuleTwoDashboard, handleModuleTwoButton } from './module-two.js';
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
  title: 'Terminal and Shell Basics',
  lessonXp: 25,
  labXp: 25,
  quizXp: 50,
  badgeKey: 'linux-foundations',
  badgeName: 'Linux Foundations'
};

function moduleProgressDefaults() {
  return {
    lesson_completed: false,
    lab_completed: false,
    quiz_completed: false,
    quiz_score: 0,
    xp_earned: 0,
    completed_at: null
  };
}

function moduleCompletionCount(progress) {
  return [
    progress.lesson_completed,
    progress.lab_completed,
    progress.quiz_completed
  ].filter(Boolean).length;
}

function moduleIsComplete(progress) {
  return moduleCompletionCount(progress) === 3;
}

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

async function ensureProfile(discordUserId) {
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
    [discordUserId]
  );
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

  return result.rowCount > 0
    ? result.rows[0]
    : moduleProgressDefaults();
}

async function markActivityComplete(
  discordUserId,
  activityColumn,
  xpAmount
) {
  const validActivityColumns = new Set([
    'lesson_completed',
    'lab_completed',
    'quiz_completed'
  ]);

  if (!validActivityColumns.has(activityColumn)) {
    throw new Error('Invalid course activity column.');
  }

  const dbClient = await pool.connect();

  try {
    await dbClient.query('BEGIN');

    await dbClient.query(`INSERT INTO learner_module_progress
      (discord_user_id, course_key, module_number) VALUES ($1,$2,$3)
      ON CONFLICT (discord_user_id, course_key, module_number) DO NOTHING`,
      [discordUserId, MODULE.courseKey, MODULE.number]);
    const currentProgress = await dbClient.query(`SELECT * FROM learner_module_progress
      WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 FOR UPDATE`,
      [discordUserId, MODULE.courseKey, MODULE.number]);
    const progress = currentProgress.rows[0];

    const alreadyCompleted =
      progress[activityColumn] === true;

    let moduleCompletedNow = false;

    if (!alreadyCompleted) {
      const isQuiz = activityColumn === 'quiz_completed';

      const updatedProgress = await dbClient.query(
        `
          UPDATE learner_module_progress
          SET
            ${activityColumn} = TRUE,
            quiz_score = CASE
              WHEN $4 THEN 100
              ELSE quiz_score
            END,
            xp_earned = xp_earned + $5
          WHERE
            discord_user_id = $1
            AND course_key = $2
            AND module_number = $3
          RETURNING
            lesson_completed,
            lab_completed,
            quiz_completed,
            completed_at;
        `,
        [
          discordUserId,
          MODULE.courseKey,
          MODULE.number,
          isQuiz,
          xpAmount
        ]
      );

      const updated = updatedProgress.rows[0];
      const allActivitiesComplete =
        updated.lesson_completed &&
        updated.lab_completed &&
        updated.quiz_completed;

      if (allActivitiesComplete && !updated.completed_at) {
        const completionUpdate = await dbClient.query(
          `
            UPDATE learner_module_progress
            SET completed_at = NOW()
            WHERE
              discord_user_id = $1
              AND course_key = $2
              AND module_number = $3
              AND completed_at IS NULL
            RETURNING completed_at;
          `,
          [
            discordUserId,
            MODULE.courseKey,
            MODULE.number
          ]
        );

        moduleCompletedNow =
          completionUpdate.rowCount > 0;

        if (moduleCompletedNow) {
          await dbClient.query(
            `
              INSERT INTO learner_badges (
                discord_user_id,
                badge_key,
                badge_name
              )
              VALUES ($1, $2, $3)
              ON CONFLICT (
                discord_user_id,
                badge_key
              )
              DO NOTHING;
            `,
            [
              discordUserId,
              MODULE.badgeKey,
              MODULE.badgeName
            ]
          );
        }
      }

      await dbClient.query(
        `
          UPDATE learner_profiles
          SET
            total_xp = total_xp + $1,
            last_activity_at = NOW()
          WHERE discord_user_id = $2;
        `,
        [xpAmount, discordUserId]
      );
    } else {
      await dbClient.query(
        `
          UPDATE learner_profiles
          SET last_activity_at = NOW()
          WHERE discord_user_id = $1;
        `,
        [discordUserId]
      );
    }

    await dbClient.query('COMMIT');

    return {
      completedNow: !alreadyCompleted,
      moduleCompletedNow
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  } finally {
    dbClient.release();
  }
}

function completionMessage(result, activityName, xpAmount) {
  const lines = [];

  if (result.completedNow) {
    lines.push(
      `✅ ${activityName} completed. You earned **${xpAmount} XP**.`
    );
  } else {
    lines.push(
      `✅ ${activityName} was already completed. No additional XP was awarded.`
    );
  }

  if (result.moduleCompletedNow) {
    lines.push('');
    lines.push('🏆 **Module 01 complete!**');
    lines.push(
      `You earned the **${MODULE.badgeName}** badge and completed all 100 XP in this module.`
    );
  }

  return lines.join('\n');
}

async function getProgressSummary(discordUserId) {
  const progress = await getModuleProgress(discordUserId);
  const completedCount = moduleCompletionCount(progress);

  return [
    '## Linux Fundamentals — Module 01 Progress',
    '',
    `Module: **${MODULE.title}**`,
    `Activities complete: **${completedCount}/3**`,
    `Lesson: ${progress.lesson_completed ? '✅ Complete' : '⬜ Not started'}`,
    `Practice lab: ${progress.lab_completed ? '✅ Complete' : '⬜ Not started'}`,
    `Quiz: ${progress.quiz_completed ? '✅ Passed' : '⬜ Not passed'}`,
    `Module XP: **${progress.xp_earned}/100**`,
    `Status: ${moduleIsComplete(progress) ? '🏆 Complete' : 'In progress'}`
  ].join('\n');
}

async function getBadgesSummary(discordUserId) {
  const result = await pool.query(
    `
      SELECT badge_name, earned_at
      FROM learner_badges
      WHERE discord_user_id = $1
      ORDER BY earned_at ASC;
    `,
    [discordUserId]
  );

  if (result.rowCount === 0) {
    return [
      'You have not earned any badges yet.',
      'Complete modules and labs to earn NeptuneGuard badges.'
    ].join(' ');
  }

  const badgeLines = result.rows.map(badge => {
    const earnedTimestamp = Math.floor(
      new Date(badge.earned_at).getTime() / 1000
    );

    return `🏆 **${badge.badge_name}** — earned <t:${earnedTimestamp}:D>`;
  });

  return [
    '## Your NeptuneGuard Badges',
    '',
    ...badgeLines
  ].join('\n');
}

async function showLinuxDashboard(interaction) {
  const progress = await getModuleProgress(interaction.user.id);

  await interaction.editReply({
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
    components: linuxDashboardComponents()
  });
}

async function handleLinuxButton(interaction) {
  if (!interaction.customId.startsWith('linux-m1-')) {
    return;
  }

  if (interaction.guildId !== config.guildId) {
    await interaction.editReply({
      content:
        'NeptuneGuard Cyber Academy is not configured for this server.'
    });

    return;
  }

  const verified = await userHasVerifiedRole(interaction);

  if (!verified) {
    await interaction.editReply({
      content:
        'You need the Verified role before using NeptuneGuard Cyber Academy. Please complete server verification first.'
    });

    return;
  }

  await ensureProfile(interaction.user.id);

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
    await interaction.editReply({
      content:
        'This module belongs to Linux Fundamentals. Run `/begin path:Linux Fundamentals` first, then use `/continue`.'
    });

    return;
  }

  if (['linux-m1-lesson-complete', 'linux-m1-lab-complete'].includes(interaction.customId)) {
    const lesson = interaction.customId === 'linux-m1-lesson-complete';
    const xp = lesson ? MODULE.lessonXp : MODULE.labXp;
    const result = await markActivityComplete(interaction.user.id,
      lesson ? 'lesson_completed' : 'lab_completed', xp);
    await interaction.editReply({ content: completionMessage(result,
      lesson ? 'Lesson' : 'Lab (self-reported)', xp), components: [] });
    return;
  }

  if (interaction.customId === 'linux-m1-lesson') {
    await interaction.editReply({
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
        'Run commands only in a Linux VM, WSL installation, or system you own and are authorized to use.',
        '',
        'No XP is awarded for opening instructions. Confirm completion below.'
      ].join('\n'),
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('linux-m1-lesson-complete').setLabel('I reviewed the lesson').setStyle(ButtonStyle.Success))]
    });

    return;
  }

  if (interaction.customId === 'linux-m1-lab') {
    await interaction.editReply({
      content: [
        '## Module 01 Practice Lab',
        '',
        'Use a Linux VM, WSL, or another Linux system you own or control. This lab only creates an empty directory and an empty file in your home folder.',
        '',
        '```bash',
        'pwd',
        'mkdir -p ~/neptuneguard-lab',
        'cd ~/neptuneguard-lab',
        'touch notes.txt',
        'ls -la',
        '```',
        '',
        '### Check your understanding',
        '- `pwd` prints the directory you are currently in.',
        '- `mkdir -p` creates the practice directory if it does not exist.',
        '- `cd` changes into that directory.',
        '- `touch notes.txt` creates an empty file.',
        '- `ls -la` lists files, including hidden entries and details.',
        '',
        'No XP is awarded for opening instructions. Confirm completion below.'
      ].join('\n'),
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('linux-m1-lab-complete').setLabel('I completed the lab (self-reported)').setStyle(ButtonStyle.Success))]
    });

    return;
  }

  if (interaction.customId === 'linux-m1-quiz') {
    await updateLastActivity(interaction.user.id);

    await interaction.editReply({
      content: [
        '## Module 01 Quiz',
        '',
        '**Which command prints your current working directory?**',
        '',
        'Choose one answer below.'
      ].join('\n'),
      components: quizComponents()
    });

    return;
  }

  if (interaction.customId === 'linux-m1-hint') {
    await updateLastActivity(interaction.user.id);

    await interaction.editReply({
      content: [
        '## Module 01 Hint',
        '',
        'Think of the command name as an abbreviation:',
        '',
        '`pwd` means **print working directory**.'
      ].join('\n')
    });

    return;
  }

  if (interaction.customId === 'linux-m1-progress') {
    await updateLastActivity(interaction.user.id);

    await interaction.editReply({
      content: await getProgressSummary(interaction.user.id)
    });

    return;
  }

  if (interaction.customId.startsWith('linux-m1-answer-')) {
    const answer = interaction.customId.replace(
      'linux-m1-answer-',
      ''
    );

    if (answer !== 'b') {
      await updateLastActivity(interaction.user.id);

      await interaction.editReply({
        content: [
          '❌ Not quite.',
          '',
          '`ls` lists files, `cd` changes directories, and `mkdir` creates directories.',
          '',
          'Hint: the correct command is an abbreviation for “print working directory.”'
        ].join('\n')
      });

      return;
    }

    const result = await markActivityComplete(
      interaction.user.id,
      'quiz_completed',
      MODULE.quizXp
    );

    await interaction.editReply({
      content: [
        '✅ Correct — `pwd` means **print working directory**.',
        '',
        completionMessage(
          result,
          'Quiz',
          MODULE.quizXp
        )
      ].join('\n')
    });

    return;
  }
}

async function showCourseOverview(interaction) {
  await showAcademyCourse(interaction, pool, MODULE.courseKey);
}

async function routeCourseButton(interaction) {
  if (interaction.guildId !== config.guildId) {
    await interaction.editReply({ content: 'This academy is not configured for this server.' }); return;
  }
  if (!await userHasVerifiedRole(interaction)) {
    await interaction.editReply({ content: 'Complete server verification before using the academy.' }); return;
  }
  await ensureProfile(interaction.user.id);
  const profile = await pool.query('SELECT current_path_slug FROM learner_profiles WHERE discord_user_id=$1', [interaction.user.id]);
  if (profile.rows[0]?.current_path_slug !== MODULE.courseKey) {
    await interaction.editReply({ content: 'Run `/begin path:linux-fundamentals` first, then `/continue`.' }); return;
  }
  if (interaction.customId === 'linux-open-m1') { await showLinuxDashboard(interaction); return; }
  if (!isModuleTwoUnlocked(await getModuleProgress(interaction.user.id))) {
    await interaction.editReply({ content: 'Module 02 is locked. Complete Module 01 first.' }); return;
  }
  if (interaction.customId === 'linux-open-m2') await showModuleTwoDashboard(interaction, pool);
  else await handleModuleTwoButton(interaction, pool);
}

async function handleAcademyInteraction(interaction) {
  try {
    if (!interaction.isButton() && !interaction.isChatInputCommand()) return;
    if (interaction.isButton() && !interaction.customId.startsWith('linux-') && !interaction.customId.startsWith('academy:') && !interaction.customId.startsWith('badge-page:')) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('badge-page:')) {
  if (interaction.guildId !== config.guildId || !await userHasVerifiedRole(interaction)) {
    await interaction.editReply({ content: 'Complete verification in the configured server first.', components: [] });
    return;
  }
  const match = /^badge-page:(\d+)$/.exec(interaction.customId);
  if (!match) {
    await interaction.editReply({ content: 'Invalid badge page. Run /badges again.', components: [] });
    return;
  }
  await showBadgePage(interaction, pool, Number(match[1]));
}
else if (interaction.customId.startsWith('academy:')) {
  if (interaction.guildId !== config.guildId) {
    await interaction.editReply({ content: 'This academy is not configured for this server.', components: [] });
    return;
  }
  if (!await userHasVerifiedRole(interaction)) {
    await interaction.editReply({ content: 'Complete server verification before using the academy.', components: [] });
    return;
  }
  await handleAcademyButton(interaction, pool);
}
else if (interaction.customId.startsWith('linux-m1-')) await handleLinuxButton(interaction);
      else await routeCourseButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.guildId !== config.guildId) {
      await interaction.editReply({
        content:
          'NeptuneGuard Cyber Academy is not configured for this server.'
      });

      return;
    }

    const verified = await userHasVerifiedRole(interaction);

    if (!verified) {
      await interaction.editReply({
        content:
          'You need the Verified role before using NeptuneGuard Cyber Academy. Please complete server verification first.',
        flags: MessageFlags.Ephemeral
      });

      return;
    }

    if (interaction.commandName === 'start') {
      await ensureProfile(interaction.user.id);

      await replyStudentStart(interaction, {
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
        ].join('\n')
      });

      return;
    }

    if (interaction.commandName === 'catalog') {
      await interaction.editReply({
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
        ].join('\n')
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

      const nextStep = getCourse(path)
        ? 'Use `/continue` to open your selected course overview.'
        : 'Modules for this path will be added in a future build.';

      await interaction.editReply({
        content: [
          '## Learning path started',
          '',
          `You started: \`${path}\``,
          '',
          nextStep,
          'Use `/progress` to view your saved path.'
        ].join('\n')
      });

      return;
    }

    if (interaction.commandName === 'progress') {
  await interaction.editReply({ content: await buildLearnerReport(pool, interaction.user.id), allowedMentions: { parse: [] } });
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
        await interaction.editReply({
          content:
            'Run `/begin` and choose a learning path first.'
        });

        return;
      }

      if (getCourse(currentPath)) {
        await updateLastActivity(interaction.user.id);
        await showAcademyCourse(interaction, pool, currentPath);
        return;
      }

      await interaction.editReply({
        content:
          `You are currently enrolled in \`${currentPath}\`. Modules for this path will be added in a future build.`
      });

      return;
    }

    if (interaction.commandName === 'badges') {
  await showBadgePage(interaction, pool);
  return;
}

if (interaction.commandName === 'student-progress') {
  if (!interaction.memberPermissions?.has('ManageGuild')) {
    await interaction.editReply({ content: 'You need Manage Server permission to view another learner progress.' });
    return;
  }
  const targetUser = interaction.options.getUser('member', true);
  await interaction.editReply({
    content: await buildLearnerReport(pool, targetUser.id, 'Learner Progress'),
    allowedMentions: { parse: [] }
  });
  return;
}
} catch (error) {
    console.error('Interaction error:', { name: error?.name, code: error?.code });

    if (interaction.isRepliable()) {
      const reply = {
        content:
          'NeptuneGuard encountered an error. Please contact an academy administrator.',
        flags: MessageFlags.Ephemeral
      };

      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: reply.content, components: [] }).catch(() => {});
      } else if (interaction.replied) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}

const application = createAcademyApplication({
  client, pool, guildId: config.guildId, initializeDatabase,
  handleInteraction: handleAcademyInteraction
});
void application.start(process.env.DISCORD_TOKEN);
