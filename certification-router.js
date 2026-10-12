import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { handleCertificationDashboard } from './certification-dashboard.js';
import { handleEnrollmentAction } from './certification-enrollment-actions.js';
import { createCertificationService } from './certification-service.js';

export function createCertificationRouter(pool, config, guildId) {
  if (!/^\d{17,20}$/.test(guildId || '')) throw new Error('Configured guild ID required');
  const service = createCertificationService(pool, config);
  return async function routeCertificationInteraction(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('cert:')) return false;
    if (interaction.customId.startsWith('cert:enrollment:')) {
      return handleEnrollmentAction(interaction, pool, config, guildId, service);
    }
    if (interaction.customId.startsWith('cert:admin:')) {
      const adapter = {
        user: interaction.user,
        guildId: interaction.guildId,
        customId: interaction.customId,
        isButton: () => true,
        deferReply: options => interaction.deferReply(options),
        editReply: async payload => {
          if (/^cert:admin:enrollments:\d+$/.test(interaction.customId) &&
              config.enabled && interaction.user.id === config.ownerId && interaction.guildId === guildId) {
            const fields = payload.embeds?.[0]?.data?.fields || [];
            const studentIds = fields.map(field => /^Student (\d{17,20})$/.exec(field.name)?.[1]).filter(Boolean);
            if (studentIds.length) {
              const reviewRow = new ActionRowBuilder().addComponents(studentIds.map((id, index) =>
                new ButtonBuilder().setCustomId(`cert:enrollment:review:${id}`)
                  .setLabel(`Review ${index + 1}`).setStyle(ButtonStyle.Primary)));
              payload = { ...payload, components: [...(payload.components || []), reviewRow] };
            }
          }
          return interaction.editReply(payload);
        }
      };
      return handleCertificationDashboard(adapter, pool, config, guildId);
    }
    await interaction.reply({ content: 'This certification feature is not connected yet.', flags: 64 });
    return true;
  };
}
