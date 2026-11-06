export function readCourseRequestReleaseOptions(env = {}) {
  const read = name => { const value = env[name]; if (value !== undefined && value !== 'true' && value !== 'false') throw new Error(`Invalid ${name}`); return value === 'true'; };
  const enabled = read('CERTIFICATION_COURSE_REQUESTS_ENABLED');
  const students = read('CERTIFICATION_COURSE_REQUEST_STUDENTS_ENABLED');
  if (!enabled) { if (students) throw new Error('Student course requests require enabled course requests'); return Object.freeze({}); }
  if (env.CERTIFICATION_ENABLED !== 'true' || env.CERTIFICATION_COURSES_ENABLED !== 'true' || env.CERTIFICATION_REGISTRATION_PILOT === 'true' || env.CERTIFICATION_READ_ONLY_PREVIEW === 'true') throw new Error('Course requests require general certification course runtime');
  return Object.freeze({ courseRequestsEnabled: true, studentAccessEnabled: students });
}
