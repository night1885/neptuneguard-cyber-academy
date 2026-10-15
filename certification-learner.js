import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { buildCertificationLessonPage } from './certification-ui.js';

const lessonKey = 'training-readiness';
const title = 'Training readiness';
const pages = [
  { instructions: 'Enrollment, lab authorization, and certificate awards are separate. An approved enrollment and permanent student ID do not authorize testing arbitrary systems. This introductory lesson does not accept agreement signatures or activate lab access.' },
  { instructions: 'Before a lab, obtain explicit authorization identifying targets, permitted activities, exclusions, start and expiration times, and stop conditions. Do not begin when authorization is missing, unclear, expired, suspended, or revoked.' },
  { instructions: 'Stop when instructed or when scope is unclear. Report unexpected third-party targets, sensitive data, or disruption privately to eadred@neptuneguard.com. Do not publish passwords, tokens, signed documents, or sensitive findings in public channels.' }
];
const button = (id, label) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Primary);
const navigation = () => new ActionRowBuilder().addComponents(button('cert:learner:home', 'Student home'), button('cert:contents', 'Learning contents'), button('cert:learner:status', 'My status'));
const safe = value => String(value).replace(/[`*_~|<>@]/g, '').slice(0, 100);

export function certificationLearnerEntry() {
  return { content: 'NeptuneGuard student panel — approved enrollment required', components: [new ActionRowBuilder().addComponents(button('cert:learner:home', 'Open student panel'))], allowedMentions: { parse: [] } };
}

export async function handleCertificationLearner(interaction, config, guildId, service) {
  const id = interaction.customId || '';
  if (!interaction.isButton() || !(id === 'cert:contents' || id.startsWith('cert:learner:') || id.startsWith('cert:lesson:') || id.startsWith('cert:help:'))) return false;
  const originUser = interaction.message?.interactionMetadata?.user?.id || interaction.message?.interaction?.user?.id;
  const privateSource = interaction.message?.flags?.has?.(64) === true;
  const validContext = config.enabled && interaction.guildId === guildId && /^\d{17,20}$/.test(interaction.user?.id || '');
  if (validContext && privateSource && (!originUser || originUser === interaction.user.id)) await interaction.deferUpdate();
  else await interaction.deferReply({ flags: 64 });
  const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
  if (!validContext) {
    await respond({ content: 'Certification learning is unavailable in this context.' }); return true;
  }
  const authorization = await service.getCourseAuthorization(interaction.user.id);
  if (!authorization || typeof authorization.student_id !== 'string' || !authorization.student_id.trim()) {
    await respond({ content: 'An approved certification enrollment with a permanent student ID is required. Pending, suspended, revoked, or denied enrollment does not grant access.' }); return true;
  }
  if (id === 'cert:learner:home') {
    await respond({ embeds: [{ title: 'NeptuneGuard — Student home', color: 0x3498db, description: 'Your private student panel. Use the buttons below to navigate in this message.', fields: [
      { name: 'Student ID', value: safe(authorization.student_id) },
      { name: 'Available learning', value: 'Training readiness — introductory guidance only. Comprehensive curriculum development is pending.' },
      { name: 'Labs and certificates', value: 'Lab requests, hosted sessions, and certificate issuance are not available from this panel. Course access is not lab authorization.' }
    ], footer: { text: 'Private student panel • No access changes' } }], components: [navigation()] }); return true;
  }
  if (id === 'cert:learner:status') {
    await respond({ embeds: [{ title: 'My course access', color: 0x2ecc71, description: 'Your course authorization was checked for this interaction.', fields: [
      { name: 'Student ID', value: safe(authorization.student_id) },
      { name: 'Course access', value: 'Approved enrollment and required current acknowledgment checks passed.' },
      { name: 'Progress', value: 'Completion reporting is not connected in this panel. Opening a lesson does not mark it complete.' },
      { name: 'Lab authorization', value: 'Not evaluated here. Course approval does not grant lab access.' }
    ] }], components: [navigation()] }); return true;
  }
  if (id === 'cert:contents') {
    await respond({ content: 'Certification contents: Training readiness. Technical curriculum, assessments, enrollment submission, and hosted labs are not connected by this change.', components: [new ActionRowBuilder().addComponents(button(`cert:lesson:${lessonKey}:0`, title)), navigation()] });
    return true;
  }
  const match = /^cert:(lesson|help):([a-z0-9-]{1,40}):(\d{1,6})$/.exec(id);
  if (!match || match[2] !== lessonKey || Number(match[3]) >= pages.length) {
    await respond({ content: 'Unknown lesson or invalid page. Open the contents again.', components: [navigation()] }); return true;
  }
  const page = Number(match[3]);
  if (match[1] === 'help') {
    await respond({ content: `Training readiness — step ${page + 1}/${pages.length}. If permission or scope is unclear, stop and contact eadred@neptuneguard.com. This help action does not grant lab authorization.`, components: [new ActionRowBuilder().addComponents(button(`cert:lesson:${lessonKey}:${page}`, 'Return to lesson'), button('cert:contents', 'Contents')), new ActionRowBuilder().addComponents(button('cert:learner:home', 'Student home'))] });
  } else {
    const payload = buildCertificationLessonPage({ lessonKey, title, pages, page, studentId: authorization.student_id });
    await respond({ ...payload, components: [...(payload.components || []), new ActionRowBuilder().addComponents(button('cert:learner:home', 'Student home'), button('cert:learner:status', 'My status'))] });
  }
  return true;
}
