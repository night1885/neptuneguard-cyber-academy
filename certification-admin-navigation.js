import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export const ADMIN_SECTIONS = Object.freeze([
  Object.freeze({ label: 'Overview', value: 'overview', description: 'Enrollment and lab request counts' }),
  Object.freeze({ label: 'Enrollment requests', value: 'enrollments', description: 'Review pending enrollment acknowledgments' }),
  Object.freeze({ label: 'Lab requests', value: 'labs', description: 'Review lab requests; does not launch sessions' }),
  Object.freeze({ label: 'Students', value: 'students', description: 'Open the student directory and access controls' })
]);
const COURSE_SECTION = Object.freeze({ label: 'Course Overview', value: 'courses', description: 'Browse registered teaching material without changing learner records' });

export function buildAdminNavigation(selected = 'overview', { includeCourses = false } = {}) {
  const sections = includeCourses ? [...ADMIN_SECTIONS, COURSE_SECTION] : ADMIN_SECTIONS;
  if (!sections.some(section => section.value === selected)) {
    throw new Error('Invalid admin dashboard section');
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('cert:admin:section')
    .setPlaceholder('Choose an admin dashboard section')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(sections.map(section => ({ ...section, default: section.value === selected })));
  return new ActionRowBuilder().addComponents(menu);
}

export function adminSectionTarget(value) {
  if (value === 'courses') return 'cert:admin:courses:0';
  if (!ADMIN_SECTIONS.some(section => section.value === value)) return null;
  return value === 'students' ? 'cert:students:list:0' : `cert:admin:${value}:0`;
}
