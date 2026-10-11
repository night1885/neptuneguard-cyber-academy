import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getCourse, getModule } from './course-registry.js';
import { getCourseProgress, defaultProgress, isModuleUnlocked, completeActivity } from './module-progress.js';

const row = (...buttons) => new ActionRowBuilder().addComponents(...buttons);
const button = (id, label, disabled = false) => new ButtonBuilder()
  .setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const prefix = (course, number) => `academy:${course}:${number}:`;

// The caller MUST defer the interaction and verify the configured guild and
// Verified role BEFORE invoking either exported handler. These functions also
// verify enrollment and prerequisites. They never acknowledge an interaction.
async function enrolled(pool, userId, key) {
  const result = await pool.query('SELECT current_path_slug FROM learner_profiles WHERE discord_user_id=$1', [userId]);
  return result.rows[0]?.current_path_slug === key;
}
async function send(interaction, content, components = []) {
  if (content.length > 2000) throw new Error('Rendered message exceeds Discord content limit');
  return interaction.editReply({ content, components, allowedMentions: { parse: [] } });
}
function pages(lines) {
  const result = []; let current = '';
  for (const line of lines) {
    // Render lines as plain text so splitting cannot leave unmatched code fences.
    for (let offset = 0; offset < Math.max(1, line.length); offset += 1600) {
      const part = line.slice(offset, offset + 1600);
      if ((current + '\n' + part).length > 1700) { result.push(current); current = ''; }
      current += (current ? '\n' : '') + part;
    }
  }
  if (current || !result.length) result.push(current);
  return result;
}
function activityPages(module, kind) {
  if (kind === 'lesson') return pages([
    ...module.learningObjectives.map(x => `• ${x}`), '',
    ...module.keyIdeas.flatMap(x => [x.title, x.text, '']),
    'Command examples (use the lab for an ordered setup sequence):',
    ...module.lessonCommands,
    '', 'Review every page before confirming. Opening a lesson awards no XP.'
  ]);
  return pages([module.lab.safetyNotice, '', 'Practice commands:',
    ...module.lab.commands, '', 'Check your work:',
    ...module.lab.checks.map(x => `• ${x}`), '',
    'Completion is self-reported; the bot cannot inspect your computer.'
  ]);
}

export async function showAcademyCourse(interaction, pool, key, page = 0) {
  const course = getCourse(key);
  if (!course) return send(interaction, 'This course is not implemented yet.');
  if (!await enrolled(pool, interaction.user.id, key))
    return send(interaction, `Select this path with /begin first: ${key}`);
  const progress = await getCourseProgress(pool, interaction.user.id, key);
  const count = Math.max(1, Math.ceil(course.modules.length / 5));
  if (!Number.isInteger(page) || page < 0 || page >= count)
    return send(interaction, 'Invalid course page. Run /continue again.');
  const visible = course.modules.slice(page * 5, page * 5 + 5);
  const lines = [`## ${course.title}`, `Page ${page + 1}/${count}`, ''];
  for (const module of visible) {
    const p = progress.get(module.number) ?? defaultProgress();
    const state = !isModuleUnlocked(module, progress) ? 'Locked' : p.completed_at ? 'Complete' : p.xp_earned ? 'In progress' : 'Not started';
    lines.push(`Module ${module.number} — ${module.title}`, `${state} · ${p.xp_earned}/${module.lessonXp + module.labXp + module.quizXp} XP`, '');
  }
  const controls = [row(...visible.map(m => button(key === 'linux-fundamentals' && m.number <= 2 ? `linux-open-m${m.number}` : prefix(key, m.number) + 'open',
    `Module ${m.number}`, !isModuleUnlocked(m, progress))))];
  if (count > 1) controls.push(row(
    button(prefix(key, 0) + `course:${page - 1}`, 'Previous', page === 0),
    button(prefix(key, 0) + `course:${page + 1}`, 'Next', page === count - 1)));
  return send(interaction, lines.join('\n'), controls);
}

