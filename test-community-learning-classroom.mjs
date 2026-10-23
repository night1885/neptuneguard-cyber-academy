import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommunityClassroom } from './community-learning-classroom.mjs';
const key = 'linux-fundamentals', actor = '333333333333333333';
function fixture() {
  const state = { path: key, progress: new Map(), replies: [], awards: [] };
  const first = { number: 1, courseKey: key, title: 'Terminal', overview: 'Practice terminal basics', learningObjectives: ['Find your directory'], keyIdeas: [{ title: 'Shell', text: 'Practice explanation' }],
    lessonCommands: ['pwd'], lab: { safetyNotice: 'Use your own practice VM.', commands: ['pwd'], checks: ['Inspect the path'] }, hint: 'Print working directory',
    quiz: { question: 'Print working directory?', answers: [{ id: 'a', label: 'A. ls', correct: false }, { id: 'b', label: 'B. pwd', correct: true }], correctExplanation: 'pwd prints it.', incorrectExplanation: 'Try again.' },
    lessonXp: 25, labXp: 25, quizXp: 50, badgeName: 'Linux Foundations', prerequisiteModuleNumber: null };
  const second = { ...first, number: 2, title: 'Files', prerequisiteModuleNumber: 1 };
  const course = { key, title: 'Linux Fundamentals', modules: [first, second] };
  const pool = { async query(sql, values) { assert.equal(values[0], actor); return { rows: [{ current_path_slug: state.path }] }; } };
  const classroom = createCommunityClassroom({ getCourse: value => value === key ? course : null, getModule: (value, number) => value === key ? course.modules.find(m => m.number === number) : null,
    getCourseProgress: async () => state.progress, defaultProgress: () => ({ xp_earned: 0 }),
    isModuleUnlocked: (m, progress) => m.prerequisiteModuleNumber == null || Boolean(progress.get(m.prerequisiteModuleNumber)?.completed_at),
    completeActivity: async (storage, user, m, activity) => { assert.equal(storage, pool); assert.equal(user, actor); state.awards.push({ number: m.number, activity }); return { completedNow: true, xp: 25 }; } });
  const interaction = action => ({ user: { id: actor }, customId: `academy:${key}:1:${action}`, async editReply(payload) { state.replies.push(payload); } });
  return { state, first, second, pool, classroom, interaction };
}
test('course overview uses community controls and opening it awards nothing', async () => {
  const f = fixture(); await f.classroom.showCourse(f.interaction('open'), f.pool, key);
  assert.equal(f.state.awards.length, 0); assert.ok(f.state.replies[0].components[0].components[1].disabled);
  assert.ok(f.state.replies[0].components[0].components.every(c => c.custom_id.startsWith('academy:linux-fundamentals:')));
});
test('lesson, lab, hint, quiz and progress views never award XP', async () => {
  const f = fixture(); for (const action of ['open', 'lesson:0', 'lab:0', 'hint', 'quiz', 'progress']) await f.classroom.handleActivity(f.interaction(action), f.pool);
  assert.equal(f.state.awards.length, 0); assert.ok(f.state.replies.some(p => p.embeds[0].description.includes('self-reported')));
});
test('explicit lesson and lab completion use the existing activity interface', async () => {
  const f = fixture(); for (const action of ['lesson-complete', 'lab-complete']) await f.classroom.handleActivity(f.interaction(action), f.pool);
  assert.deepEqual(f.state.awards, [{ number: 1, activity: 'lesson_completed' }, { number: 1, activity: 'lab_completed' }]);
});
test('wrong and unknown quiz answers award nothing; the correct answer dispatches quiz completion', async () => {
  const f = fixture(); for (const action of ['answer-a', 'answer-unknown']) await f.classroom.handleActivity(f.interaction(action), f.pool);
  assert.equal(f.state.awards.length, 0); await f.classroom.handleActivity(f.interaction('answer-b'), f.pool);
  assert.deepEqual(f.state.awards, [{ number: 1, activity: 'quiz_completed' }]);
});
test('locked prerequisites cannot reach completion', async () => {
  const f = fixture(), i = f.interaction('lesson-complete'); i.customId = `academy:${key}:2:lesson-complete`;
  await f.classroom.handleActivity(i, f.pool); assert.equal(f.state.awards.length, 0); assert.equal(f.state.replies[0].embeds[0].title, 'Module locked');
});
test('SOC, formal and mismatched selected paths cannot reach completion', async () => {
  const f = fixture(); for (const path of ['soc-analyst', 'ethical-hacking', 'incident-response']) {
    const i = f.interaction('lab-complete'); i.customId = `academy:${path}:1:lab-complete`; await f.classroom.handleActivity(i, f.pool);
  }
  f.state.path = 'linux-administration'; await f.classroom.handleActivity(f.interaction('lab-complete'), f.pool); assert.equal(f.state.awards.length, 0);
});
test('invalid pages and unknown actions do not award XP', async () => {
  const f = fixture(); for (const action of ['lesson:999', 'lab:999', 'unknown', 'course:999']) await f.classroom.handleActivity(f.interaction(action), f.pool);
  assert.equal(f.state.awards.length, 0);
});
test('long teaching text paginates within Discord limits without awarding XP', async () => {
  const f = fixture(); f.first.keyIdeas[0].text = 'x'.repeat(9000); await f.classroom.handleActivity(f.interaction('lesson:0'), f.pool);
  const p = f.state.replies[0]; assert.ok(p.embeds[0].description.length <= 4000); assert.ok(p.components[0].components.some(c => c.label === 'Next'));
  assert.deepEqual(p.allowedMentions, { parse: [] }); assert.equal(f.state.awards.length, 0);
});
