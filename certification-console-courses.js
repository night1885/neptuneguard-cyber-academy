import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { COURSES } from './course-registry.js';
const PREFIX = 'cert:admin:courses:';
const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(id).setLabel(label.slice(0, 80)).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const row = buttons => new ActionRowBuilder().addComponents(buttons);
const label = key => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
export function courseContentText(value, depth = 0) {
  if (Array.isArray(value)) return value.map((item, i) => `${'  '.repeat(depth)}${i + 1}. ${courseContentText(item, depth + 1)}`).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${'  '.repeat(depth)}${label(key)}: ${item && typeof item === 'object' ? '\n' : ''}${courseContentText(item, depth + 1)}`).join('\n');
  return value === null || value === undefined ? 'Not supplied' : String(value);
}
export async function handleConsoleCourses(interaction, config, guildId) {
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
  const navigation = row([button('cert:admin:overview:0', 'Admin Dashboard'), button(`${PREFIX}0`, 'Course Overview')]);
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
    components.push(row([button(`${PREFIX}${Math.max(0, page - 1)}`, 'Previous courses', page === 0), button(`${PREFIX}${page}`, 'Refresh courses'), button(`${PREFIX}${page + 1}`, 'Next courses', page + 1 >= pages)]));
  } else {
    const match = moduleView || courseView;
    const courseIndex = Number(match[1]), course = COURSES[courseIndex];
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
