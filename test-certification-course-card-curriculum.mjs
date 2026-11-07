import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from './course-registry.js';
import { getStudentCourseModule, validPracticeQuiz } from './certification-student-course-content.js';
import { renderStudentCoursePage } from './certification-student-course-renderer.js';
import { academyCardPayload } from './academy-course-card-ui.mjs';

const prefix = 'cert:course:page:12345678-1234-1234-1234-123456789abc:';
const flatten = items => items.flatMap(item => [item, ...(item.components ? flatten(item.components) : [])]);
const missingText = 'Teaching text for this view is not available in the reviewed data source.';

export function auditCourseCards(course, { render = renderStudentCoursePage, convert = academyCardPayload } = {}) {
  const pending = ['overview:0:0'], queued = new Set(pending), seen = new Set();
  const summary = { courseKey: course.key, modules: course.modules.length, views: 0, maxComponents: 0, maxTextCharacters: 0, unavailableTeachingViews: 0 };
  const sourceSnapshot = JSON.stringify(COURSES);
  while (pending.length) {
    const cursor = pending.shift(), label = `${course.key}/${cursor}`;
    assert.ok(seen.size < 10000, `${label}: bounded traversal`);
    seen.add(cursor);
    const legacy = render({ courseKey: course.key, cursor, buttonId: next => prefix + next });
    const snapshot = JSON.stringify(legacy);
    let card;
    assert.doesNotThrow(() => { card = convert(legacy); }, `${label}: V2 conversion`);
    assert.equal(JSON.stringify(legacy), snapshot, `${label}: conversion must not mutate its input`);
    assert.equal(card.flags, 32768, `${label}: V2 format required`);
    assert.ok(!('content' in card) && !('embeds' in card), `${label}: no mixed legacy fields`);
    assert.deepEqual(card.allowedMentions, { parse: [] }, `${label}: neutral mentions`);
    const nodes = flatten(card.components), displays = nodes.filter(item => item.type === 10);
    assert.ok(nodes.length > 0 && nodes.length <= 40, `${label}: component budget`);
    assert.ok(displays.length && displays.every(item => typeof item.content === 'string' && item.content.length > 0), `${label}: display text`);
    const characters = displays.reduce((total, item) => total + item.content.length, 0);
    assert.ok(characters <= 4000, `${label}: text budget (${characters})`);
    const visible = displays.map(item => item.content).join('\n');
    assert.match(visible, /Read-only learning: the application does not save progress or quiz results/, `${label}: teaching disclaimer`);
    for (const embed of legacy.embeds) {
      for (const value of [embed.title, embed.description, embed.footer?.text, ...(embed.fields || []).flatMap(field => [field.name, field.value])]) {
        if (typeof value === 'string' && value) assert.ok(visible.includes(value), `${label}: source teaching text retained`);
      }
    }
    const originalButtons = flatten(legacy.components).filter(item => item.type === 2);
    assert.deepEqual(nodes.filter(item => item.type === 2), originalButtons, `${label}: exact controls retained`);
    assert.ok(!JSON.stringify(card).includes('"correct":'), `${label}: no hidden quiz grading field`);
    const answerCursor = /^answer:(\d+):0:([a-z0-9-]+)$/.exec(cursor);
    if (answerCursor) {
      const answer = getStudentCourseModule(course.key, Number(answerCursor[1])).quiz.answers.find(item => item.id === answerCursor[2]);
      const expected = answer.correct ? 'Correct for this practice question.' : 'Not quite for this practice question.';
      assert.ok(legacy.embeds[0].description.startsWith(expected), `${label}: feedback matches the selected answer`);
    }
    for (const button of originalButtons) {
      assert.ok(button.custom_id.startsWith(prefix) && button.custom_id.length <= 100, `${label}: session-bound control`);
      const next = button.custom_id.slice(prefix.length);
      if (!queued.has(next)) { queued.add(next); pending.push(next); }
    }
    summary.views++;
    summary.maxComponents = Math.max(summary.maxComponents, nodes.length);
    summary.maxTextCharacters = Math.max(summary.maxTextCharacters, characters);
    if (visible.includes(missingText)) summary.unavailableTeachingViews++;
  }
  for (let page = 0; page < Math.max(1, Math.ceil(course.modules.length / 5)); page++) assert.ok(seen.has(`overview:0:${page}`), `${course.key}: reachable overview page ${page}`);
  for (let index = 0; index < course.modules.length; index++) {
    for (const view of ['module', 'lesson', 'lab', 'hint', 'quiz']) assert.ok(seen.has(`${view}:${index}:0`), `${course.key}: reachable ${view} for module index ${index}`);
    const module = getStudentCourseModule(course.key, index);
    if (validPracticeQuiz(module.quiz)) for (const answer of module.quiz.answers) assert.ok(seen.has(`answer:${index}:0:${answer.id}`), `${course.key}: reachable feedback for module index ${index}, answer ${answer.id}`);
  }
  assert.equal(JSON.stringify(COURSES), sourceSnapshot, `${course.key}: curriculum data unchanged`);
  return summary;
}

for (const course of COURSES) test(`all reachable course cards: ${course.key}`, { timeout: 15000 }, t => {
  t.diagnostic(JSON.stringify(auditCourseCards(course)));
});
