const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const key = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);

// Staged backend: runtime must validate lifecycle schema/privileges before use.
export function createAdministratorCourseCompletion(pool, config, { courseKeys, verifyAdministrator, now = () => new Date() } = {}) {
  if (config?.enabled !== true || typeof pool?.connect !== 'function' || typeof verifyAdministrator !== 'function' || typeof now !== 'function' ||
      !Array.isArray(courseKeys) || !courseKeys.length || courseKeys.length > 50 || !courseKeys.every(key) || new Set(courseKeys).size !== courseKeys.length) throw new Error('Explicit enabled completion context and trusted verifier required');
  const allowed = new Set(courseKeys);
  async function authorize(actor) {
    let permitted = false;
    try { permitted = await verifyAdministrator(actor) === true; } catch {}
    if (!permitted) throw new Error('Current Administrator authorization required');
  }
  function state(courses) {
    if (courses.some(course => !['active', 'completed'].includes(course.status))) throw new Error('Invalid stored course state');
    return { assignedCourseCount: courses.length, activeCourseCount: courses.filter(course => course.status === 'active').length,
      allAssignedCoursesCompleted: courses.length > 0 && courses.every(course => course.status === 'completed') };
  }
  async function completeCourse(actor, subject, courseKey) {
    if (!id(actor) || !id(subject) || !allowed.has(courseKey)) throw new Error('Valid actor, student and allowed course required');
    await authorize(actor);
    const db = await pool.connect(); let discard = false;
    try {
      await db.query('BEGIN');
      const enrollment = (await db.query('SELECT * FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE', [subject])).rows[0];
      if (!enrollment) throw new Error('Enrollment not found');
      const closure = ['application_closed_at', 'application_closed_by', 'application_closed_as'];
      if (!closure.every(field => Object.hasOwn(enrollment, field)) || closure.some(field => enrollment[field] != null)) throw new Error('Reviewed open application required');
      if (!['approved', 'suspended', 'revoked'].includes(enrollment.status) || typeof enrollment.student_id !== 'string' || !enrollment.student_id.trim() || !id(enrollment.approved_by) || enrollment.approved_at == null) throw new Error('Prior approved enrollment required');
      const courses = (await db.query('SELECT * FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key FOR UPDATE', [subject])).rows;
      state(courses);
      const course = courses.find(row => row.course_key === courseKey);
      if (!course) throw new Error('Explicit course assignment required');
      await authorize(actor);
      let result;
      if (course.status === 'completed') {
        result = { alreadyCompleted: true, courseKey, completedAt: new Date(course.completed_at).toISOString(), ...state(courses) };
      } else {
        const time = now();
        if (!(time instanceof Date) || !Number.isFinite(time.getTime()) || time.getUTCFullYear() < 1970 || time.getUTCFullYear() > 9998) throw new Error('Valid server clock required');
        const stamp = time.toISOString();
        const update = await db.query("UPDATE certification_course_enrollments SET status='completed',completed_at=$3,completed_by=$4 WHERE discord_user_id=$1 AND course_key=$2 AND status='active' RETURNING *", [subject, courseKey, stamp, actor]);
        if (update.rowCount !== 1 || update.rows.length !== 1) throw new Error('Course completion not recorded');
        const summary = state(courses.map(row => row.course_key === courseKey ? update.rows[0] : row));
        await db.query('INSERT INTO certification_audit_events (actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES ($1,$2,$3,$4::jsonb,$5)',
          [actor, subject, 'course_completed', JSON.stringify({ courseKey, allAssignedCoursesCompleted: summary.allAssignedCoursesCompleted }), stamp]);
        result = { alreadyCompleted: false, courseKey, completedAt: new Date(update.rows[0].completed_at).toISOString(), ...summary };
      }
      await db.query('COMMIT'); return result;
    } catch (error) {
      try { await db.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { db.release(discard); }
  }
  return Object.freeze({ completeCourse });
}
