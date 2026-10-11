import assert from 'node:assert/strict';
import { COURSES, getCourse, getModule } from './course-registry.js';
import { defaultProgress, isModuleUnlocked, completeActivity } from './module-progress.js';
import { handleAcademyButton, showAcademyCourse } from './academy-handler.js';

let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }
const badges = new Set();
for (const course of COURSES) {
  const numbers = new Set(course.modules.map(m => m.number));
  check(numbers.size === course.modules.length, 'Duplicate module numbers');
  check(getCourse(course.key) === course, 'Course lookup failed');
  for (const m of course.modules) {
    check(m.courseKey === course.key, 'Mismatched course key');
    check(getModule(course.key, m.number) === m, 'Module lookup failed');
    check(!badges.has(m.badgeKey), 'Duplicate badge key'); badges.add(m.badgeKey);
    check([m.lessonXp,m.labXp,m.quizXp].every(x => Number.isInteger(x) && x >= 0), 'Invalid rewards');
    check(m.prerequisiteModuleNumber == null ||
      (numbers.has(m.prerequisiteModuleNumber) && m.prerequisiteModuleNumber < m.number), 'Invalid prerequisite');
    // Module 01 retains the legacy activity handler.
    if (course.key === 'linux-fundamentals' && m.number === 1) continue;
    check(m.learningObjectives?.length > 0 && m.keyIdeas?.length > 0, 'Missing lesson');
    check(m.lab?.commands?.length > 0 && m.lab?.checks?.length > 0, 'Missing lab');
    check(m.quiz?.answers?.length >= 2 && m.quiz.answers.length <= 5, 'Invalid quiz answer count');
    check(m.quiz.answers.filter(a => a.correct).length === 1, 'Quiz must have one correct answer');
    check(new Set(m.quiz.answers.map(a => a.id)).size === m.quiz.answers.length, 'Duplicate answer IDs');
    check(m.quiz.answers.every(a => a.label.length <= 80), 'Button label too long');
    check(m.quiz.question.length < 1700 && m.hint.length < 1800, 'Quiz/hint message too long');
  }
}
const module = getModule('linux-fundamentals', 3);
check(!isModuleUnlocked(module, new Map()), 'Module 03 should initially be locked');
check(isModuleUnlocked(module, new Map([[2, {completed_at: new Date()}]])), 'Completed Module 02 should unlock Module 03');
check(defaultProgress().xp_earned === 0, 'Incorrect default XP');
check(typeof handleAcademyButton === 'function' && typeof showAcademyCourse === 'function', 'Missing handler exports');

// A deterministic SQL double: no network connection or actual database writes.
let progress = defaultProgress(); let totalXp = 0; let badgeCount = 0; let released = 0;
const db = {
  async query(sql, params = []) {
    if (sql.includes('SELECT completed_at')) return {rows:[{completed_at: new Date()}]};
    if (sql.includes('SELECT * FROM learner_module_progress')) return {rows:[{...progress}]};
    if (sql.includes('SET lesson_completed=TRUE') || sql.includes('SET lab_completed=TRUE') || sql.includes('SET quiz_completed=TRUE')) {
      const activity = /SET (\w+)=TRUE/.exec(sql)[1]; progress[activity] = true;
      progress.xp_earned += params[3]; if (params[4]) progress.quiz_score = 100;
      return {rows:[{...progress}]};
    }
    if (sql.includes('SET completed_at=NOW()')) { progress.completed_at = new Date(); return {rows:[{...progress}]}; }
    if (sql.includes('INSERT INTO learner_badges')) badgeCount++;
    if (sql.includes('total_xp=total_xp+$2')) totalXp += params[1];
    return {rows:[],rowCount:0};
  }, release() { released++; }
};
const pool = {async connect() {return db;}};
for (const activity of ['lesson_completed','lab_completed','quiz_completed']) {
  const first = await completeActivity(pool, 'test-user', module, activity);
  check(first.completedNow, 'First completion should award XP');
  const repeat = await completeActivity(pool, 'test-user', module, activity);
  check(!repeat.completedNow && repeat.xp === 0, 'Repeat completion awarded XP');
}
check(totalXp === 100 && progress.xp_earned === 100, 'Wrong total rewards');
check(badgeCount === 1 && Boolean(progress.completed_at), 'Completion badge missing or duplicated');
check(released === 6, 'Database clients not released');
await assert.rejects(() => completeActivity(pool, 'test-user', module, 'invalid'), /Invalid activity/); checks++;
console.log(`PASS: ${checks} checks; ${COURSES.length} course(s), ${COURSES.reduce((n,c)=>n+c.modules.length,0)} modules.`);
console.log('Offline structural and sequential reward tests only. Live PostgreSQL, concurrency, and Discord tests remain pending.');
