import assert from 'node:assert/strict';
import { COURSES, getCourse, getModule } from './course-registry.js';
import { isModuleUnlocked } from './module-progress.js';
const course=getCourse('soc-analyst');
assert.ok(course);
assert.equal(COURSES.length,4);
assert.equal(COURSES.reduce((n,c)=>n+c.modules.length,0),36);
assert.equal(course.modules.length,8);
for (const [i,m] of course.modules.entries()) {
  assert.equal(m.number,i+1);
  assert.equal(m.courseKey,course.key);
  assert.equal(getModule(course.key,m.number),m);
  assert.equal(m.prerequisiteModuleNumber,i || null);
  assert.equal(m.lessonXp+m.labXp+m.quizXp,100);
  assert.equal(m.quiz.answers.filter(a=>a.correct).length,1);
  assert.ok(m.quiz.answers.every(a=>a.label.length<=80));
  assert.equal(isModuleUnlocked(m,new Map()),i===0);
  if(i) assert.equal(isModuleUnlocked(m,new Map([[i,{completed_at:new Date()}]])),true);
}
assert.equal(new Set(COURSES.flatMap(c=>c.modules.map(m=>m.badgeKey))).size,36);
console.log('PASS: SOC registration, 8 modules, prerequisites, rewards, quizzes, unique badge keys; 4 courses / 36 modules.');
