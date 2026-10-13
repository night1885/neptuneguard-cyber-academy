import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleOwnerLookup(interaction, config, guildId, openRecord) {
  if (!interaction.customId?.startsWith('cert:owner:lookup')) return false;
  const respond = content => interaction.reply({ content, flags: 64, allowedMentions: { parse: [] } });
  if (config.enabled !== true || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) { await respond('Owner authorization in the configured server is required.'); return true; }
  if (interaction.isButton() && interaction.customId === 'cert:owner:lookup') {
    const field = new TextInputBuilder().setCustomId('learner_id').setLabel('Learner Discord ID (17–20 digits)').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20);
    const modal = new ModalBuilder().setCustomId('cert:owner:lookup:submit').setTitle('Find learner enrollment').addComponents(new ActionRowBuilder().addComponents(field));
    await interaction.showModal(modal); return true;
  }
  if (interaction.isModalSubmit() && interaction.customId === 'cert:owner:lookup:submit') {
    let id; try { const value = interaction.fields.getTextInputValue('learner_id'); if (typeof value === 'string') id = value.trim(); } catch {}
    if (!/^\d{17,20}$/.test(id || '')) { await respond('Enter a learner Discord ID containing 17–20 digits. No record was changed. Use Find learner to try again.'); return true; }
    const forwarded = new Proxy(interaction, { get(target, property) {
      if (property === 'customId') return `cert:students:detail:${id}`;
      if (property === 'isButton') return () => true;
      if (property === 'isModalSubmit' || property === 'isStringSelectMenu') return () => false;
      const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    return openRecord(forwarded);
  }
  await respond('Invalid learner-lookup action. Reopen Find learner from the overview.'); return true;
}
