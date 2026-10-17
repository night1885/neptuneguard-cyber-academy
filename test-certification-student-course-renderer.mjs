import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COURSES } from './course-registry.js';
import { getStudentCourseModule, validPracticeQuiz, studentCourseContentGaps } from './certification-student-course-content.js';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';

const prefix = 'cert:course:page:12345678-1234-1234-1234-123456789abc:';
const render = (courseKey, cursor) => renderStudentCoursePage({ courseKey, cursor, buttonId: value => prefix + value });
function bounded(payload) {
  assert.equal(payload.content, ''); assert.equal(payload.embeds.length, 1); assert.ok(payload.components.length <= 5);
  const embed = payload.embeds[0]; assert.ok(embed.title.length <= 256 && embed.description.length <= 3500);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  for (const row of payload.components) {
    assert.equal(row.type, 1); assert.ok(row.components.length > 0 && row.components.length <= 5);
    for (const button of row.components) { assert.ok(button.custom_id.startsWith(prefix)); assert.ok(button.custom_id.length <= 100); assert.ok(button.label.length <= 80); assert.equal(button.url, undefined); }
  }
}

test('data-only Module 1 bridge restores teaching without mutating registry metadata', () => {
  const before = JSON.stringify(COURSES);
  const module = getStudentCourseModule('linux-fundamentals', 0);
  assert.ok(module.learningObjectives.length && module.lab.commands.length && validPracticeQuiz(module.quiz));
  assert.ok(render('linux-fundamentals', 'lesson:0:0').embeds[0].description.includes('terminal'));
  assert.ok(!studentCourseContentGaps().some(gap => gap.courseKey === 'linux-fundamentals' && gap.moduleNumber === 1));
  assert.equal(JSON.stringify(COURSES), before);
});

test('every registered module renders bounded whitelisted teaching views without registry mutation', () => {
  const before = JSON.stringify(COURSES);
  for (const course of COURSES) {
    for (let page = 0; page < Math.max(1, Math.ceil(course.modules.length / 5)); page++) bounded(render(course.key, `overview:0:${page}`));
    for (let index = 0; index < course.modules.length; index++) {
      for (const kind of ['module', 'lesson', 'lab', 'hint', 'quiz']) bounded(render(course.key, `${kind}:${index}:0`));
      const module = getStudentCourseModule(course.key, index);
      if (validPracticeQuiz(module.quiz)) for (const answer of module.quiz.answers) bounded(render(course.key, `answer:${index}:0:${answer.id}`));
    }
  }
  assert.equal(JSON.stringify(COURSES), before);
});

test('practice previews expose question and labels but not correctness metadata or explanations', () => {
  const payload = render('linux-fundamentals', 'quiz:0:0'), serialized = JSON.stringify(payload);
  assert.ok(payload.embeds[0].description.includes('Which command'));
  assert.ok(!serialized.includes('"correct"')); assert.ok(!serialized.includes('Correct for this practice question.'));
  assert.ok(!serialized.includes('pwd means print working directory.'));
  assert.ok(render('linux-fundamentals', 'answer:0:0:b').embeds[0].description.includes('Correct for this practice question.'));
  assert.ok(render('linux-fundamentals', 'answer:0:0:a').embeds[0].description.includes('Not quite'));
});

test('malformed, cross-view, out-of-range, and unknown-answer cursors are rejected', () => {
  for (const cursor of ['unknown:0:0', 'module:9999:0', 'module:0:1', 'overview:1:0', 'overview:0:9999', 'lesson:0:9999', 'lesson:0:0:a', 'answer:0:0', 'answer:0:0:unknown', 'module:-1:0']) {
    assert.throws(() => render('linux-fundamentals', cursor));
  }
  assert.throws(() => render('unknown-course', 'overview:0:0'));
});

test('content-gap reporting identifies structure without claiming all curriculum is complete', () => {
  const gaps = studentCourseContentGaps(); assert.ok(Array.isArray(gaps));
  for (const gap of gaps) { assert.ok(COURSES.some(course => course.key === gap.courseKey)); assert.ok(gap.missing.length > 0); assert.ok(gap.missing.every(field => typeof field === 'string')); }
  assert.equal(validPracticeQuiz({ question: 'Fixture', answers: [{ id: 'a', label: 'A', correct: true }, { id: 'a', label: 'B', correct: false }] }), false);
});

test('renderer and bridge do not import database, progress writers, or executable legacy handlers', async () => {
  for (const file of ['certification-student-course-renderer.js', 'certification-student-course-content.js']) {
    const source = await readFile(new URL(`./${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from ['"](?:pg|.*(?:module-progress|academy-handler|index\.js))['"]/);
    assert.doesNotMatch(source, /\b(?:INSERT INTO|UPDATE learner_|DELETE FROM)\b/);
  }
});
