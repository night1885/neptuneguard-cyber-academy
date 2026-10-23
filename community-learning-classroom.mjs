import { COMMUNITY_COURSES } from './community-learning-policy.mjs';
const allowed = new Set(COMMUNITY_COURSES);
const button = (custom_id, label, disabled = false) => ({ type: 2, style: 2, custom_id, label: String(label).slice(0, 80), disabled });
const row = components => ({ type: 1, components });
const control = (key, number, action, label, disabled = false) => button(`academy:${key}:${number}:${action}`, label, disabled);
const chunks = text => { const parts = []; for (let n = 0; n < text.length; n += 3000) parts.push(text.slice(n, n + 3000)); return parts.length ? parts : ['No teaching text available.']; };
export function createCommunityClassroom({ getCourse, getModule, getCourseProgress, defaultProgress, isModuleUnlocked, completeActivity } = {}) {
  if ([getCourse, getModule, getCourseProgress, defaultProgress, isModuleUnlocked, completeActivity].some(fn => typeof fn !== 'function')) throw new Error('Trusted community curriculum and progress helpers required');
  const send = (i, title, description, components = []) => i.editReply({ content: '', embeds: [{ title: String(title).slice(0, 256), description: String(description).slice(0, 4000),
    footer: { text: 'Community learning: practice completion is self-reported; XP and badges are not formal-course awards or restricted-lab authorization.' } }], components, allowedMentions: { parse: [] } });
  const selected = async (pool, actor, key) => {
    const { rows } = await pool.query('SELECT current_path_slug FROM learner_profiles WHERE discord_user_id=$1', [actor]);
    return rows.length === 1 && rows[0].current_path_slug === key;
  };
  // Call only after the community router has deferred and freshly verified the server, actor and role.
  async function showCourse(i, pool, key, page = 0) {
    const course = allowed.has(key) && getCourse(key);
    if (!course || !await selected(pool, i.user.id, key)) return send(i, 'Community learning', 'Select the matching Linux community path with /begin first.');
    const total = Math.max(1, Math.ceil(course.modules.length / 5));
    if (!Number.isInteger(page) || page < 0 || page >= total) return send(i, 'Community learning', 'Invalid course page. Run /continue again.');
    const progress = await getCourseProgress(pool, i.user.id, key), visible = course.modules.slice(page * 5, page * 5 + 5);
    const lines = visible.map(m => { const p = progress.get(m.number) ?? defaultProgress(); return `Module ${m.number}: ${m.title} — ${!isModuleUnlocked(m, progress) ? 'Locked' : p.completed_at ? 'Complete' : 'Available'}; ${p.xp_earned} XP`; });
    const controls = [row(visible.map(m => control(key, m.number, 'open', `Module ${m.number}`, !isModuleUnlocked(m, progress))))];
    if (total > 1) controls.push(row([control(key, 0, `course:${page - 1}`, 'Previous', page === 0), control(key, 0, `course:${page + 1}`, 'Next', page + 1 === total)]));
    return send(i, course.title, `Community course — page ${page + 1}/${total}\n\n` + lines.join('\n'), controls);
  }
  async function handleActivity(i, pool) {
    const match = /^academy:([a-z-]+):(\d{1,6}):(.+)$/.exec(i.customId || '');
    if (!match || !allowed.has(match[1])) { await send(i, 'Community learning', 'This community course action is unavailable.'); return true; }
    const [, key, numberText, action] = match;
    if (!getCourse(key) || !await selected(pool, i.user.id, key)) { await send(i, 'Community learning', 'Select the matching Linux community path with /begin first.'); return true; }
    if (/^course:\d{1,6}$/.test(action)) { await showCourse(i, pool, key, Number(action.split(':')[1])); return true; }
    const m = getModule(key, Number(numberText));
    if (!m) { await send(i, 'Community learning', 'Unknown module. Run /continue again.'); return true; }
    const progress = await getCourseProgress(pool, i.user.id, key);
    if (!isModuleUnlocked(m, progress)) { await send(i, 'Module locked', `Complete Module ${m.prerequisiteModuleNumber} first.`); return true; }
    const p = progress.get(m.number) ?? defaultProgress(), title = `${getCourse(key).title} — Module ${m.number}: ${m.title}`;
    const c = (next, label) => control(key, m.number, next, label);
    const back = () => row([c('open', 'Module overview'), control(key, 0, `course:${Math.floor(getCourse(key).modules.findIndex(x => x.number === m.number) / 5)}`, 'Course contents')]);
    let body, components = [];
    if (action === 'open') {
      body = `${m.overview}\n\n${p.xp_earned}/${m.lessonXp + m.labXp + m.quizXp} community XP`;
      components = [row([c('lesson:0', 'Lesson'), c('lab:0', 'Practice Lab'), c('quiz', 'Quiz')]), row([c('hint', 'Hint'), c('progress', 'Progress')])];
    } else if (/^(lesson|lab):\d{1,6}$/.test(action)) {
      const [kind, rawPage] = action.split(':'), page = Number(rawPage);
      const text = kind === 'lesson' ? [...m.learningObjectives, ...m.keyIdeas.flatMap(x => [x.title, x.text]), 'Command examples:', ...m.lessonCommands].join('\n\n')
        : ['Use only your own or explicitly authorized practice environment. This is not authorization for restricted labs.', m.lab.safetyNotice, ...m.lab.commands, 'Check your work:', ...m.lab.checks, 'Lab completion is self-reported.'].join('\n\n');
      const parts = chunks(text);
      if (page >= parts.length) { await send(i, title, 'Invalid activity page. Reopen the module.'); return true; }
      body = `Page ${page + 1}/${parts.length}\n\n${parts[page]}`;
      const navigation = [];
      if (page > 0) navigation.push(c(`${kind}:${page - 1}`, 'Previous'));
      if (page + 1 < parts.length) navigation.push(c(`${kind}:${page + 1}`, 'Next'));
      else navigation.push(c(`${kind}-complete`, kind === 'lab' ? 'Lab complete (self-reported)' : 'I reviewed the lesson'));
      components = [row(navigation), back()];
    } else if (action === 'quiz') { body = m.quiz.question; components = [row(m.quiz.answers.map(a => c(`answer-${a.id}`, a.label))), back()]; }
    else if (action === 'hint') { body = m.hint; components = [back()]; }
    else if (action === 'progress') { body = `Lesson: ${p.lesson_completed ? 'Complete' : 'Not complete'}\nLab (self-reported): ${p.lab_completed ? 'Complete' : 'Not complete'}\nQuiz: ${p.quiz_completed ? 'Passed' : 'Not passed'}\nCommunity XP: ${p.xp_earned}`; components = [back()]; }
    else {
      let activity, explanation = '';
      if (action === 'lesson-complete') activity = 'lesson_completed';
      else if (action === 'lab-complete') activity = 'lab_completed';
      else if (/^answer-[a-z0-9-]{1,16}$/.test(action)) {
        const answer = m.quiz.answers.find(a => a.id === action.slice(7));
        if (!answer) body = 'Unknown answer. Reopen the quiz.';
        else if (!answer.correct) body = 'Not quite. ' + m.quiz.incorrectExplanation;
        else { activity = 'quiz_completed'; explanation = m.quiz.correctExplanation + '\n\n'; }
      }
      if (activity) {
        const result = await completeActivity(pool, i.user.id, m, activity);
        body = explanation + (result.completedNow ? `Recorded ${result.xp} community XP.` : 'Already complete. No additional XP awarded.');
        if (result.moduleCompletedNow) body += `\nCommunity module complete. Badge: ${m.badgeName}`;
      }
      body ??= 'Unknown action. Reopen the module.'; components = [back()];
    }
    await send(i, title, body, components); return true;
  }
  return Object.freeze({ showCourse, handleActivity });
}
