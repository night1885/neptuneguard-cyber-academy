export const RETENTION_HOLD_MESSAGE = 'Learner-account workflows are temporarily unavailable while dashboard and registration integration checks are completed. No registration, approval, course activity, or saved-progress action was performed. Existing records have not been deleted.';

export async function replyRetentionHold(interaction) {
  const payload = { content: RETENTION_HOLD_MESSAGE, components: [], embeds: [], allowedMentions: { parse: [] } };
  if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
  else await interaction.reply({ ...payload, flags: 64 });
}

export async function pauseRetainingAcademyInteraction(interaction) {
  const command = interaction.isChatInputCommand?.() && interaction.commandName !== 'catalog';
  const button = interaction.isButton?.() && /^(academy:|linux-|badge-page:)/.test(interaction.customId || '');
  if (!command && !button) return false;
  await replyRetentionHold(interaction);
  return true;
}
