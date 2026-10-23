import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNITY_COURSES } from './community-learning-policy.mjs';
import { getCommunityCourse, getCommunityModule, communityBadgeKeys, createNativeCommunityClassroom } from './community-learning-native.mjs';
test('native bridge includes only the three Linux courses and complete Module 1 teaching data', () => {
  for (const key of COMMUNITY_COURSES) {
    const course = getCommunityCourse(key); assert.ok(course.modules.length);
    for (const entry of course.modules) { const m = getCommunityModule(key, entry.number); assert.ok(m.learningObjectives.length); assert.ok(m.lab.commands.length); assert.ok(m.quiz.answers.some(a => a.correct)); assert.ok(communityBadgeKeys.includes(m.badgeKey)); }
  }
  for (const key of ['soc-analyst', 'ethical-hacking', 'incident-response']) { assert.equal(getCommunityCourse(key), null); assert.equal(getCommunityModule(key, 1), null); }
  assert.ok(getCommunityModule('linux-fundamentals', 1).lessonCommands.includes('pwd'));
  assert.equal(typeof createNativeCommunityClassroom().handleActivity, 'function');
});
