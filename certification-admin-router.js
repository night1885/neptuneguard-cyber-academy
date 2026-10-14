import { ActionRowBuilder } from 'discord.js';
import { createCertificationRouter as createExistingRouter } from './certification-router.js';
import { adminSectionTarget, buildAdminNavigation } from './certification-admin-navigation.js';

export function createCertificationRouter(pool, config, guildId) {
  const route = createExistingRouter(pool, config, guildId);
  return async function routeWithAdminNavigation(interaction) {
    const selection = interaction.isStringSelectMenu?.() && interaction.customId === 'cert:admin:section';
    let target = interaction.customId;
    if (selection) {
      if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
        await interaction.reply({ content: 'Owner authorization in the configured server is required.', flags: 64, allowedMentions: { parse: [] } });
        return true;
      }
      target = interaction.values?.length === 1 ? adminSectionTarget(interaction.values[0]) : null;
      if (!target) {
        await interaction.reply({ content: 'Invalid dashboard section. Open the dashboard again.', flags: 64, allowedMentions: { parse: [] } });
        return true;
      }
    } else if (interaction.isStringSelectMenu?.()) {
      if (!interaction.customId?.startsWith('cert:')) return false;
      await interaction.reply({ content: 'Unsupported certification menu.', flags: 64, allowedMentions: { parse: [] } });
      return true;
    }
    const view = /^cert:admin:(overview|enrollments|labs):\d{1,6}$/.exec(target || '');
    const students = /^cert:students:(list:\d{1,6}|detail:\d{17,20})$/.test(target || '');
    if (!selection && !view && !students) return route(interaction);
    const section = students ? 'students' : view?.[1];
    const adapter = new Proxy(interaction, {
      get(original, key) {
        if (key === 'customId') return target;
        if (selection && key === 'isButton') return () => true;
        if (selection && (key === 'isModalSubmit' || key === 'isStringSelectMenu')) return () => false;
        if (key === 'editReply') return payload => {
          if (section && config.enabled && original.user?.id === config.ownerId && original.guildId === guildId && payload.components?.length) {
            const components = [buildAdminNavigation(section), ...payload.components.slice(1)].map((row, rowIndex) => {
              const copy = ActionRowBuilder.from(row.toJSON());
              copy.components.forEach((component, componentIndex) => {
                if (component.data.type === 2 && component.data.disabled) {
                  component.setCustomId(`cert:disabled:${rowIndex}:${componentIndex}`);
                }
              });
              return copy;
            });
            payload = { ...payload, components };
          }
          return original.editReply(payload);
        };
        const value = Reflect.get(original, key, original);
        return typeof value === 'function' ? value.bind(original) : value;
      }
    });
    return route(adapter);
  };
}
