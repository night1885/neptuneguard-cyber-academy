// Detached facade over the existing course policy; no connection or writer is constructed.
import { createCertificationCourseLifecycle } from '../../../../certification-course-lifecycle.js';
import { FORMAL_REVIEW_COURSE } from './formal-course.mjs';
const id = v => typeof v === 'string' && /^[0-9]{17,20}$/.test(v);
const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 100;
export const FORMAL_READ_SQL = "SELECT e.*,c.status AS course_status,c.course_key AS authorized_course_key FROM certification_enrollments e JOIN certification_course_enrollments c ON c.discord_user_id=e.discord_user_id WHERE e.discord_user_id=$1 AND c.course_key=$2 AND e.status='approved' AND c.status='active'";
export function isFormalRead(sql, values) {
  return typeof sql === 'string' && sql.replace(/\s+/g, ' ').trim() === FORMAL_READ_SQL &&
    Array.isArray(values) && values.length === 2 && id(values[0]) && values[1] === FORMAL_REVIEW_COURSE.key;
}
export function createFormalReviewAuthorization({ enabled = false, reviewOnly = false, readPool, config = {} } = {}) {
  if (enabled !== true || config?.enabled !== true) return Object.freeze(Object.assign(async () => null, { dispose() {} }));
  if (reviewOnly !== true || typeof readPool?.query !== 'function' || !text(config.activeAgreementVersion) ||
      typeof config.activeAgreementSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(config.activeAgreementSha256) ||
      !text(config.comprehensionCheck?.version)) throw new TypeError('Explicit detached read context and current policy required');
  const settings = Object.freeze({ enabled: true, activeAgreementVersion: config.activeAgreementVersion,
    activeAgreementSha256: config.activeAgreementSha256,
    comprehensionCheck: Object.freeze({ version: config.comprehensionCheck.version }) });
  let disposed = false;
  const pool = Object.freeze({ async query(sql, values) {
    if (disposed || !isFormalRead(sql, values)) throw new Error('Unreviewed policy query');
    const result = await readPool.query(sql, [...values]);
    if (!result || !Array.isArray(result.rows) || result.rows.length > 1 ||
        result.rows.some(row => !row || row.discord_user_id !== values[0])) throw new Error('Invalid scoped policy result');
    return { rows: result.rows };
  } });
  const service = createCertificationCourseLifecycle(pool, settings, { courseKeys: [FORMAL_REVIEW_COURSE.key] });
  const authorize = async (actorId, courseKey) => {
    if (disposed || !id(actorId) || courseKey !== FORMAL_REVIEW_COURSE.key) return null;
    try {
      const grant = await service.getCourseAuthorization(actorId, courseKey);
      if (disposed || !grant || Object.keys(grant).sort().join(',') !== 'course_key,student_id' ||
          grant.course_key !== FORMAL_REVIEW_COURSE.key || typeof grant.student_id !== 'string' ||
          !grant.student_id.trim() || grant.student_id.length > 128) return null;
      return Object.freeze({ student_id: grant.student_id, course_key: grant.course_key });
    } catch { return null; }
  };
  return Object.freeze(Object.assign(authorize, { dispose() { disposed = true; } }));
}
