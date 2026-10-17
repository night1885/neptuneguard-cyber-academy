import { getCourse } from './course-registry.js';
import { getStudentCourseModule, validPracticeQuiz } from './certification-student-course-content.js';

const footer = 'Read-only learning: the application does not save progress or quiz results, or award XP, badges, or certificates.';
const missing = 'Teaching text for this view is not available in the reviewed data source. Contact the academy admin. No legacy activity handler was opened.';
const text = value => typeof value === 'string' ? value : '';
const texts = value => Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
const row = buttons => ({ type: 1, components: buttons });
function pages(value) {
  const result = []; let rest = value || missing;
  while (rest.length > 3500) {
    let cut = rest.lastIndexOf('\n', 3500); if (cut < 1000) cut = 3500;
    result.push(rest.slice(0, cut)); rest = rest.slice(cut); if (rest.startsWith('\n')) rest = rest.slice(1);
  }
  result.push(rest || missing); return result;
}

export function renderStudentCoursePage({ courseKey, cursor, buttonId } = {}) {
  const course = getCourse(courseKey);
  const match = typeof cursor === 'string' && /^(overview|module|lesson|lab|hint|quiz|answer):([0-9]{1,4}):([0-9]{1,4})(?::([a-z0-9-]{1,16}))?$/.exec(cursor);
  if (!course || !match || typeof buttonId !== 'function') throw new Error('Registered course and valid renderer cursor required');
  const [, view, indexText, pageText, answerId] = match, index = Number(indexText), page = Number(pageText);
  if ((view === 'answer') !== Boolean(answerId)) throw new Error('Unexpected practice answer cursor');
  const button = (next, label) => {
    const id = buttonId(next); if (typeof id !== 'string' || id.length > 100) throw new Error('Invalid bound course control');
    return { type: 2, style: 2, custom_id: id, label: String(label).slice(0, 80) };
  };
  const embed = { color: 0x3498db, title: course.title.slice(0, 256), description: '', footer: { text: footer } };
  const components = [];
  if (view === 'overview') {
    if (index !== 0) throw new Error('Invalid course overview cursor');
    const total = Math.max(1, Math.ceil(course.modules.length / 5));
    if (page >= total) throw new Error('Invalid course overview page');
    const modules = course.modules.slice(page * 5, page * 5 + 5);
    embed.description = [`Course contents — page ${page + 1}/${total}.`, 'Browse teaching material without saving activity. Course completion is confirmed separately by the admin.',
      ...modules.map(module => `Module ${module.number}: ${module.title}`)].join('\n').slice(0, 3500);
    if (modules.length) components.push(row(modules.map((module, offset) => button(`module:${page * 5 + offset}:0`, `Module ${module.number}`))));
    const navigation = [];
    if (page > 0) navigation.push(button(`overview:0:${page - 1}`, 'Previous modules'));
    navigation.push(button(`overview:0:${page}`, 'Refresh contents'));
    if (page + 1 < total) navigation.push(button(`overview:0:${page + 1}`, 'Next modules'));
    components.push(row(navigation));
  } else {
    const module = getStudentCourseModule(courseKey, index);
    if (!module) throw new Error('Invalid curriculum module');
    embed.title = `${course.title} — Module ${module.number}: ${module.title}`.slice(0, 256);
    if (view === 'module') {
      if (page !== 0) throw new Error('Invalid module overview page');
      const suggested = module.prerequisiteModuleNumber == null ? '' : `Suggested prior module: ${module.prerequisiteModuleNumber}. This viewer does not track or certify prerequisite completion.`;
      embed.description = [text(module.overview) || missing, suggested, ...texts(module.learningObjectives).map(value => `• ${value}`)].filter(Boolean).join('\n').slice(0, 3500);
      components.push(row(['lesson', 'lab', 'hint', 'quiz'].map(kind => button(`${kind}:${index}:0`, kind === 'quiz' ? 'Practice question' : kind === 'lab' ? 'Practice instructions' : kind[0].toUpperCase() + kind.slice(1)))));
      const navigation = [button(`overview:0:${Math.floor(index / 5)}`, 'Course contents')];
      if (index > 0) navigation.push(button(`module:${index - 1}:0`, 'Previous module'));
      if (index + 1 < course.modules.length) navigation.push(button(`module:${index + 1}:0`, 'Next module'));
      components.push(row(navigation));
    } else {
      let body = '', quiz = validPracticeQuiz(module.quiz) ? module.quiz : null;
      if (view === 'lesson') {
        body = [text(module.overview), ...texts(module.learningObjectives).map(value => `• ${value}`),
          ...(Array.isArray(module.keyIdeas) ? module.keyIdeas.flatMap(idea => [text(idea.title), text(idea.text)]) : []),
          ...(texts(module.lessonCommands).length ? ['Command examples:', ...texts(module.lessonCommands)] : [])].filter(Boolean).join('\n\n');
      } else if (view === 'lab') {
        const safety = text(module.lab?.safetyNotice);
        body = safety && texts(module.lab?.commands).length ? ['Practice instructions only: this page does not authorize testing or start a lab. Follow required lab-specific authorization and safety rules.',
          text(module.lab?.title), safety, 'Practice commands:', ...texts(module.lab.commands), 'Check your work:', ...texts(module.lab.checks)].filter(Boolean).join('\n\n') : missing;
      } else if (view === 'hint') body = text(module.hint);
      else if (view === 'quiz') body = quiz ? ['Practice question — feedback only; no result is saved.', quiz.question, ...quiz.answers.map(answer => answer.label)].join('\n\n') : missing;
      else if (view === 'answer') {
        const answer = quiz?.answers.find(value => value.id === answerId);
        if (!answer) throw new Error('Invalid practice answer');
        body = [answer.correct ? 'Correct for this practice question.' : 'Not quite for this practice question.',
          text(answer.correct ? quiz.correctExplanation : quiz.incorrectExplanation), 'This feedback is not a saved grade, completion record, certificate, or independent proof of understanding.'].filter(Boolean).join('\n\n');
      }
      const chunks = pages(body); if (page >= chunks.length) throw new Error('Invalid teaching content page');
      embed.description = chunks[page];
      if (view === 'quiz' && quiz) components.push(row(quiz.answers.map(answer => button(`answer:${index}:0:${answer.id}`, `Choose ${answer.id.toUpperCase()}`))));
      const suffix = view === 'answer' ? `:${answerId}` : '';
      const navigation = [button(`module:${index}:0`, 'Module overview'), button(`overview:0:${Math.floor(index / 5)}`, 'Course contents')];
      if (page > 0) navigation.push(button(`${view}:${index}:${page - 1}${suffix}`, 'Previous content'));
      if (page + 1 < chunks.length) navigation.push(button(`${view}:${index}:${page + 1}${suffix}`, 'Next content'));
      if (view === 'answer') navigation.push(button(`quiz:${index}:0`, 'Practice question'));
      components.push(row(navigation));
    }
  }
  return { content: '', embeds: [embed], components, allowedMentions: { parse: [] } };
}
