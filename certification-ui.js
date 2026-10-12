import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const CERTIFICATION_COLORS = Object.freeze({ instruction: 0x3498db, command: 0x9b59b6, output: 0x2ecc71 });

function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`Invalid ${label}; expected nonempty text up to ${max} characters`);
  }
  return value;
}

function code(value, language) {
  text(value, 3000, 'code block');
  if (value.includes('```')) throw new Error('Nested code fences are not supported');
  return '```' + language + '\n' + value + '\n```';
}

export function buildCertificationLessonPage({ lessonKey, title, pages, page = 0, studentId }) {
  if (!/^[a-z0-9-]{1,40}$/.test(lessonKey)) throw new Error('Invalid lesson key');
  if (!Array.isArray(pages) || !pages.length || !Number.isInteger(page) || page < 0 || page >= pages.length) {
    throw new Error('Invalid lesson page');
  }
  text(title, 180, 'lesson title');
  text(studentId, 80, 'student ID');
  const step = pages[page];
  const embeds = [new EmbedBuilder()
    .setColor(CERTIFICATION_COLORS.instruction)
    .setTitle(`${title} — ${page + 1}/${pages.length}`)
    .setDescription(text(step.instructions, 3000, 'instructions'))
    .setFooter({ text: `Student ${studentId} • Authorized training only` })];
  if (step.commands) embeds.push(new EmbedBuilder()
    .setColor(CERTIFICATION_COLORS.command)
    .setTitle('Commands — approved lab only')
    .setDescription(code(step.commands, /^[a-z0-9]{1,20}$/.test(step.language || '') ? step.language : 'text')));
  if (step.expectedOutput) embeds.push(new EmbedBuilder()
    .setColor(CERTIFICATION_COLORS.output)
    .setTitle('Expected output — example, not proof of execution')
    .setDescription(code(step.expectedOutput, 'text')));
  if (embeds.reduce((total, embed) => total + embed.length, 0) > 6000) {
    throw new Error('Lesson page exceeds embed budget; split into smaller steps');
  }
  const components = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cert:lesson:${lessonKey}:${Math.max(0, page - 1)}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`cert:lesson:${lessonKey}:${Math.min(pages.length - 1, page + 1)}`).setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(page === pages.length - 1),
    new ButtonBuilder().setCustomId('cert:contents').setLabel('Contents').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cert:help:${lessonKey}:${page}`).setLabel('Help').setStyle(ButtonStyle.Secondary)
  )];
  return { content: '', embeds, components, allowedMentions: { parse: [] } };
}