export async function handleAcademyButton(interaction, pool) {
  const match = /^academy:([a-z-]+):(\d+):(.+)$/.exec(interaction.customId);
  if (!match) return false;
  const [, key, numberText, action] = match;
  const course = getCourse(key);
  if (!course || !await enrolled(pool, interaction.user.id, key)) {
    await send(interaction, 'Select the matching learning path with /begin first.'); return true;
  }
  if (/^course:\d+$/.test(action)) {
    await showAcademyCourse(interaction, pool, key, Number(action.split(':')[1])); return true;
  }
  const module = getModule(key, Number(numberText));
  if (!module) { await send(interaction, 'Unknown module. Run /continue again.'); return true; }
  const all = await getCourseProgress(pool, interaction.user.id, key);
  if (!isModuleUnlocked(module, all)) {
    await send(interaction, `Complete Module ${module.prerequisiteModuleNumber} first.`); return true;
  }
  const p = all.get(module.number) ?? defaultProgress();
  const id = prefix(key, module.number);
  let content; let components = [];
  if (action === 'open') {
    if (!module.learningObjectives || !module.lab || !module.quiz) {
      await send(interaction, 'This module still uses its legacy handler. Run /continue.'); return true;
    }
    content = `## Module ${module.number} — ${module.title}\n${module.overview}\nXP: ${p.xp_earned}/${module.lessonXp + module.labXp + module.quizXp}`;
    components = [row(button(id + 'lesson:0', 'Lesson'), button(id + 'lab:0', 'Practice Lab'), button(id + 'quiz', 'Quiz')),
      row(button(id + 'hint', 'Hint'), button(id + 'progress', 'Progress'))];
  } else if (/^(lesson|lab):\d+$/.test(action)) {
    const [kind, pageText] = action.split(':'); const page = Number(pageText);
    const parts = activityPages(module, kind);
    if (page >= parts.length) { await send(interaction, 'Invalid activity page. Reopen the module.'); return true; }
    content = `## Module ${module.number} ${kind} — ${page + 1}/${parts.length}\n\n${parts[page]}`;
    const navigation = [];
    if (page > 0) navigation.push(button(id + `${kind}:${page - 1}`, 'Previous'));
    if (page < parts.length - 1) navigation.push(button(id + `${kind}:${page + 1}`, 'Next'));
    else navigation.push(button(id + `${kind}-complete`, kind === 'lab' ? 'Lab complete (self-reported)' : 'I reviewed the lesson'));
    components = [row(...navigation)];
  } else if (action === 'quiz') {
    content = `## Module ${module.number} Quiz\n${module.quiz.question}`;
    components = [row(...module.quiz.answers.map(a => button(id + `answer-${a.id}`, a.label)))];
  } else if (action === 'hint') content = module.hint;
  else if (action === 'progress') content = [
    `## Module ${module.number} Progress`, `Lesson: ${p.lesson_completed ? 'Complete' : 'Not completed'}`,
    `Lab (self-reported): ${p.lab_completed ? 'Complete' : 'Not completed'}`,
    `Quiz: ${p.quiz_completed ? 'Passed' : 'Not passed'}`, `XP: ${p.xp_earned}`,
    `Status: ${p.completed_at ? 'Complete' : 'In progress'}`].join('\n');
  else {
    let activity; let explanation = '';
    if (action === 'lesson-complete') activity = 'lesson_completed';
    else if (action === 'lab-complete') activity = 'lab_completed';
    else if (action.startsWith('answer-')) {
      const answer = module.quiz.answers.find(a => a.id === action.slice(7));
      if (!answer) content = 'Unknown answer. Reopen the quiz.';
      else if (!answer.correct) content = `Not quite. ${module.quiz.incorrectExplanation}`;
      else { activity = 'quiz_completed'; explanation = module.quiz.correctExplanation + '\n\n'; }
    }
    if (activity) {
      const result = await completeActivity(pool, interaction.user.id, module, activity);
      content = explanation + (result.completedNow ? `Recorded: ${result.xp} XP earned.` : 'Already complete. No additional XP awarded.');
      if (result.moduleCompletedNow) content += `\nModule complete! Badge: ${module.badgeName}`;
    }
    content ??= 'Unknown action. Reopen the module.';
  }
  await send(interaction, content, components); return true;
}
