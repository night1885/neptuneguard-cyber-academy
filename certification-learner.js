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

export function certificationLearnerEntry() {
  return { content: 'Certification learning — approved enrollment required', components: [new ActionRowBuilder().addComponents(button('cert:contents', 'Open learning contents'))], allowedMentions: { parse: [] } };
}

export async function handleCertificationLearner(interaction, config, guildId, service) {
  if (!interaction.isButton() || !(interaction.customId === 'cert:contents' || interaction.customId.startsWith('cert:lesson:') || interaction.customId.startsWith('cert:help:'))) return false;
  await interaction.deferReply({ flags: 64 });
  const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
  if (!config.enabled || interaction.guildId !== guildId || !/^\d{17,20}$/.test(interaction.user?.id || '')) {
    await respond({ content: 'Certification learning is unavailable in this context.' }); return true;
  }
  const authorization = await service.getCourseAuthorization(interaction.user.id);
  if (!authorization || typeof authorization.student_id !== 'string' || !authorization.student_id.trim()) {
    await respond({ content: 'An approved certification enrollment with a permanent student ID is required. Pending, suspended, revoked, or denied enrollment does not grant access.' }); return true;
  }
  if (interaction.customId === 'cert:contents') {
    await respond({ content: 'Certification contents: Training readiness. Technical curriculum, assessments, enrollment submission, and hosted labs are not connected by this change.', components: [new ActionRowBuilder().addComponents(button(`cert:lesson:${lessonKey}:0`, title))] });
    return true;
  }
  const match = /^cert:(lesson|help):([a-z0-9-]{1,40}):(\d{1,6})$/.exec(interaction.customId);
  if (!match || match[2] !== lessonKey || Number(match[3]) >= pages.length) {
    await respond({ content: 'Unknown lesson or invalid page. Open the contents again.' }); return true;
  }
  const page = Number(match[3]);
  if (match[1] === 'help') {
    await respond({ content: `Training readiness — step ${page + 1}/${pages.length}. If permission or scope is unclear, stop and contact eadred@neptuneguard.com. This help action does not grant lab authorization.`, components: [new ActionRowBuilder().addComponents(button(`cert:lesson:${lessonKey}:${page}`, 'Return to lesson'), button('cert:contents', 'Contents'))] });
  } else {
    await respond(buildCertificationLessonPage({ lessonKey, title, pages, page, studentId: authorization.student_id }));
  }
  return true;
}
