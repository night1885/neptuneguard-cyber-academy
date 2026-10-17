export function isAcademyCourseInteraction(interaction) {
  return Boolean((interaction.isChatInputCommand?.() && ['begin', 'continue'].includes(interaction.commandName)) ||
    (interaction.isButton?.() && /^(academy:|linux-)/.test(interaction.customId || '')));
}

export function createAcademyCourseGate({ certification, guildId, verifiedRoleId }) {
  const discordId = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
  const available = () => certification?.enabled === true && certification.ready === true && typeof certification.getCourseAuthorization === 'function';
  return async function gateAcademyCourse(interaction) {
    if (!isAcademyCourseInteraction(interaction)) return interaction;
    await interaction.deferReply({ flags: 64 });
    const deny = async content => {
      await interaction.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } });
      return null;
    };
    if (!discordId(guildId) || interaction.guildId !== guildId || interaction.guild?.id !== guildId || !discordId(interaction.user?.id) || !discordId(verifiedRoleId)) {
      return deny('Course access requires verification in the configured server. No course action was performed.');
    }
    if (!available()) return deny('Course access is unavailable pending certification startup checks. Registration and application status remain available.');
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (member?.id !== interaction.user.id || !member.roles?.cache?.has(verifiedRoleId)) {
        return deny('Complete server verification before using academy courses. No course action was performed.');
      }
      const authorization = await certification.getCourseAuthorization(interaction.user.id);
      if (!available()) return deny('Course access is temporarily unavailable. No course action was performed.');
      if (!authorization || typeof authorization.student_id !== 'string' || !authorization.student_id.trim()) {
        return deny('Admin-approved certification enrollment with a valid permanent student ID and current acknowledgment is required for every academy course. Pending, denied, suspended, revoked, or incomplete enrollment does not grant access. Run /start to open registration or application status.');
      }
      return new Proxy(interaction, {
        get(original, key) {
          if (key === 'deferReply') return options => original.deferred || original.replied ? Promise.resolve() : original.deferReply(options);
          const value = Reflect.get(original, key, original);
          return typeof value === 'function' ? value.bind(original) : value;
        }
      });
    } catch {
      return deny('Course authorization could not be verified. No course action was performed. Retry later or contact the admin.');
    }
  };
}
