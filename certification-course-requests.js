import { randomUUID } from 'node:crypto';
import { hasCompleteAccountAcknowledgment } from './certification-account-acknowledgment.js';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const key = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);

// Backend only: no listeners, environment reads, migrations or automatic activation.
export function createCertificationCourseRequests(pool, config, { courseKeys, now = () => new Date() } = {}) {
  if (typeof pool?.connect !== 'function' || config?.enabled !== true || !id(config.ownerId) ||
      !Array.isArray(courseKeys) || !courseKeys.length || courseKeys.length > 50 ||
      !courseKeys.every(key) || new Set(courseKeys).size !== courseKeys.length || typeof now !== 'function') {
    throw new Error('Explicit enabled course request configuration required');
  }
  const settings = Object.freeze({ ...config, ...(config.comprehensionCheck ? { comprehensionCheck: Object.freeze({ version: config.comprehensionCheck.version }) } : {}) });
  const allowed = new Set(courseKeys);
  const validSubject = subject => { if (!id(subject)) throw new Error('Invalid learner ID'); };
  const eligible = enrollment => enrollment.status === 'approved' &&
    typeof enrollment.student_id === 'string' && enrollment.student_id.trim().length > 0 &&
    id(enrollment.approved_by) && enrollment.approved_at != null && hasCompleteAccountAcknowledgment(enrollment) &&
    (!settings.activeAgreementVersion || enrollment.agreement_version === settings.activeAgreementVersion) &&
    (!settings.activeAgreementSha256 || enrollment.agreement_content_sha256 === settings.activeAgreementSha256) &&
    (!settings.comprehensionCheck?.version || enrollment.comprehension_check_version === settings.comprehensionCheck.version);
  function instant() {
    const time = now();
    if (!(time instanceof Date) || !Number.isFinite(time.getTime()) || time.getUTCFullYear() < 1970 || time.getUTCFullYear() > 9998) throw new Error('Valid server clock required');
    return time.toISOString();
  }
  function assertAssignable(enrollment, courses, courseKey) {
    if (!eligible(enrollment)) throw new Error('Current approved account enrollment required');
    if (['application_closed_at','application_closed_by','application_closed_as'].some(field => !Object.hasOwn(enrollment, field) || enrollment[field] != null)) throw new Error('Open reviewed application required');
    if (courses.some(course => !['active','completed'].includes(course.status))) throw new Error('Invalid stored course state');
    if (courses.some(course => course.course_key === courseKey)) throw new Error('Course already assigned or completed');
    if (courses.length && courses.every(course => course.status === 'completed')) throw new Error('All assigned courses completed; separate review required');
  }
  async function transaction(subject, work) {
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN');
      const enrollment = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [subject])).rows[0];
      if (!enrollment) throw new Error('Enrollment not found');
      const courses = (await db.query('SELECT * FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key FOR UPDATE', [subject])).rows;
      const result = await work(db, enrollment, courses);
      await db.query('COMMIT'); return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  async function audit(db, actor, subject, action, details, time) {
    await db.query('INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES ($1,$2,$3,$4::jsonb,$5)', [actor, subject, action, JSON.stringify(details), time]);
  }
  async function requestCourse(actor, courseKey) {
    validSubject(actor);
    if (!allowed.has(courseKey)) throw new Error('Allowed course key required');
    return transaction(actor, async (db, enrollment, courses) => {
      assertAssignable(enrollment, courses, courseKey);
      const existing = (await db.query("SELECT * FROM certification_course_requests WHERE discord_user_id=$1 AND course_key=$2 AND status='pending' FOR UPDATE", [actor, courseKey])).rows[0];
      if (existing) return { request: existing, alreadyPending: true };
      const time = instant();
      const request = (await db.query("INSERT INTO certification_course_requests (request_id,discord_user_id,course_key,status,requested_at) VALUES ($1,$2,$3,'pending',$4) RETURNING *", [randomUUID(), actor, courseKey, time])).rows[0];
      await audit(db, actor, actor, 'course_requested', { requestId: request.request_id, courseKey }, time);
      return { request, alreadyPending: false };
    });
  }
  async function reviewRequest(actor, subject, requestId, decision) {
    if (actor !== settings.ownerId) throw new Error('Owner authorization required');
    validSubject(subject);
    if (!uuid(requestId) || !['approved','denied'].includes(decision)) throw new Error('Explicit valid course review required');
    return transaction(subject, async (db, enrollment, courses) => {
      const request = (await db.query('SELECT * FROM certification_course_requests WHERE request_id=$1 AND discord_user_id=$2 FOR UPDATE', [requestId, subject])).rows[0];
      if (!request || !allowed.has(request.course_key)) throw new Error('Allowed course request not found');
      if (request.status !== 'pending') {
        if (request.status !== decision) throw new Error('Course request already reviewed with another decision');
        return { request, alreadyReviewed: true };
      }
      if (decision === 'approved') assertAssignable(enrollment, courses, request.course_key);
      const time = instant();
      if (Date.parse(time) < new Date(request.requested_at).getTime()) throw new Error('Review clock precedes request');
      if (decision === 'approved') {
        await db.query("INSERT INTO certification_course_enrollments (discord_user_id,course_key,status,assigned_at,assigned_by) VALUES ($1,$2,'active',$3,$4)", [subject, request.course_key, time, actor]);
        await audit(db, actor, subject, 'courses_assigned', { courseKeys: [request.course_key], requestId }, time);
      }
      const updated = await db.query("UPDATE certification_course_requests SET status=$3,reviewed_at=$4,reviewed_by=$5 WHERE request_id=$1 AND discord_user_id=$2 AND status='pending' RETURNING *", [requestId, subject, decision, time, actor]);
      if (updated.rowCount !== 1 || updated.rows.length !== 1) throw new Error('Course decision not recorded');
      await audit(db, actor, subject, 'course_request_reviewed', { requestId, courseKey: request.course_key, decision }, time);
      return { request: updated.rows[0], alreadyReviewed: false };
    });
  }
  return Object.freeze({ requestCourse, reviewRequest });
}
