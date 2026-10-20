import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const key = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
function summary(courses) {
  if (courses.some(course => !['active', 'completed'].includes(course.status))) throw new Error('Invalid stored course state');
  return { assignedCourseCount: courses.length, activeCourseCount: courses.filter(course => course.status === 'active').length,
    allAssignedCoursesCompleted: courses.length > 0 && courses.every(course => course.status === 'completed') };
}

export function createCertificationCourseLifecycle(pool, config = {}, { courseKeys, now = () => new Date() } = {}) {
  if (!Array.isArray(courseKeys) || courseKeys.length < 1 || courseKeys.length > 50 ||
      !courseKeys.every(key) || new Set(courseKeys).size !== courseKeys.length || typeof now !== 'function') throw new Error('Explicit unique course-key allowlist and clock required');
  const allowed = new Set(courseKeys), settings = Object.freeze({ ...config });
  const priorApproval = row => row && typeof row.student_id === 'string' && row.student_id.trim().length > 0 && id(row.approved_by) && row.approved_at != null;
  const currentApproval = row => row?.status === 'approved' && priorApproval(row) && hasCompleteAccountAcknowledgment(row) &&
    (!settings.activeAgreementVersion || row.agreement_version === settings.activeAgreementVersion) &&
    (!settings.activeAgreementSha256 || row.agreement_content_sha256 === settings.activeAgreementSha256) &&
    (!settings.comprehensionCheck?.version || row.comprehension_check_version === settings.comprehensionCheck.version);
  function validate(actor, subject) {
    if (settings.enabled !== true || !id(actor) || actor !== settings.ownerId) throw new Error('Enabled certification and owner authorization required');
    if (!id(subject)) throw new Error('Invalid student Discord ID');
  }
  function instant() {
    const value = now();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime()) || value.getUTCFullYear() < 1970 || value.getUTCFullYear() > 9998) throw new Error('Valid millisecond-precision server Date required');
    return value.toISOString();
  }
  async function transaction(subject, operation) {
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN');
      const enrollment = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [subject])).rows[0];
      if (!enrollment) throw new Error('Enrollment not found');
      const closureFields = ['application_closed_at', 'application_closed_by', 'application_closed_as'];
      if (!closureFields.every(field => Object.hasOwn(enrollment, field))) throw new Error('Reviewed closure schema required');
      if (closureFields.some(field => enrollment[field] != null)) throw new Error('Closed application cannot receive course lifecycle changes');
      const courses = (await db.query('SELECT * FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key FOR UPDATE', [subject])).rows;
      summary(courses);
      const result = await operation(db, enrollment, courses);
      await db.query('COMMIT'); return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  async function audit(db, actor, subject, action, details, time) {
    await db.query('INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES ($1,$2,$3,$4::jsonb,$5)',
      [actor, subject, action, JSON.stringify(details), time]);
  }
  async function assignCourses(actor, subject, keys) {
    validate(actor, subject);
    if (!Array.isArray(keys) || keys.length < 1 || keys.length > 50 || new Set(keys).size !== keys.length || !keys.every(value => allowed.has(value))) throw new Error('Explicit unique allowed course keys required');
    return transaction(subject, async (db, enrollment, courses) => {
      if (!currentApproval(enrollment)) throw new Error('Current approved account enrollment required for course assignment');
      if (keys.some(value => courses.some(course => course.course_key === value && course.status === 'completed'))) throw new Error('Completed course cannot be reassigned');
      const added = keys.filter(value => !courses.some(course => course.course_key === value));
      if (!added.length) return { alreadyAssigned: true, assignedCourseKeys: [], ...summary(courses) };
      if (summary(courses).allAssignedCoursesCompleted) throw new Error('All assigned courses completed; new enrollment requires separate review');
      const time = instant();
      for (const value of added) await db.query(`INSERT INTO certification_course_enrollments
        (discord_user_id,course_key,status,assigned_at,assigned_by) VALUES ($1,$2,'active',$3,$4)`, [subject, value, time, actor]);
      await audit(db, actor, subject, 'courses_assigned', { courseKeys: added }, time);
      return { alreadyAssigned: false, assignedCourseKeys: added, ...summary([...courses, ...added.map(course_key => ({ course_key, status: 'active' }))]) };
    });
  }
  async function completeCourse(actor, subject, courseKey) {
    validate(actor, subject);
    if (!allowed.has(courseKey)) throw new Error('Allowed course key required');
    return transaction(subject, async (db, enrollment, courses) => {
      if (!['approved', 'suspended', 'revoked'].includes(enrollment.status) || !priorApproval(enrollment)) throw new Error('Prior approved enrollment required for administrative completion');
      const course = courses.find(value => value.course_key === courseKey);
      if (!course) throw new Error('Explicit course assignment required before completion');
      if (course.status === 'completed') return { alreadyCompleted: true, courseKey, completedAt: new Date(course.completed_at).toISOString(), ...summary(courses) };
      const time = instant();
      const update = await db.query(`UPDATE certification_course_enrollments SET status='completed',completed_at=$3,completed_by=$4
        WHERE discord_user_id=$1 AND course_key=$2 AND status='active' RETURNING *`, [subject, courseKey, time, actor]);
      if (update.rowCount !== 1 || update.rows.length !== 1) throw new Error('Course completion not recorded');
      const state = summary(courses.map(value => value.course_key === courseKey ? update.rows[0] : value));
      await audit(db, actor, subject, 'course_completed', { courseKey, allAssignedCoursesCompleted: state.allAssignedCoursesCompleted }, time);
      return { alreadyCompleted: false, courseKey, completedAt: new Date(update.rows[0].completed_at).toISOString(), ...state };
    });
  }
  async function getCourseAuthorization(subject, courseKey) {
    if (settings.enabled !== true || !id(subject) || !allowed.has(courseKey)) return null;
    const row = (await pool.query(`SELECT e.*,c.status AS course_status,c.course_key AS authorized_course_key
      FROM certification_enrollments e JOIN certification_course_enrollments c ON c.discord_user_id=e.discord_user_id
      WHERE e.discord_user_id=$1 AND c.course_key=$2 AND e.status='approved' AND c.status='active'`, [subject, courseKey])).rows[0];
    if (!row || row.course_status !== 'active' || row.authorized_course_key !== courseKey || !currentApproval(row) ||
        ['application_closed_at', 'application_closed_by', 'application_closed_as'].some(field => !Object.hasOwn(row, field) || row[field] != null)) return null;
    return { student_id: row.student_id, course_key: courseKey };
  }
  return Object.freeze({ assignCourses, completeCourse, getCourseAuthorization });
}
