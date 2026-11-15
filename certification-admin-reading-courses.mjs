const prefix = 'cert:admin:courses:';
const types = ['overview', 'module', 'lesson'];
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
// Metadata only: importing the shared inspector must not load academy runtime dependencies.
export const ADMIN_READING_COURSES = Object.freeze([
  Object.freeze({ key: 'ethical-hacking-reading', title: 'Ethical Hacking' }),
  Object.freeze({ key: 'bug-bounty-reading', title: 'Bug Bounty' })
]);
export async function handleAdminReadingCourse(interaction, config, guildId, { index, course, cursor, canInspect, renderPage = null } = {}) {
  const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } });
  const authorized = () => config?.enabled === true && typeof canInspect === 'function' && canInspect(interaction, config, guildId) === true;
  if (!authorized()) { await respond({ content: 'Admin course preview is unavailable or not authorized in this context.' }); return true; }
  try {
    if (!Number.isSafeInteger(index) || index < 0 || index > 99999 || !ADMIN_READING_COURSES.some(item => item.key === course?.key) || (renderPage !== null && typeof renderPage !== 'function')) throw Error('Invalid preview');
    if (renderPage === null) {
      const [{ COURSE_SECTION_CATALOG }, { renderStudentCoursePage }] = await Promise.all([
        import('./certification-course-sections.js'), import('./certification-student-course-renderer.js')
      ]);
      if (!authorized() || !COURSE_SECTION_CATALOG.some(item => item.key === course.key)) throw Error('Registered authorized preview required');
      renderPage = renderStudentCoursePage;
    }
    if (!authorized()) throw Error('Context changed');
    const buttonId = next => {
      const match = /^(overview|module|lesson):(0|[1-9][0-9]{0,3}):(0|[1-9][0-9]{0,3})$/.exec(next || '');
      if (!match) throw Error('Invalid reading cursor');
      return `${prefix}module:${index}:${types.indexOf(match[1]) * 10000 + Number(match[2])}:${Number(match[3])}`;
    };
    const payload = await renderPage({ courseKey: course.key, cursor, buttonId });
    if (!authorized()) throw Error('Context changed');
    if (!payload || !Array.isArray(payload.embeds) || payload.embeds.length !== 1 || !Array.isArray(payload.components) || payload.components.length > 5) throw Error('Invalid reading payload');
    const rows = payload.components.map(raw => { const row = json(raw); return { ...row, components: row.components.map(rawButton => ({ ...json(rawButton) })) }; });
    const ids = new Set();
    for (const row of rows) {
      if (row.type !== 1 || !row.components.length || row.components.length > 5) throw Error('Invalid reading row');
      for (const button of row.components) {
        const match = new RegExp(`^${prefix}module:${index}:([0-9]{1,5}):([0-9]{1,4})$`).exec(button.custom_id || '');
        if (button.type !== 2 || button.url || !match || Number(match[1]) >= 30000 || ids.has(button.custom_id)) throw Error('Invalid reading button');
        ids.add(button.custom_id);
      }
    }
    const navigation = [{ type: 2, style: 2, custom_id: `${prefix}0`, label: 'All courses' }, { type: 2, style: 2, custom_id: 'cert:admin:overview:0', label: 'Admin Dashboard' }];
    if (rows.length < 5) rows.unshift({ type: 1, components: navigation });
    else {
      const target = rows.find(row => row.components.length <= 3);
      if (!target) throw Error('No room for admin navigation');
      target.components.push(...navigation);
    }
    const embed = { ...json(payload.embeds[0]), footer: { text: 'Admin-only read-only preview • Teaching material remains draft • No learner assignment required for this admin view • No progress, grade, completion, certificate or practical authorization granted' } };
    await respond({ embeds: [embed], components: rows });
  } catch {
    await respond({ content: 'Admin course preview is unavailable or its teaching source could not be validated. No learner records were changed.' });
  }
  return true;
}
export function adminReadingCursor(encoded, page) {
  if (!Number.isSafeInteger(encoded) || encoded < 0 || encoded >= 30000 || !Number.isSafeInteger(page) || page < 0 || page > 9999) throw Error('Invalid admin reading cursor');
  return `${types[Math.floor(encoded / 10000)]}:${encoded % 10000}:${page}`;
}
