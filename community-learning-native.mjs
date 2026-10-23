import { COMMUNITY_COURSES } from './community-learning-policy.mjs';
import { createCommunityClassroom } from './community-learning-classroom.mjs';
import { getCourse } from './course-registry.js';
import { getStudentCourseModule } from './certification-student-course-content.js';
import { getCourseProgress, defaultProgress, isModuleUnlocked, completeActivity } from './module-progress.js';
const allowed = new Set(COMMUNITY_COURSES);
export const getCommunityCourse = key => allowed.has(key) ? getCourse(key) : null;
export function getCommunityModule(key, number) {
  const course = getCommunityCourse(key), index = course?.modules.findIndex(m => m.number === number);
  return typeof index === 'number' && index >= 0 ? getStudentCourseModule(key, index) : null;
}
export const communityBadgeKeys = Object.freeze([...new Set(COMMUNITY_COURSES.flatMap(key => {
  const course = getCommunityCourse(key);
  if (!course?.modules?.length) throw new Error('Community curriculum unavailable');
  return course.modules.map(m => m.badgeKey);
}))]);
export function createNativeCommunityClassroom() {
  return createCommunityClassroom({ getCourse: getCommunityCourse, getModule: getCommunityModule,
    getCourseProgress, defaultProgress, isModuleUnlocked, completeActivity });
}
