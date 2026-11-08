import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { COURSES } from './course-registry.js';
import { formalLessonTitle } from './certification-formal-lesson-title.mjs';
const PREFIX = 'cert:admin:courses:';
const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(disabled ? `cert:disabled:courses:${id}` : id).setLabel(label.slice(0, 80)).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const row = buttons => new ActionRowBuilder().addComponents(buttons);
const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
export function courseContentText(value, depth = 0) {
  if (Array.isArray(value)) return value.map((item, i) => `${'  '.repeat(depth)}${i + 1}. ${courseContentText(item, depth + 1)}`).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${'  '.repeat(depth)}${label(key)}: ${item && typeof item === 'object' ? '\n' : ''}${courseContentText(item, depth + 1)}`).join('\n');
  return value === null || value === undefined ? 'Not supplied' : String(value);
}
export async function handleConsoleCourses(interaction, config, guildId, formalPreview = null) {
  const { FORMAL_ADMIN_PREVIEW_INDEX, FORMAL_ADMIN_PREVIEW_TITLE, canInspectFormalAdminPreview, loadFormalAdminPreview } = formalPreview || {};
  const id = interaction.customId || '';
  if (!interaction.isButton?.() || !id.startsWith(PREFIX)) return false;
  await interaction.deferReply({ flags: 64 });
  const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
  if (!config.enabled || !config.ownerId || !guildId || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await respond({ content: 'Admin authorization in the configured server is required.' }); return true;
  }
  const catalog = /^cert:admin:courses:(\d{1,5})$/.exec(id);
  const courseView = /^cert:admin:courses:course:(\d{1,5}):(\d{1,5})$/.exec(id);
  const moduleView = /^cert:admin:courses:module:(\d{1,5}):(\d{1,5}):(\d{1,5})$/.exec(id);
  const invalid = async () => { await respond({ content: 'Invalid course, module, or page. Reopen Course Overview from the Admin Dashboard.' }); return true; };
  if (!catalog && !courseView && !moduleView) return invalid();
  const navigation = row([button('cert:admin:overview:0', 'Admin Dashboard'), ...(!catalog ? [button(`${PREFIX}0`, 'Course Overview')] : [])]);
  const embed = new EmbedBuilder().setColor(0x3498db).setFooter({ text: 'Admin Dashboard • Read-only curriculum • No progress, access, or lab changes' });
  let components = [navigation];
  if (catalog) {
    const page = Number(catalog[1]), pages = Math.max(1, Math.ceil(COURSES.length / 5));
    if (page >= pages) return invalid();
    const courses = COURSES.slice(page * 5, page * 5 + 5);
    embed.setTitle('Admin Dashboard — Course Overview').setDescription(`Browse the same registered teaching content used by the academy. This is an admin inspection view, not a student learning session.\n\n${COURSES.length} courses • ${COURSES.reduce((sum, course) => sum + course.modules.length, 0)} modules\nPage ${page + 1} of ${pages}`);
    if (courses.length) {
      embed.addFields(courses.map(course => ({ name: course.title.slice(0, 256), value: `${course.modules.length} modules • ${course.key}` })));
      components.push(row(courses.map((course, index) => button(`${PREFIX}course:${page * 5 + index}:0`, course.title))));
    }
    if (page === 0 && typeof canInspectFormalAdminPreview === 'function' && canInspectFormalAdminPreview(interaction, config, guildId)) {
      let preview;
      try { preview = await loadFormalAdminPreview({ interaction, config, guildId }); } catch {}
      embed.addFields({ name: 'Formal programme — unpublished draft', value: preview
        ? `${FORMAL_ADMIN_PREVIEW_TITLE}. ${preview.lessons.length} catalogue-listed draft lessons/capstones; not additional registered courses. Source availability is checked when each lesson is opened.`
        : 'Draft preview unavailable; its source could not be validated. Registered courses are unchanged.' });
      components.push(row([button(`${PREFIX}course:${FORMAL_ADMIN_PREVIEW_INDEX}:0`, FORMAL_ADMIN_PREVIEW_TITLE, !preview)]));
    }
    components.push(row([button(`${PREFIX}${Math.max(0, page - 1)}`, 'Previous courses', page === 0), button(`${PREFIX}${page}`, 'Refresh courses'), button(`${PREFIX}${page + 1}`, 'Next courses', page + 1 >= pages)]));
  } else {
    const match = moduleView || courseView;
    const courseIndex = Number(match[1]), course = COURSES[courseIndex];
    if (courseIndex === FORMAL_ADMIN_PREVIEW_INDEX) {
      try {
        embed.setColor(0x8e44ad).setFooter({ text: 'Owner draft preview • Not published • No learner access, progress, submission or exercise authorization' });
        if (courseView) {
          const page = Number(courseView[2]), preview = await loadFormalAdminPreview({ interaction, config, guildId, page });
          const pages = Math.ceil(preview.lessons.length / 5), lessons = preview.lessons.slice(page * 5, page * 5 + 5);
          embed.setTitle(FORMAL_ADMIN_PREVIEW_TITLE).setDescription(`Unpublished authoring material — owner inspection only.\n\n${preview.lessons.length} catalogue-listed draft lessons/capstones, not ${preview.lessons.length} courses. Lab delivery: student-built; reading grants no exercise permission. No XP, progress, submissions, grades or awards are recorded.\n\nLesson group ${page + 1}/${pages}. Supporting/instructor documents are not silently added.`);
          embed.addFields(lessons.map(lesson => ({ name: lesson.id, value: `Draft lesson • ${lesson.requires.length} catalogue prerequisite(s). Open to inspect the authored source.` })));
          components.push(row(lessons.map((lesson, index) => button(`${PREFIX}module:${FORMAL_ADMIN_PREVIEW_INDEX}:${page * 5 + index}:0`, lesson.id))));
          components.push(row([button(`${PREFIX}course:${FORMAL_ADMIN_PREVIEW_INDEX}:${Math.max(0, page - 1)}`, 'Previous lessons', page === 0), button(`${PREFIX}course:${FORMAL_ADMIN_PREVIEW_INDEX}:${page}`, 'Refresh draft lessons'), button(`${PREFIX}course:${FORMAL_ADMIN_PREVIEW_INDEX}:${page + 1}`, 'Next lessons', page + 1 >= pages)]));
        } else {
          const lessonIndex = Number(moduleView[2]), page = Number(moduleView[3]);
          const lesson = await loadFormalAdminPreview({ interaction, config, guildId, lessonIndex, page });
          embed.setTitle(formalLessonTitle(lesson)).setDescription(lesson.text).addFields(
            { name: 'Unpublished draft inspection', value: `Authored content page ${page + 1}/${lesson.pageCount}. Read-only; not learner release, prerequisite validation or permission to execute examples.` },
            { name: 'Catalogue prerequisites', value: lesson.requires.join(' • ') || 'None listed in the draft catalogue.' });
          components.push(row([button(`${PREFIX}course:${FORMAL_ADMIN_PREVIEW_INDEX}:${Math.floor(lessonIndex / 5)}`, 'Back to draft lessons'), button(`${PREFIX}module:${FORMAL_ADMIN_PREVIEW_INDEX}:${lessonIndex}:${Math.max(0, page - 1)}`, 'Previous draft page', page === 0), button(`${PREFIX}module:${FORMAL_ADMIN_PREVIEW_INDEX}:${lessonIndex}:${page + 1}`, 'Next draft page', page + 1 >= lesson.pageCount)]));
          if (lesson.requires.length) components.push(row(lesson.requires.slice(0, 5).map((id, index) => button(`${PREFIX}module:${FORMAL_ADMIN_PREVIEW_INDEX}:${lesson.prerequisiteIndexes[index]}:0`, `Read prerequisite ${id}`))));
        }
        await respond({ embeds: [embed], components }); return true;
      } catch {
        await respond({ content: 'Formal draft preview is unavailable in this context or its source could not be validated. Registered courses are unchanged.' }); return true;
      }
    }
    if (!course) return invalid();
    if (courseView) {
      const page = Number(courseView[2]), pages = Math.max(1, Math.ceil(course.modules.length / 5));
      if (page >= pages) return invalid();
      const modules = course.modules.slice(page * 5, page * 5 + 5);
      embed.setTitle(course.title.slice(0, 256)).setDescription(`Modules in curriculum order • Page ${page + 1} of ${pages}\nOpen any module to inspect its full registered teaching content. Student prerequisites and authorization are unchanged.`);
      if (modules.length) {
        embed.addFields(modules.map(module => ({ name: `Module ${module.number}: ${module.title}`.slice(0, 256), value: String(module.overview || 'Open module for teaching content.').slice(0, 1024) })));
        components.push(row(modules.map((module, index) => button(`${PREFIX}module:${courseIndex}:${page * 5 + index}:0`, `Module ${module.number}`))));
      }
      components.push(row([button(`${PREFIX}course:${courseIndex}:${Math.max(0, page - 1)}`, 'Previous modules', page === 0), button(`${PREFIX}course:${courseIndex}:${page}`, 'Refresh modules'), button(`${PREFIX}course:${courseIndex}:${page + 1}`, 'Next modules', page + 1 >= pages)]));
    } else {
      const moduleIndex = Number(moduleView[2]), page = Number(moduleView[3]), module = course.modules[moduleIndex];
      if (!module) return invalid();
      const text = courseContentText(module), pages = Math.max(1, Math.ceil(text.length / 3500));
      if (page >= pages) return invalid();
      embed.setTitle(`${course.title} — Module ${module.number}: ${module.title}`.slice(0, 256)).setDescription(text.slice(page * 3500, (page + 1) * 3500) || 'No registered content.').addFields({ name: 'Admin inspection', value: `Content page ${page + 1} of ${pages}. Includes all registered module fields, including quiz answers and explanations where supplied. No lesson completion, XP, lab execution, or learner impersonation occurs.` });
      components.push(row([button(`${PREFIX}course:${courseIndex}:${Math.floor(moduleIndex / 5)}`, 'Back to modules'), button(`${PREFIX}module:${courseIndex}:${moduleIndex}:${Math.max(0, page - 1)}`, 'Previous content', page === 0), button(`${PREFIX}module:${courseIndex}:${moduleIndex}:${page + 1}`, 'Next content', page + 1 >= pages)]));
    }
  }
  await respond({ embeds: [embed], components }); return true;
}
