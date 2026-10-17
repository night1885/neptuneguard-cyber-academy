import { COURSES } from './course-registry.js';
import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
import { createSectionLoginHandler } from './certification-section-login.js';

export const COURSE_SECTION_CATALOG = Object.freeze(COURSES.map(course => Object.freeze({ key: course.key, title: course.title })));
export const COURSE_SECTION_KEYS = Object.freeze(COURSE_SECTION_CATALOG.map(course => course.key));
if (!COURSE_SECTION_KEYS.length || COURSE_SECTION_KEYS.some(key => typeof key !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(key) || key === 'training-readiness') ||
    new Set(COURSE_SECTION_KEYS).size !== COURSE_SECTION_KEYS.length) throw new Error('Explicit unique curriculum course keys required; training-readiness remains separate');

export function createCourseSectionAuthorization(pool, config) {
  const service = createCertificationCourseLifecycle(pool, config, { courseKeys: COURSE_SECTION_KEYS });
  return (actor, courseKey) => service.getCourseAuthorization(actor, courseKey);
}

// Not connected to runtime routing. No legacy progress handlers are invoked.
export function createCourseSectionLoginHandler(pool, config, guildId, options = {}) {
  return createSectionLoginHandler(pool, config, guildId, { ...options,
    sections: COURSE_SECTION_KEYS, authorizeCourseSection: createCourseSectionAuthorization(pool, config) });
}
