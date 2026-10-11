import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MODULE_TWO as M } from './course-content.js';

const defaults = () => ({ lesson_completed: false, lab_completed: false,
  quiz_completed: false, quiz_score: 0, xp_earned: 0, completed_at: null });
const button = (id, label, style = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(`linux-m2-${id}`).setLabel(label).setStyle(style);
const row = (...buttons) => new ActionRowBuilder().addComponents(...buttons);

export function moduleTwoComponents() {
  return [row(button('lesson', 'Start Lesson', ButtonStyle.Primary),
    button('lab', 'Practice Lab', ButtonStyle.Success),
    button('quiz', 'Take Quiz', ButtonStyle.Primary)),
  row(button('hint', 'View Hint'), button('progress', 'My Progress'))];
}

export async function getModuleTwoProgress(pool, userId) {
  const result = await pool.query(`SELECT * FROM learner_module_progress
    WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3`,
  [userId, M.courseKey, M.number]);
  return result.rows[0] ?? defaults();
}

async function award(pool, userId, activity) {
  const activities = { lesson_completed: M.lessonXp,
    lab_completed: M.labXp, quiz_completed: M.quizXp };
  if (!Object.hasOwn(activities, activity)) throw new Error('Invalid activity');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const prerequisite = await db.query(`SELECT completed_at
      FROM learner_module_progress WHERE discord_user_id=$1
      AND course_key=$2 AND module_number=$3 FOR SHARE`,
    [userId, M.courseKey, M.prerequisiteModuleNumber]);
    if (!prerequisite.rows[0]?.completed_at) {
      throw new Error('Module 01 must be complete before Module 02.');
    }
    await db.query(`INSERT INTO learner_profiles (discord_user_id)
      VALUES ($1) ON CONFLICT (discord_user_id) DO NOTHING`, [userId]);
    await db.query(`INSERT INTO learner_module_progress
      (discord_user_id, course_key, module_number) VALUES ($1,$2,$3)
      ON CONFLICT (discord_user_id, course_key, module_number) DO NOTHING`,
    [userId, M.courseKey, M.number]);
    const result = await db.query(`SELECT * FROM learner_module_progress
      WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 FOR UPDATE`,
    [userId, M.courseKey, M.number]);
    const previous = result.rows[0];
    const completedNow = !previous[activity];
    let moduleCompletedNow = false;
    if (completedNow) {
      const updated = await db.query(`UPDATE learner_module_progress
        SET ${activity}=TRUE, xp_earned=xp_earned+$4,
        quiz_score=CASE WHEN $5 THEN 100 ELSE quiz_score END
        WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3
        RETURNING *`,
      [userId, M.courseKey, M.number, activities[activity], activity === 'quiz_completed']);
      const p = updated.rows[0];
      if (p.lesson_completed && p.lab_completed && p.quiz_completed && !p.completed_at) {
        await db.query(`UPDATE learner_module_progress SET completed_at=NOW()
          WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3`,
        [userId, M.courseKey, M.number]);
        await db.query(`INSERT INTO learner_badges
          (discord_user_id,badge_key,badge_name) VALUES ($1,$2,$3)
          ON CONFLICT (discord_user_id,badge_key) DO NOTHING`,
        [userId, M.badgeKey, M.badgeName]);
        moduleCompletedNow = true;
      }
      await db.query(`UPDATE learner_profiles SET total_xp=total_xp+$2,
        last_activity_at=NOW() WHERE discord_user_id=$1`, [userId, activities[activity]]);
    } else {
      await db.query(`UPDATE learner_profiles SET last_activity_at=NOW()
        WHERE discord_user_id=$1`, [userId]);
    }
    await db.query('COMMIT');
    return { completedNow, moduleCompletedNow, xp: activities[activity] };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

export async function showModuleTwoDashboard(interaction, pool) {
  const p = await getModuleTwoProgress(pool, interaction.user.id);
  await interaction.editReply({ content: `## Module 02 — ${M.title}\n\n${M.overview}\n\nProgress: ${p.xp_earned}/100 XP`,
    components: moduleTwoComponents() });
}

// Caller must defer the interaction, check guild/role/path, and enforce
// the Module 01 prerequisite before calling this handler, including read actions.
export async function handleModuleTwoButton(interaction, pool) {
  const prefix = 'linux-m2-';
  if (!interaction.customId.startsWith(prefix)) return false;
  const action = interaction.customId.slice(prefix.length);
  let content;
  let components = [];
  if (action === 'lesson') {
    content = [`## Module 02 — ${M.title}`, '', '### Learning objectives',
      ...M.learningObjectives.map(x => `- ${x}`), '',
      ...M.keyIdeas.map(x => `### ${x.title}\n${x.text}`), '',
      'These are command examples, not a setup sequence. Use the Practice Lab for the ordered commands.',
      '```bash', ...M.lessonCommands, '```', '',
      'Reading this page does not award XP. Confirm after reviewing the lesson.'].join('\n');
    components = [row(button('lesson-complete', 'I reviewed the lesson', ButtonStyle.Success))];
  } else if (action === 'lab') {
    content = [`## ${M.lab.title}`, '', M.lab.safetyNotice,
      'Use the named practice directory only for this lab. The write command replaces notes.txt if it already exists.',
      '', '```bash', ...M.lab.commands, '```', '', '### Check your work',
      ...M.lab.checks.map(x => `- ${x}`), '',
      'Completion is self-reported. The bot cannot inspect your computer.'].join('\n');
    components = [row(button('lab-complete', 'I completed the lab (self-reported)', ButtonStyle.Success))];
  } else if (action === 'quiz') {
    content = `## Module 02 Quiz\n\n${M.quiz.question}`;
    components = [row(...M.quiz.answers.map(a => button(`answer-${a.id}`, a.label)))];
  } else if (action === 'hint') {
    content = `## Module 02 Hint\n\n${M.hint}`;
  } else if (action === 'progress') {
    const p = await getModuleTwoProgress(pool, interaction.user.id);
    content = [`## Module 02 Progress`, `Lesson: ${p.lesson_completed ? 'Complete' : 'Not completed'}`,
      `Lab (self-reported): ${p.lab_completed ? 'Complete' : 'Not completed'}`,
      `Quiz: ${p.quiz_completed ? 'Passed' : 'Not passed'}`,
      `XP: ${p.xp_earned}/100`, `Status: ${p.completed_at ? 'Complete' : 'In progress'}`].join('\n');
  } else {
    let activity;
    if (action === 'lesson-complete') activity = 'lesson_completed';
    else if (action === 'lab-complete') activity = 'lab_completed';
    else if (action.startsWith('answer-')) {
      const answer = M.quiz.answers.find(a => a.id === action.slice(7));
      if (!answer) content = 'Unknown quiz answer. Open the quiz again.';
      else if (!answer.correct) content = `Not quite. ${M.quiz.incorrectExplanation}`;
      else activity = 'quiz_completed';
    }
    if (activity) {
      const r = await award(pool, interaction.user.id, activity);
      content = r.completedNow ? `Completion recorded. You earned ${r.xp} XP.`
        : 'Already completed. No additional XP was awarded.';
      if (activity === 'quiz_completed') content = `${M.quiz.correctExplanation}\n\n${content}`;
      if (r.moduleCompletedNow) content += `\n\nModule 02 complete! Badge earned: ${M.badgeName}.`;
    }
    content ??= 'Unknown Module 02 action. Open the course dashboard again.';
  }
  await interaction.editReply({ content, components });
  return true;
}
