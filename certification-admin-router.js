import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createCertificationRouter as createExistingRouter } from './certification-router.js';
import { adminSectionTarget, buildAdminNavigation } from './certification-admin-navigation.js';
import { handleConsoleSettings } from './certification-console-settings.js';
import { handleConsoleBrowser } from './certification-console-browser.js';
import { createConsoleLabController } from './certification-console-labs.js';
import { handleConsoleStudent } from './certification-console-student.js';
import { withConsolePresentation } from './certification-console-presentation.js';

export function createCertificationRouter(pool, config, guildId) {
  const route = createExistingRouter(pool, config, guildId);
  const labs = createConsoleLabController(pool, config, guildId);
  return withConsolePresentation(async function routeWithAdminNavigation(interaction) {
    if (await handleConsoleStudent(interaction, pool, config, guildId)) return true;
    if (await labs(interaction)) return true;
    if (await handleConsoleBrowser(interaction, pool, config, guildId)) return true;
    if (await handleConsoleSettings(interaction, config, guildId)) return true;
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
            if (components.length < 5) components.push(new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('cert:console:settings').setLabel('Configuration').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('cert:dir:search').setLabel('Search / filter students').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('cert:audit:0').setLabel('Audit history').setStyle(ButtonStyle.Secondary),
              new ButtonBuilder().setCustomId('cert:labview:all:0').setLabel('Lab records').setStyle(ButtonStyle.Secondary)
            ));
            payload = { ...payload, components };
          }
          return original.editReply(payload);
        };
        const value = Reflect.get(original, key, original);
        return typeof value === 'function' ? value.bind(original) : value;
      }
    });
    return route(adapter);
  }, config, guildId);
}
