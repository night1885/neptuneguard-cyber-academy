import { randomUUID } from 'node:crypto';
import { COURSE_SECTION_CATALOG, COURSE_SECTION_KEYS } from './certification-course-sections.js';
import { createReadyCourseLifecycle, createReadyCourseNavigation } from './certification-course-readiness.js';

const prefix = 'cert:courselife:', validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const button = (id, label, style = 2) => ({ type: 2, style, custom_id: id, label: label.slice(0, 80) });
const row = components => ({ type: 1, components });

export async function createCourseLifecycleAdminControls(pool, config, guildId, { now = Date.now, createLifecycle = createReadyCourseLifecycle } = {}) {
  if (config?.enabled !== true || !validId(config.ownerId) || !validId(guildId) || typeof now !== 'function' || typeof createLifecycle !== 'function' || COURSE_SECTION_KEYS.length > 25) throw new Error('Explicit owner context and reviewed course catalog of at most 25 required');
  const settings = Object.freeze({ ...config }), allowed = new Set(COURSE_SECTION_KEYS);
  const service = await createLifecycle(pool, settings, { courseKeys: COURSE_SECTION_KEYS });
  if (typeof service?.assignCourses !== 'function' || typeof service.completeCourse !== 'function') throw new Error('Ready course lifecycle service required');
  const pending = new Map(); let disposed = false;
  const context = i => {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return !disposed && i.user?.id === settings.ownerId && i.guildId === guildId &&
      !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id);
  };
  const respond = (i, payload) => {
    const message = { content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } };
    return i.deferred || i.replied ? i.editReply(message) : i.reply({ ...message, flags: 64 });
  };
  async function inspect(subject) {
    const enrollment = (await pool.query(`SELECT discord_user_id,status,student_id,approved_by,approved_at,application_closed_at,application_closed_by,application_closed_as
      FROM certification_enrollments WHERE discord_user_id=$1`, [subject])).rows[0];
    if (!enrollment) return null;
    const courses = (await pool.query('SELECT course_key,status,assigned_at,completed_at FROM certification_course_enrollments WHERE discord_user_id=$1 ORDER BY course_key', [subject])).rows;
    const open = ['application_closed_at', 'application_closed_by', 'application_closed_as'].every(field => Object.hasOwn(enrollment, field) && enrollment[field] == null);
    const prior = typeof enrollment.student_id === 'string' && enrollment.student_id.trim().length > 0 && validId(enrollment.approved_by) && enrollment.approved_at != null;
    return { enrollment, courses, assignable: open && prior && enrollment.status === 'approved' && !(courses.length && courses.every(course => course.status === 'completed')),
      completable: open && prior && ['approved', 'suspended', 'revoked'].includes(enrollment.status) };
  }
  async function handle(i) {
    const id = i.customId || ''; if (!id.startsWith(prefix)) return false;
    if (!context(i)) { await respond(i, { content: 'Owner authorization in the configured server is required.' }); return true; }
    let issued;
    try {
      const stamp = now(); if (!Number.isSafeInteger(stamp) || stamp < 0 || stamp > Number.MAX_SAFE_INTEGER - 300000) throw new Error('Invalid confirmation clock');
      for (const [token, record] of pending) if (record.expiresAt <= stamp) pending.delete(token);
      const confirm = /^cert:courselife:(confirm|cancel):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(id);
      if (confirm && i.isButton?.()) {
        const record = pending.get(confirm[2]);
        if (!record || record.actor !== i.user.id || record.guild !== i.guildId) { await respond(i, { content: 'Confirmation expired, already used, or invalidated by restart. Start again.' }); return true; }
        pending.delete(confirm[2]);
        if (confirm[1] === 'cancel') { await respond(i, { content: 'Canceled. This confirmation did not change course records.' }); return true; }
        await i.deferReply({ flags: 64 });
        const result = record.action === 'assign' ? await service.assignCourses(record.actor, record.subject, [...record.keys]) : await service.completeCourse(record.actor, record.subject, record.keys[0]);
        await respond(i, { content: `Discord user: ${record.subject}. Action: ${record.action}. Courses: ${record.keys.join(', ')}. ${result.alreadyAssigned || result.alreadyCompleted ? 'Already recorded; the backend preserved the prior record.' : 'Change recorded with its audit event.'} Active courses: ${result.activeCourseCount}. All assigned courses complete: ${result.allAssignedCoursesCompleted ? 'Yes' : 'No'}. This is not deletion authorization. No records were deleted and no certificate was issued.` }); return true;
      }
      const panel = /^cert:courselife:open:([0-9]{17,20}):([0-9]{1,4})$/.exec(id);
      const assign = /^cert:courselife:assign:([0-9]{17,20})$/.exec(id);
      const complete = /^cert:courselife:complete:([0-9]{17,20}):([a-z0-9][a-z0-9-]{0,39})$/.exec(id);
      if ((panel && !i.isButton?.()) || (assign && !i.isStringSelectMenu?.()) || (complete && (!i.isButton?.() || !allowed.has(complete[2]))) || (!panel && !assign && !complete)) throw new Error('Invalid owner course action');
      const keys = assign ? i.values : complete ? [complete[2]] : [];
      if (assign && (!Array.isArray(keys) || !keys.length || keys.length > 25 || new Set(keys).size !== keys.length || !keys.every(key => allowed.has(key)))) throw new Error('Invalid selected courses');
      const subject = (panel || assign || complete)[1]; await i.deferReply({ flags: 64 });
      const state = await inspect(subject);
      if (!state) { await respond(i, { content: 'Enrollment record not found.' }); return true; }
      if (panel) {
        const page = Number(panel[2]), pages = Math.max(1, Math.ceil(state.courses.length / 5)); if (page >= pages) throw new Error('Invalid course record page');
        const visible = state.courses.slice(page * 5, page * 5 + 5), components = [];
        const available = COURSE_SECTION_CATALOG.filter(course => !state.courses.some(stored => stored.course_key === course.key));
        if (state.assignable && available.length) components.push(row([{ type: 3, custom_id: `${prefix}assign:${subject}`, placeholder: 'Select exact courses to assign', min_values: 1, max_values: available.length,
          options: available.map(course => ({ label: course.title.slice(0, 100), value: course.key })) }]));
        const completionButtons = state.completable ? visible.filter(course => course.status === 'active' && allowed.has(course.course_key)).map(course => button(`${prefix}complete:${subject}:${course.course_key}`, `Complete ${course.course_key}`)) : [];
        if (completionButtons.length) components.push(row(completionButtons));
        const navigation = [button(`cert:students:detail:${subject}`, 'Student record'), button(`${prefix}open:${subject}:${page}`, 'Refresh courses')];
        if (page > 0) navigation.push(button(`${prefix}open:${subject}:${page - 1}`, 'Previous'));
        if (page + 1 < pages) navigation.push(button(`${prefix}open:${subject}:${page + 1}`, 'Next'));
        components.push(row(navigation));
        await respond(i, { embeds: [{ title: 'Owner — course assignments and completion', color: 0x3498db,
          description: `Discord user: ${subject}. Stored enrollment status: ${state.enrollment.status}. Page ${page + 1}/${pages}. ${visible.map(course => `${course.course_key}: ${course.status}`).join(' • ') || 'No assigned courses.'} Opening this panel changes nothing. Selections require separate confirmation. Backend checks current acknowledgment and enrollment before assignment. Completion is admin-confirmed, not inferred from lesson views. Unmapped/retired assignments require separate review.`.slice(0, 3500) }], components }); return true;
      }
      const action = assign ? 'assign' : 'complete';
      if (assign && !state.assignable) throw new Error('Enrollment is not assignable');
      if (complete) {
        const course = state.courses.find(value => value.course_key === complete[2]);
        if (!state.completable || !course) throw new Error('Explicit eligible course assignment required');
        if (course.status === 'completed') { await respond(i, { content: 'This course is already completed. No new completion was requested.' }); return true; }
        if (course.status !== 'active') throw new Error('Invalid course state');
      }
      if (pending.size >= 100) { await respond(i, { content: 'Too many pending course confirmations. Cancel one or retry after five minutes.' }); return true; }
      issued = randomUUID();
      pending.set(issued, Object.freeze({ actor: i.user.id, guild: i.guildId, subject, action, keys: Object.freeze([...keys]), expiresAt: stamp + 300000 }));
      await respond(i, { content: `Confirm ${action} for Discord user ${subject}? Exact course keys: ${keys.join(', ')}. ${assign ? 'Assignment requires current approved enrollment; it does not authorize lab execution.' : 'Admin-confirmed completion ends access to that course through the course-specific checks. It is not a certificate award.'} The backend rechecks current records. No deletion occurs. This confirmation expires in five minutes and works once.`,
        components: [row([button(`${prefix}confirm:${issued}`, 'Confirm course change', 4), button(`${prefix}cancel:${issued}`, 'Cancel')])] }); issued = undefined; return true;
    } catch {
      if (issued) pending.delete(issued);
      await respond(i, { content: 'Course change could not be confirmed. Review the current course and enrollment records before retrying.' }); return true;
    }
  }
  function decorateAdminInteraction(i) {
    const detail = /^cert:students:detail:([0-9]{17,20})$/.exec(i.customId || '');
    if (!detail || !context(i) || !i.isButton?.()) return i;
    return new Proxy(i, { get(target, key) {
      if (key === 'editReply') return payload => {
        if (!payload.embeds?.length) return target.editReply(payload);
        const components = (payload.components || []).map(raw => { const data = json(raw); return { ...data, components: [...data.components] }; });
        const entry = button(`${prefix}open:${detail[1]}:0`, 'Assignments / complete course');
        if (components.length < 5) components.push(row([entry]));
        else { const last = [...components].reverse().find(item => item.type === 1 && item.components.length < 5 && item.components.every(component => json(component).type === 2)); if (last) last.components.push(entry); }
        return target.editReply({ ...payload, components });
      };
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
  }
  return Object.freeze({ handle, decorateAdminInteraction, dispose() { disposed = true; pending.clear(); } });
}

export async function createReadyManagedCourseNavigation(pool, config, guildId, options, { createNavigation = createReadyCourseNavigation, createControls = createCourseLifecycleAdminControls } = {}) {
  const navigation = await createNavigation(pool, config, guildId, options);
  try {
    const controls = await createControls(pool, config, guildId, { now: options?.now });
    return Object.freeze({ handle: navigation.handle, handleAdmin: controls.handle, decorateAdminInteraction: controls.decorateAdminInteraction,
      dispose() { try { navigation.dispose(); } finally { controls.dispose(); } } });
  } catch (error) { navigation.dispose(); throw error; }
}
