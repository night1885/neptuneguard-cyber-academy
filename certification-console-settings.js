const safe = value => String(value ?? 'Not configured').replace(/[`*_~|<>]/g, '').slice(0, 100);

export async function handleConsoleSettings(interaction, config, guildId) {
  if (!interaction.isButton?.() || interaction.customId !== 'cert:console:settings') return false;
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.reply({ content: 'Admin authorization in the configured server is required.', flags: 64, allowedMentions: { parse: [] } });
    return true;
  }
  await interaction.deferReply({ flags: 64 });
  await interaction.editReply({
    content: '',
    embeds: [{ title: 'Admin Dashboard — Configuration', color: 0x3498db,
      description: 'Read-only snapshot of this running process. Refresh does not reload environment variables or change settings. No credential values are displayed.',
      fields: [
        { name: 'Certification', value: config.enabled === true ? 'Enabled' : 'Disabled', inline: true },
        { name: 'New enrollment submissions', value: config.enrollmentSubmissionEnabled === true ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Configured admin', value: safe(config.ownerId), inline: true },
        { name: 'Configured admin channel', value: safe(config.adminChannelId), inline: true },
        { name: 'Active agreement version', value: safe(config.activeAgreementVersion), inline: true },
        { name: 'Comprehension check version', value: safe(config.comprehensionCheck?.version), inline: true },
        { name: 'Operational boundaries', value: 'Enrollment approval does not grant lab access or issue a certificate. Revoking lab authorization does not terminate a running provider session. This screen does not test database credentials or provider health.' }
      ], footer: { text: 'Admin-only • Read-only • No environment changes' } }],
    components: [{ type: 1, components: [
      { type: 2, style: 2, custom_id: 'cert:admin:overview:0', label: 'Overview' },
      { type: 2, style: 2, custom_id: 'cert:console:settings', label: 'Refresh configuration' },
      { type: 2, style: 2, custom_id: 'cert:admin:courses:0', label: 'Course Overview' }
    ] }], allowedMentions: { parse: [] }
  });
  return true;
}
