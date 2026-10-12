import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';
import { createSubmissionAttemptGuard } from './certification-submission-attempts.js';

export function createGuardedSubmissionHandler(pool, config, guildId) {
  const handler = createCertificationSubmissionHandler(pool, config, guildId);
  const guard = createSubmissionAttemptGuard();
  return async function guardedSubmission(interaction) {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId?.startsWith('cert:submit:')) return false;
    if (config.enabled !== true || config.enrollmentSubmissionEnabled !== true ||
        interaction.guildId !== guildId || !/^\d{17,20}$/.test(interaction.user?.id || '')) return handler(interaction);
    const match = /^cert:submit:(previous|next|form|send|cancel):([a-f0-9-]{36})$/.exec(interaction.customId);
    let action;
    if (interaction.customId === 'cert:submit:start' && interaction.isButton()) action = 'start';
    else if (match && ((match[1] === 'send' && interaction.isModalSubmit()) ||
        (match[1] !== 'send' && interaction.isButton()))) {
      action = ['previous', 'next'].includes(match[1]) ? 'navigate' : match[1];
    } else return handler(interaction);
    const result = await guard.run(interaction.user.id, action, () => handler(interaction));
    if (result.allowed) return result.value;
    const payload = { content: result.reason === 'busy'
      ? 'Another enrollment action is still processing. Wait for it to finish before retrying.'
      : result.reason === 'rate_limit'
        ? `Too many enrollment attempts. Retry in ${Math.ceil(result.retryAfterMs / 1000)} seconds.`
        : 'Enrollment is busy. Retry later.', allowedMentions: { parse: [] }, components: [], embeds: [] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
    else await interaction.reply({ flags: 64, ...payload });
    return true;
  };
}
